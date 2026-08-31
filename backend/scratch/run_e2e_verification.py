"""
End-to-End Pipeline Verification Script (Phase 6.2 Step 16)
Tests actual image -> YOLOv8s -> Severity Engine -> Pass/Fail Decision engine execution.
"""

import os
import sys
import json
from glob import glob

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from ultralytics import YOLO
from app.services.severity_engine import evaluate_inspection_severity

def run_e2e_test():
    print("=" * 60)
    print("END-TO-END PIPELINE INTEGRATION VERIFICATION")
    print("=" * 60)

    weights_path = os.path.join(PROJECT_ROOT, "runs", "detect", "yolo_phase4_4_architecture", "weights", "best.pt")
    if not os.path.exists(weights_path):
        weights_path = os.path.join(BACKEND_ROOT, "yolov8s.pt")

    print(f"Loading Frozen YOLO Checkpoint: {weights_path}")
    model = YOLO(weights_path)

    # Find sample test images from test set
    test_img_dir = os.path.join(PROJECT_ROOT, "dataset_yolo", "images", "test")
    test_images = glob(os.path.join(test_img_dir, "*.png")) + glob(os.path.join(test_img_dir, "*.jpg"))

    if not test_images:
        print("[WARNING] No test set images found at dataset_yolo/images/test")
        return

    sample_test_images = test_images[:5]
    print(f"Running End-to-End Pipeline on {len(sample_test_images)} real test images...\n")

    for idx, img_path in enumerate(sample_test_images, start=1):
        filename = os.path.basename(img_path)
        # Determine category from filename prefix (e.g., bottle_broken_large_000.png -> bottle)
        cat = filename.split("_")[0] if "_" in filename else "pill"

        t0 = os.times().elapsed
        results = model.predict(source=img_path, imgsz=320, conf=0.25, verbose=False)
        t1 = os.times().elapsed

        raw_predictions = []
        if results and len(results) > 0:
            boxes = results[0].boxes
            names = results[0].names
            for box in boxes:
                cls_id = int(box.cls[0].item())
                c_name = names.get(cls_id, f"class_{cls_id}")
                conf_val = float(box.conf[0].item())
                xywh = box.xywh[0].tolist()
                w_box = float(xywh[2])
                h_box = float(xywh[3])
                x_min = float(xywh[0] - w_box / 2.0)
                y_min = float(xywh[1] - h_box / 2.0)

                raw_predictions.append({
                    "defect_class": c_name,
                    "confidence": conf_val,
                    "defect_area": w_box * h_box,
                    "bounding_box": {
                        "x_min": int(x_min),
                        "y_min": int(y_min),
                        "width": int(w_box),
                        "height": int(h_box)
                    }
                })

        severity_result = evaluate_inspection_severity(
            raw_predictions=raw_predictions,
            product_category=cat
        )

        print(f"Image {idx}: {filename} (Category: {cat})")
        print(f"  Detected Defect Count: {severity_result['number_of_detected_defects']}")
        print(f"  Inspection Status:     {severity_result['inspection_status']}")
        print(f"  Overall Severity:      {severity_result['overall_severity']}")
        print(f"  Overall Score:         {severity_result['overall_score']:.2f} / 100")
        print(f"  Decision Reason:       {severity_result['decision_reason']}\n")

    print("=" * 60)
    print("END-TO-END PIPELINE VERIFICATION COMPLETED SUCCESSFULLY")
    print("=" * 60)

if __name__ == "__main__":
    run_e2e_test()
