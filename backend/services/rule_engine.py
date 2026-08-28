import uuid
from typing import Any, Dict, List
import cv2
import numpy as np
from pathlib import Path
from utils.severity_calculator import calculate_severity


def _bytes_to_cv2_image(image_bytes: bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def detect_defects(image_bytes: bytes, min_area_px: int = 200) -> Dict[str, Any]:
    """Basic, rule-based defect detector using OpenCV contour analysis.

    Returns a dict matching the ai_engine.detect_defects output shape so it
    can be used as a drop-in replacement.
    """
    img = _bytes_to_cv2_image(image_bytes)
    if img is None:
        raise ValueError("Failed to decode image bytes")

    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    # Use adaptive threshold to handle lighting variations
    th = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                               cv2.THRESH_BINARY_INV, 11, 2)

    # Morphological ops to join nearby edges
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(th, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    defects: List[Dict[str, Any]] = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area_px:
            continue

        x, y, ww, hh = cv2.boundingRect(cnt)

        # heuristic confidence: area normalized
        conf = min(0.99, max(0.05, area / (w * h)))

        defect_type = "Surface Defect"
        location_type = "Cosmetic"
        size_mm2 = round(area * 0.05, 1)  # heuristic pixel->mm^2 scaling

        sev = calculate_severity(defect_type, size_mm2, is_functional_location=False, confidence=conf)

        defects.append({
            "id": str(uuid.uuid4()),
            "defect_type": defect_type,
            "size_mm2": size_mm2,
            "location_type": location_type,
            "confidence": round(conf, 3),
            "bounding_box": {
                "x": int(x),
                "y": int(y),
                "width": int(ww),
                "height": int(hh),
                "label": defect_type,
                "confidence": round(conf, 3),
            },
            "severity_score": sev["severity_score"],
            "severity_level": sev["severity_level"].upper(),
        })

    if not defects:
        return {
            "status": "PASSED",
            "severity_level": "NONE",
            "severity_score": 0.0,
            "summary": "No defects detected by rule-based engine.",
            "recommendation": "No action required.",
            "defects": [],
            "confidence": 0.0,
        }

    primary = max(defects, key=lambda d: d["severity_score"])
    overall_status = "FAILED" if primary["severity_level"] in ["HIGH", "CRITICAL"] else "FLAGGED"

    return {
        "status": overall_status,
        "severity_level": primary["severity_level"],
        "severity_score": primary["severity_score"],
        "summary": f"{len(defects)} defect(s) detected by rule engine. Highest severity {primary['severity_level']}.",
        "recommendation": primary.get("recommendation", "Review defects and take action if necessary."),
        "defects": defects,
        "confidence": round(max(d["confidence"] for d in defects), 3),
        "engine": "rule",
    }
