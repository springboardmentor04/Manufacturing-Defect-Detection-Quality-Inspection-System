import os
import uuid
from pathlib import Path
from typing import Any, Dict, List
import cv2
import numpy as np
from ultralytics import YOLO
from utils.severity_calculator import calculate_severity

BACKEND_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BACKEND_DIR / "models" / "best.pt"


class DefectDetectionEngine:

    def __init__(self, model_path: Path = MODEL_PATH):
        self.model_path = model_path
        self.model = None
        self._load_model()

    def _load_model(self):
        if self.model_path.exists():
            print(f"🤖 Loading AI Model from {self.model_path}")
            self.model = YOLO(str(self.model_path))
        else:
            print(
                f"⚠️ Warning: Model file not found at {self.model_path}. "
                "Inference will run in fallback/simulation mode until trained."
            )

    def analyze_image(
        self, image_bytes: bytes, confidence_threshold: float = 0.10
    ) -> Dict[str, Any]:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Failed to decode uploaded image data.")

        img_height, img_width = img.shape[:2]

        if self.model is None:
            return {
                "defects_found": 0,
                "max_severity": "NONE",
                "overall_status": "PASSED",
                "detections": [],
            }

        results = self.model(img, conf=confidence_threshold)[0]

        detections: List[Dict[str, Any]] = []
        max_severity = "NONE"

        severity_map = {
            "Surface Scratch": "LOW",
            "Misalignment": "MEDIUM",
            "Cracked Solder Joint": "MEDIUM",
            "Missing Component": "CRITICAL",
            "Cracked Screen": "CRITICAL",
        }

        severity_rank = {"NONE": 0, "LOW": 1, "MEDIUM": 2, "CRITICAL": 3}

        for box in results.boxes:
            class_id = int(box.cls[0].item())
            class_name = self.model.names.get(class_id, "Unknown Defect")
            confidence = float(box.conf[0].item())

            x_min, y_min, x_max, y_max = box.xyxy[0].tolist()
            width = x_max - x_min
            height = y_max - y_min

            severity = severity_map.get(class_name, "LOW")

            if severity_rank[severity] > severity_rank[max_severity]:
                max_severity = severity

            detections.append(
                {
                    "label": class_name,
                    "confidence": round(confidence, 2),
                    "severity": severity,
                    "x_min": round(x_min, 1),
                    "y_min": round(y_min, 1),
                    "width": round(width, 1),
                    "height": round(height, 1),
                }
            )

        defects_found = len(detections)
        overall_status = (
            "FAILED"
            if max_severity == "CRITICAL"
            else ("FLAGGED" if defects_found > 0 else "PASSED")
        )

        return {
            "defects_found": defects_found,
            "max_severity": max_severity,
            "overall_status": overall_status,
            "detections": detections,
        }
    def detect_defects(self, image_bytes: bytes, confidence_threshold: float = 0.10) -> Dict[str, Any]:
        analysis = self.analyze_image(image_bytes, confidence_threshold)

        if analysis["defects_found"] == 0:
            return {
                "status": "PASSED",
                "severity_level": "NONE",
                "severity_score": 0.0,
                "summary": "No defects detected. Inspection passed.",
                "recommendation": "No action required.",
                "defects": [],
            }

        defects: List[Dict[str, Any]] = []
        for det in analysis["detections"]:
            location_type = "Functional" if det["severity"] in ["CRITICAL", "MEDIUM"] else "Cosmetic"
            defect_area = float(det["width"]) * float(det["height"])
            severity_meta = calculate_severity(
                det["label"],
                defect_area,
                is_functional_location=(location_type == "Functional"),
                confidence=det["confidence"],
            )

            defects.append(
                {
                    "id": str(uuid.uuid4()),
                    "defect_type": det["label"],
                    "size_mm2": round(defect_area, 1),
                    "location_type": location_type,
                    "confidence": det["confidence"],
                    "bounding_box": {
                        "x": det["x_min"],
                        "y": det["y_min"],
                        "width": det["width"],
                        "height": det["height"],
                        "label": det["label"],
                        "confidence": det["confidence"],
                    },
                    "severity_score": severity_meta["severity_score"],
                    "severity_level": severity_meta["severity_level"].upper(),
                }
            )

        primary_defect = max(defects, key=lambda d: d["severity_score"])
        overall_status = (
            "FAILED" if primary_defect["severity_level"] in ["HIGH", "CRITICAL"] else "FLAGGED"
        )
        recommendation = (
            "Reject product and trigger immediate quality inspection workflow."
            if primary_defect["severity_level"] in ["HIGH", "CRITICAL"]
            else "Review defects and perform rework if needed."
        )
        overall_confidence = max(d["confidence"] for d in defects)

        return {
            "status": overall_status,
            "severity_level": primary_defect["severity_level"],
            "severity_score": primary_defect["severity_score"],
            "summary": f"{len(defects)} defect(s) detected. Highest severity {primary_defect['severity_level']}.",
            "recommendation": recommendation,
            "defects": defects,
            "confidence": round(overall_confidence, 3),
        }

ai_engine = DefectDetectionEngine()
