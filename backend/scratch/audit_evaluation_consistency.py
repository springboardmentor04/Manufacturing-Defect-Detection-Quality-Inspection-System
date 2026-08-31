import os
import sys
import json
import hashlib
import time
from ultralytics import YOLO

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
YOLO_DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset_yolo")
YOLO_DATASET_YAML = os.path.join(YOLO_DATASET_DIR, "dataset.yaml")
TEST_IMAGES_DIR = os.path.join(YOLO_DATASET_DIR, "images", "test")
TEST_LABELS_DIR = os.path.join(YOLO_DATASET_DIR, "labels", "test")

BASELINE_WEIGHTS = os.path.join(PROJECT_ROOT, "runs", "detect", "yolo_baseline", "weights", "best.pt")
AUDIT_DIR = os.path.join(PROJECT_ROOT, "runs", "detect", "yolo_phase4_2_1_audit")
os.makedirs(AUDIT_DIR, exist_ok=True)

def compute_file_sha256(filepath):
    if not os.path.exists(filepath):
        return None
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

def run_audit():
    print("=" * 60)
    print("PHASE 4.2.1: EVALUATION CONSISTENCY AUDIT")
    print("=" * 60)

    # 1. File & Hash Verification
    weights_sha256 = compute_file_sha256(BASELINE_WEIGHTS)
    print(f"[AUDIT 1] Weights File: {BASELINE_WEIGHTS}")
    print(f"[AUDIT 1] File Size: {os.path.getsize(BASELINE_WEIGHTS) if weights_sha256 else 0} bytes")
    print(f"[AUDIT 1] SHA256 Hash: {weights_sha256}")

    # 2. Test Set Image & Label Verification
    test_images = sorted([f for f in os.listdir(TEST_IMAGES_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
    test_labels = sorted([f for f in os.listdir(TEST_LABELS_DIR) if f.lower().endswith('.txt')])
    
    print(f"[AUDIT 2] Test Images Count: {len(test_images)}")
    print(f"[AUDIT 2] Test Labels Count: {len(test_labels)}")

    # 3. Class Mapping & dataset.yaml Audit
    with open(os.path.join(YOLO_DATASET_DIR, "class_mapping.json")) as f:
        class_mapping = json.load(f)

    with open(YOLO_DATASET_YAML) as f:
        yaml_content = f.read()

    print(f"[AUDIT 3] Class Mapping Entries: {len(class_mapping)}")
    print(f"[AUDIT 3] YAML Contains 'nc: 73': {'nc: 73' in yaml_content}")

    # 4. Standard Ultralytics Official Native Validation Engine Run (Phase 3 Baseline Engine)
    print("\n[AUDIT 4] Running Official Native Ultralytics val() on TEST split (imgsz=320, batch=16)...")
    model = YOLO(BASELINE_WEIGHTS)
    
    t0_native = time.time()
    val_results = model.val(
        data=YOLO_DATASET_YAML,
        split="test",
        batch=16,
        imgsz=320,
        workers=0,
        device="cpu",
        project=AUDIT_DIR,
        name="official_native_val",
        exist_ok=True
    )
    t1_native = time.time()
    
    latency_native = round(((t1_native - t0_native) / float(len(test_images))) * 1000.0, 2)
    box = val_results.box
    native_p = round(float(box.mp), 4)
    native_r = round(float(box.mr), 4)
    native_map50 = round(float(box.map50), 4)
    native_map50_95 = round(float(box.map), 4)

    print("\n--- OFFICIAL NATIVE VAL RESULTS ---")
    print(f"Precision:      {native_p}")
    print(f"Recall:         {native_r}")
    print(f"mAP@0.5:        {native_map50}")
    print(f"mAP@0.5:0.95:   {native_map50_95}")
    print(f"Avg Latency:    {latency_native} ms/image")

    # 5. Method Discrepancy Root Cause Analysis
    discrepancy_analysis = {
        "weights_sha256": weights_sha256,
        "test_image_count": len(test_images),
        "test_label_count": len(test_labels),
        "phase_3_baseline_reported": {
            "evaluation_engine": "Ultralytics Native val() Engine (Full PR-Curve Integration across all confidence thresholds)",
            "imgsz": 320,
            "precision": 0.9270,
            "recall": 0.0293,
            "map50": 0.0528,
            "map50_95": 0.0401,
            "avg_latency_ms": 51.53
        },
        "phase_4_2_mode_a_reported": {
            "evaluation_engine": "Custom Python IoU Matcher @ fixed conf=0.25 (No PR-curve integration across confidence thresholds)",
            "imgsz": 320,
            "precision": 0.4375,
            "recall": 0.0174,
            "map50": 0.0076,
            "map50_95": 0.0061,
            "avg_latency_ms": 45.47
        },
        "phase_4_2_1_reproduced_official": {
            "evaluation_engine": "Ultralytics Native val() Engine (Reproduced)",
            "imgsz": 320,
            "precision": native_p,
            "recall": native_r,
            "map50": native_map50,
            "map50_95": native_map50_95,
            "avg_latency_ms": latency_native
        },
        "root_cause_explanation": (
            "The discrepancy occurred because Phase 3 used the official native Ultralytics val() evaluation engine, "
            "which integrates Area Under the Precision-Recall Curve across ALL confidence thresholds (0.001 to 1.0) and uses standard COCO mAP calculation. "
            "In contrast, Phase 4.2 Mode A used a custom single-threshold Python script evaluated at fixed conf=0.25 without confidence curve integration. "
            "Evaluating at a single fixed confidence threshold (conf=0.25) drops low-confidence true positives and artificially distorts the area under the PR curve."
        ),
        "recommended_standard_configuration": {
            "engine": "Ultralytics Native model.val() Engine",
            "weights": "runs/detect/yolo_baseline/weights/best.pt",
            "test_split": "dataset_yolo/images/test",
            "dataset_yaml": "dataset_yolo/dataset.yaml",
            "imgsz": 320,
            "conf": 0.001,
            "iou": 0.60
        }
    }

    out_json = os.path.join(AUDIT_DIR, "audit_summary.json")
    with open(out_json, "w") as f:
        json.dump(discrepancy_analysis, f, indent=2)

    print(f"\n[AUDIT COMPLETE] Saved audit summary to: {out_json}")

if __name__ == "__main__":
    run_audit()
