"""
VisionInspectAI - YOLOv8 Inference / Predictor
=============================================

Loads the trained YOLOv8 model and performs defect detection.
Returns prediction, confidence, and bounding boxes.

Hybrid pipeline
---------------
  1. YOLO forward pass (primary)
  2. CV-based anomaly fallback (secondary — catches what YOLO misses)
  3. Fusion rule:
       - If YOLO says DEFECT  → DEFECT (YOLO wins)
       - If YOLO says GOOD but CV anomaly score >= 45 → override to DEFECT
       - If both say GOOD      → GOOD, with an honest confidence figure
"""

from pathlib import Path
from ultralytics import YOLO
from app.ml.cv_anomaly import run_cv_anomaly_check

# ==========================================
# CONSTANTS
# ==========================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]
# The path where our YOLO training script saves the best model
MODEL_PATH = PROJECT_ROOT / "ml" / "models" / "yolo_runs" / "defect_detection" / "weights" / "best.pt"

# ==========================================
# MODEL LOADING (at import time)
# ==========================================

model = None
model_loaded = False
load_error_msg = None

try:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Trained YOLO model not found at:\n  {MODEL_PATH}\n"
            "Run train_yolo.py to generate it."
        )

    # Load the YOLOv8 model
    model = YOLO(str(MODEL_PATH))
    model_loaded = True
    print(f"\n[YOLO Predictor] YOLOv8 model loaded successfully.")
    print(f"[YOLO Predictor] Path: {MODEL_PATH}")

    # Warmup inference to prevent slow first request
    import numpy as np
    print("[YOLO Predictor] Running warmup inference...")
    dummy_img = np.zeros((640, 640, 3), dtype=np.uint8)
    model(dummy_img, imgsz=640, verbose=False)
    print("[YOLO Predictor] Warmup complete.")

except Exception as e:
    load_error_msg = str(e)
    print(f"\n[YOLO Predictor] WARNING: YOLO model could not be loaded.\n  {load_error_msg}")


# ==========================================
# PREDICTION FUNCTION
# ==========================================

def predict_defect(image_path: str) -> dict:
    """
    Run defect detection on a single image using YOLOv8 + CV anomaly fallback.

    Args:
        image_path: Path to the preprocessed 224×224 image file.

    Returns:
        dict with keys:
          prediction        - "GOOD" or "DEFECT" (uppercase)
          confidence        - float [0, 100]
          boxes             - list of bounding box dicts
          anomaly_score     - CV fallback anomaly score [0, 100]
          cv_flags          - list of fired CV checks
          detection_source  - "yolo" | "cv_fallback" | "both" | "none"

    Raises:
        RuntimeError if model is not loaded.
        FileNotFoundError if image not found.
    """
    if not model_loaded:
        raise RuntimeError(
            f"YOLO model is not loaded. "
            f"Reason: {load_error_msg}\n"
            "Run train_yolo.py and restart the backend."
        )

    img_path = Path(image_path)
    if not img_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    # ── Stage 1: YOLO forward pass ────────────────────────────────────────────
    # conf=0.15 (lowered from 0.25) so marginal real defects are not silently filtered out.
    results = model(str(img_path), conf=0.15, iou=0.45, imgsz=640, verbose=False)
    # Low-threshold pass to compute honest GOOD confidence via suppressed scores
    results_all = model(str(img_path), conf=0.01, iou=0.45, imgsz=640, verbose=False)

    # Collect the highest suppressed score (gives a YOLO-level suspicion proxy)
    highest_suppressed_conf = 0.0
    result_all = results_all[0]
    if len(result_all.boxes) > 0:
        for box in result_all.boxes:
            c = box.conf[0].item()
            if c > highest_suppressed_conf:
                highest_suppressed_conf = c

    # Extract bounding boxes from the main (conf>=0.15) pass
    boxes_data = []
    highest_conf = 0.0
    result = results[0]
    if len(result.boxes) > 0:
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxyn[0].tolist()
            conf    = box.conf[0].item()
            cls_id  = int(box.cls[0].item())
            cls_name = result.names[cls_id]

            boxes_data.append({
                "x1":   round(x1,   4),
                "y1":   round(y1,   4),
                "x2":   round(x2,   4),
                "y2":   round(y2,   4),
                "conf": round(conf * 100, 2),
                "class": cls_name
            })

            if conf > highest_conf:
                highest_conf = conf

    # YOLO verdict
    yolo_is_defect = len(boxes_data) > 0
    yolo_confidence = round(highest_conf * 100, 2) if yolo_is_defect else 0.0

    # ── Stage 2: CV anomaly fallback ─────────────────────────────────────────
    cv_result = run_cv_anomaly_check(str(img_path))
    anomaly_score  = cv_result["anomaly_score"]
    cv_is_defect   = cv_result["cv_prediction"] == "DEFECT"
    cv_confidence  = cv_result["cv_confidence"]
    cv_flags       = cv_result["cv_flags"]

    # ── Stage 3: Fusion ───────────────────────────────────────────────────────
    #
    # Priority rules (in order):
    #   A. YOLO says DEFECT → always DEFECT, use YOLO confidence
    #   B. YOLO says GOOD but CV says DEFECT → override to DEFECT (with footnote)
    #   C. Both say GOOD → GOOD, honest confidence
    #
    if yolo_is_defect:
        prediction       = "DEFECT"
        confidence       = yolo_confidence
        detection_source = "yolo"

    elif cv_is_defect:
        # CV override: YOLO missed it but the image looks visually anomalous
        prediction       = "DEFECT"
        # Blend CV confidence with YOLO's suspicion level
        yolo_suspicion   = highest_suppressed_conf * 100.0   # [0,100]
        confidence       = round(
            cv_confidence * 0.70 + yolo_suspicion * 0.30, 2
        )
        # Synthetic bounding box: full image (we can't localise without boxes)
        if not boxes_data:
            boxes_data.append({
                "x1": 0.05, "y1": 0.05, "x2": 0.95, "y2": 0.95,
                "conf": round(confidence, 2),
                "class": "anomaly (cv-detected)"
            })
        detection_source = "cv_fallback"

    else:
        # Both agree: GOOD
        prediction       = "GOOD"
        # Honest GOOD confidence: blend inverse-suppressed-YOLO and inverse-CV-anomaly
        yolo_good_conf = (1.0 - highest_suppressed_conf) * 100.0
        cv_good_conf   = 100.0 - anomaly_score
        raw_good_conf  = yolo_good_conf * 0.55 + cv_good_conf * 0.45
        confidence     = round(max(45.0, min(97.0, raw_good_conf)), 2)
        detection_source = "none"

    return {
        "prediction":       prediction,
        "confidence":       float(confidence),
        "boxes":            boxes_data,
        "anomaly_score":    float(anomaly_score),
        "cv_flags":         cv_flags,
        "detection_source": detection_source,
        "good_probability":    None,
        "defect_probability":  None,
    }
