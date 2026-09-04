"""Inference bridge for the YOLO model trained in this repository.

The API accepts a browser ``data:image/...;base64,...`` upload, applies the
selected safe preprocessing operations and runs the local model weights.  No
result in this module is fabricated: an empty YOLO result is a PASS.
"""

from __future__ import annotations

import base64
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

from ai_model.preprocessing import ImagePreprocessor
from ai_model.severity_calculator import SeverityCalculator


PROJECT_ROOT = Path(__file__).resolve().parents[1]
WEIGHTS_PATH = PROJECT_ROOT / "runs" / "detect" / "unified_20ep" / "weights" / "best.pt"
# The image data URL is currently retained with the inspection record in
# MongoDB; 10 MB raw stays safely under MongoDB's 16 MB document limit after
# base64 expansion.
MAX_IMAGE_BYTES = 10 * 1024 * 1024


@lru_cache(maxsize=1)
def get_model() -> YOLO:
    """Load weights once per API process rather than once per inspection."""
    if not WEIGHTS_PATH.is_file():
        raise FileNotFoundError(f"Trained YOLO weights are missing: {WEIGHTS_PATH}")
    return YOLO(str(WEIGHTS_PATH))


def decode_data_url(image_url: str) -> np.ndarray:
    """Decode an uploaded image without fetching arbitrary external URLs."""
    if not image_url.startswith("data:image/") or "," not in image_url:
        raise ValueError("Upload a PNG, JPG, or BMP image for YOLO inspection.")
    try:
        encoded = image_url.split(",", 1)[1]
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, base64.binascii.Error) as exc:
        raise ValueError("The uploaded image data is invalid.") from exc
    if not raw or len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("The uploaded image must be between 1 byte and 10 MB.")
    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("The uploaded file is not a supported image.")
    return image


def _display_name(name: str) -> str:
    return name.replace("_", " ").replace("-", " ").title()


def run_yolo_inspection(image_url: str, preprocessing: dict, confidence: float = 0.25) -> dict:
    """Run the repository's trained YOLO model and calculate severity."""
    image = decode_data_url(image_url)
    pipeline = ImagePreprocessor().process_pipeline(image, preprocessing)
    prepared = pipeline["processed_image"]
    model = get_model()
    result = model.predict(source=prepared, conf=confidence, verbose=False)[0]

    if result.boxes is None or len(result.boxes) == 0:
        return {
            "defects": [], "severity_score": 0.0, "severity_level": "Low", "pass_fail": "PASS",
            "image_width": int(prepared.shape[1]), "image_height": int(prepared.shape[0]),
            "recommendation": "No defects were detected by the trained model. Approve for packaging.",
            "model": {"architecture": model.task, "weights": str(WEIGHTS_PATH.relative_to(PROJECT_ROOT)), "confidence_threshold": confidence, "detections": 0},
        }

    height, width = prepared.shape[:2]
    calculator = SeverityCalculator()
    defects = []
    scores = []
    for box in result.boxes:
        class_id = int(box.cls[0])
        class_name = str(model.names[class_id])
        confidence_score = round(float(box.conf[0]) * 100, 2)
        x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]
        box_width, box_height = max(0.0, x2 - x1), max(0.0, y2 - y1)
        area_percent = min(100.0, (box_width * box_height / (width * height)) * 100)
        size_score = round(min(100.0, area_percent * 5), 2)
        center_distance = ((x1 + x2) / 2 - width / 2) ** 2 + ((y1 + y2) / 2 - height / 2) ** 2
        max_distance = (width / 2) ** 2 + (height / 2) ** 2
        location_score = round(max(0.0, 100.0 * (1 - (center_distance / max_distance) ** 0.5)), 2)
        score = calculator.calculate_defect_severity(size_score, location_score, class_name, confidence_score)
        scores.append(score["severity_score"])
        defects.append({
            "class_id": class_id, "class_name": class_name, "defect_type": _display_name(class_name), "confidence": confidence_score,
            "confidence_score": confidence_score, "size_score": size_score, "location_score": location_score,
            "type_score": score["defect_type_score"], "severity_score": score["severity_score"],
            "pixel_bounding_box": {"x1": round(x1, 2), "y1": round(y1, 2), "x2": round(x2, 2), "y2": round(y2, 2)},
            "bounding_box": {"x": round(x1 * 100 / width, 2), "y": round(y1 * 100 / height, 2), "width": round(box_width * 100 / width, 2), "height": round(box_height * 100 / height, 2)},
        })

    severity_score = round(max(scores), 2)
    return {
        "defects": defects, "severity_score": severity_score, "image_width": width, "image_height": height,
        "severity_level": calculator.classify_severity_level(severity_score),
        "pass_fail": calculator.evaluate_pass_fail(severity_score),
        "recommendation": "Quarantine product and trigger rework." if severity_score >= 40 else "Approve for packaging.",
        "model": {"architecture": model.task, "weights": str(WEIGHTS_PATH.relative_to(PROJECT_ROOT)), "confidence_threshold": confidence, "detections": len(defects)},
    }
