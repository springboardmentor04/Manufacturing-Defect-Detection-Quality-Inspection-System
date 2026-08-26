"""
predict_json.py
Runs YOLO inference on a single image and prints a single JSON object
to stdout. Designed to be called from Node.js via child_process.

Usage:
    python predict_json.py <image_path>
"""

import sys
import os
import json
from pathlib import Path
from ultralytics import YOLO

# ============================================================
# CONFIGURATION
# ============================================================

MODEL_PATH = Path(__file__).resolve().parent / "saved_models" / "best.pt"

CLASS_NAMES = {
    0: "bottle",
    1: "cable",
    2: "capsule",
    3: "carpet",
    4: "grid",
    5: "hazelnut",
    6: "leather",
    7: "metal_nut",
    8: "pill",
    9: "screw",
    10: "tile",
    11: "toothbrush",
    12: "transistor",
    13: "wood",
    14: "zipper",
}


def fail(message):
    """Print an error as JSON and exit non-zero."""
    print(json.dumps({"error": message}))
    sys.exit(1)


def main():
    if len(sys.argv) < 2:
        fail("Usage: python predict_json.py <image_path>")

    image_path = sys.argv[1]

    if not os.path.exists(image_path):
        fail(f"Image not found: {image_path}")

    if not MODEL_PATH.exists():
        fail(f"Model not found: {MODEL_PATH}")

    model = YOLO(str(MODEL_PATH))

    results = model.predict(
        source=image_path,
        imgsz=640,
        conf=0.25,
        device="cpu",
        verbose=False,
    )

    detections = []

    for result in results:
        if result.boxes is None or len(result.boxes) == 0:
            continue

        # image dimensions, used to convert absolute pixel box -> percentages
        img_h, img_w = result.orig_shape

        for i in range(len(result.boxes)):
            class_id = int(result.boxes.cls[i].item())
            confidence = float(result.boxes.conf[i].item())
            class_name = CLASS_NAMES.get(class_id, f"class_{class_id}")

            x1, y1, x2, y2 = result.boxes.xyxy[i].tolist()

            detections.append(
                {
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": round(confidence * 100, 2),
                    # bbox as percentages of image size (0-100), handy for
                    # drawing on a scaled <img> in the frontend
                    "bbox": {
                        "x": round((x1 / img_w) * 100, 2),
                        "y": round((y1 / img_h) * 100, 2),
                        "w": round(((x2 - x1) / img_w) * 100, 2),
                        "h": round(((y2 - y1) / img_h) * 100, 2),
                    },
                }
            )

    output = {
        "status": "fail" if detections else "pass",
        "detections": detections,
        # convenience fields for the "top" detection, since most of your
        # current schema (defect_type, confidence_score, bbox) expects one
        "top_detection": max(detections, key=lambda d: d["confidence"]) if detections else None,
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()
