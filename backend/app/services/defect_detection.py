import os
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import logging
import cv2
import numpy as np
from ultralytics import YOLO

from app.services.image_processing import preprocess_image

logger = logging.getLogger("visioninspect.defect_detection")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

MODEL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "ml_models", "defect_detector_background_v2.pt")
)

_model_instance = None

def get_yolo_model() -> YOLO:
    """
    Lazy singleton loader for the trained YOLO defect detection model.
    """
    global _model_instance
    if _model_instance is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Trained YOLO model file not found at: {MODEL_PATH}")
        logger.info(f"Loading YOLO defect detection model from: {MODEL_PATH}")
        _model_instance = YOLO(MODEL_PATH)
    return _model_instance

def run_inference(image_path: str) -> list:
    """
    Runs YOLO defect detection on the given image path:
    1. Reads original image dimensions for bounding box scaling & distribution validation.
    2. Preprocesses image using CLAHE, denoising, and 640x640 resizing.
    3. Runs YOLO model inference with raw output logging and configurable confidence threshold.
    4. Parses bounding boxes (bbox_x, bbox_y, bbox_width, bbox_height), class labels, and confidence scores.
    
    Returns a list of detection dicts:
    [{defect_type, confidence_score, bbox_x, bbox_y, bbox_width, bbox_height}, ...]
    Handles zero detections gracefully returning an empty list.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")

    logger.info(f"Starting defect detection inference for image: {image_path}")

    # Read original image dimensions for accurate scaling to original image resolution
    orig_img = cv2.imread(image_path)
    if orig_img is not None:
        h_orig, w_orig = orig_img.shape[:2]
    else:
        h_orig, w_orig = 640, 640

    # Data validation check against MVTec AD training distribution
    aspect_ratio = float(w_orig) / float(max(1, h_orig))
    if aspect_ratio < 0.33 or aspect_ratio > 3.0 or w_orig < 64 or h_orig < 64 or w_orig > 5000 or h_orig > 5000:
        logger.warning(
            f"image may be out of model's training distribution (dimensions: {w_orig}x{h_orig}, aspect_ratio: {aspect_ratio:.2f})"
        )

    # Run image preprocessing pipeline
    preprocessed_rgb = preprocess_image(image_path, target_size=(640, 640))
    h_prep, w_prep = preprocessed_rgb.shape[:2]

    # Preprocessing pipeline verification log & assertion
    logger.info(f"Input image tensor shape passed to model: {preprocessed_rgb.shape} (dtype: {preprocessed_rgb.dtype})")
    assert preprocessed_rgb.shape == (640, 640, 3), f"Expected input tensor shape (640, 640, 3), got {preprocessed_rgb.shape}"

    scale_x = w_orig / float(w_prep)
    scale_y = h_orig / float(h_prep)

    # Configurable confidence threshold from environment (default 0.25)
    try:
        conf_threshold = float(os.getenv("DETECTION_CONFIDENCE_THRESHOLD", "0.25"))
    except ValueError:
        conf_threshold = 0.25
        logger.warning(f"Invalid DETECTION_CONFIDENCE_THRESHOLD env var. Falling back to default: {conf_threshold}")

    # Load singleton model
    model = get_yolo_model()

    # Step 1: Run raw inference with low threshold (0.01) to capture all potential candidate detections for logging visibility
    raw_results = model(preprocessed_rgb, conf=0.01, verbose=False)
    
    raw_boxes = []
    if raw_results and len(raw_results) > 0 and raw_results[0].boxes is not None:
        raw_boxes = raw_results[0].boxes

    raw_detections_summary = []
    for box in raw_boxes:
        cls_id = int(box.cls[0].cpu().numpy())
        c_score = float(box.conf[0].cpu().numpy())
        cls_name = model.names[cls_id] if (hasattr(model, "names") and cls_id in model.names) else f"class_{cls_id}"
        raw_detections_summary.append({"class": cls_name, "conf": round(c_score, 4)})

    logger.info(
        f"Raw model output for {image_path}: {len(raw_boxes)} candidate detection(s) found before thresholding: {raw_detections_summary}"
    )

    # Step 2: Apply configured confidence threshold filtering
    detections = []
    for box in raw_boxes:
        conf = float(box.conf[0].cpu().numpy())
        if conf < conf_threshold:
            continue

        cls_id = int(box.cls[0].cpu().numpy())
        xyxy = box.xyxy[0].cpu().numpy()

        # Map class ID to human-readable label
        if hasattr(model, "names") and isinstance(model.names, dict) and cls_id in model.names:
            defect_type = str(model.names[cls_id])
        elif hasattr(model, "names") and isinstance(model.names, (list, tuple)) and cls_id < len(model.names):
            defect_type = str(model.names[cls_id])
        else:
            defect_type = f"defect_class_{cls_id}"

        x1, y1, x2, y2 = xyxy
        bbox_x = max(0, int(round(x1 * scale_x)))
        bbox_y = max(0, int(round(y1 * scale_y)))
        bbox_width = max(1, int(round((x2 - x1) * scale_x)))
        bbox_height = max(1, int(round((y2 - y1) * scale_y)))

        detections.append({
            "defect_type": defect_type,
            "confidence_score": round(conf, 4),
            "bbox_x": bbox_x,
            "bbox_y": bbox_y,
            "bbox_width": bbox_width,
            "bbox_height": bbox_height
        })

    logger.info(
        f"Final filtered detections (conf >= {conf_threshold}): {len(detections)} detection(s) for {image_path}"
    )

    return detections
