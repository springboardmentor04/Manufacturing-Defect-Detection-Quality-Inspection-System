"""
VisionInspect AI - Defect Detection Inference Engine
------------------------------------------------------
This module actually analyzes the pixels of the uploaded product image.
It replaces an earlier version that called random.uniform() for every
score - meaning it never looked at the image at all, and the same photo
could come back PASS one time and CRITICAL the next.

Approach: classical, deterministic computer vision (no GPU / no training
data required). It works well for structural defects with an obvious
visual signature (cracks, chips, missing parts, cuts) and is transparent
enough to explain to an auditor: "the flagged region covers X% of the
product and sits Ycm from the functional center, hence this score."

For subtle textural anomalies (fine scratches, faint discoloration) a
trained deep model does better - see train_yolo.py for that upgrade path.
This module is written so swapping in a trained model later only means
replacing `run_inference()`'s body; the input/output contract stays the
same, so nothing upstream (API, DB schema, frontend) has to change.
"""

import os
import json
import hashlib
from typing import Optional

import cv2
import numpy as np

from .severity_calculator import SeverityCalculator

# Category -> most likely defect label, used only as a fallback name when
# the CV pipeline finds an anomalous region but has no finer-grained
# classifier to name it precisely. The *scores* always come from the
# actual pixels; this just labels what was found.
CATEGORY_DEFECT_LABELS = {
    "metal_nut": "Surface Crack",
    "cable": "Insulation Cut",
    "tile": "Surface Scratch",
    "pill": "Discoloration",
    "capsule": "Discoloration",
    "transistor": "Missing Component",
    "screw": "Structural Hole",
    "zipper": "Surface Scratch",
    "wood": "Surface Scratch",
    "bottle": "Surface Crack",
    "general": "Surface Scratch",
}


class YOLOv8DefectDetector:
    """
    Despite the historical class name (kept for API backward-compatibility
    with existing imports), this currently runs a classical CV pipeline,
    not a YOLOv8 forward pass. See module docstring and README for why,
    and train_yolo.py for how to graduate to a real trained model.
    """

    def __init__(self, weights_path: Optional[str] = None):
        self.calculator = SeverityCalculator()

        if weights_path is None:
            weights_path = os.path.join(os.path.dirname(__file__), "yolov8_weights.json")

        if os.path.exists(weights_path):
            with open(weights_path, "r") as f:
                self.config = json.load(f)
        else:
            self.config = {
                "model_name": "VisionInspect-ClassicalCV-v1",
                "classes": list(CATEGORY_DEFECT_LABELS.values()),
                "confidence_threshold": 0.25,
            }

        self.classes = self.config.get("classes", list(CATEGORY_DEFECT_LABELS.values()))

    # ------------------------------------------------------------------
    # Core pixel analysis
    # ------------------------------------------------------------------
    @staticmethod
    def _segment_object_mask(gray: np.ndarray) -> np.ndarray:
        """
        Separates the product from its background using Otsu thresholding,
        then keeps only the largest connected blob and erodes it inward a
        few pixels. This matters because without it, the object's own
        silhouette edge (background-to-product boundary) gets picked up
        as if it were a defect, which is exactly wrong - the goal is to
        inspect what's happening *inside* the part, not re-detect its
        outline. If the frame is filled edge-to-edge by the product
        (common with close-up shots), segmentation is skipped and the
        whole frame is treated as inspectable area.
        """
        h, w = gray.shape[:2]
        _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        frame_area = h * w
        fg_ratio = cv2.countNonZero(otsu) / frame_area

        # If the "foreground" is nearly the whole frame or nearly empty,
        # there's no real background to separate - treat the whole image
        # as the inspectable area.
        if fg_ratio > 0.95 or fg_ratio < 0.03:
            return np.ones_like(gray, dtype=np.uint8) * 255

        # Otsu may invert foreground/background depending on which is
        # brighter; assume the object is the larger connected component.
        contours, _ = cv2.findContours(otsu, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return np.ones_like(gray, dtype=np.uint8) * 255

        largest = max(contours, key=cv2.contourArea)
        mask = np.zeros_like(gray, dtype=np.uint8)
        cv2.drawContours(mask, [largest], -1, 255, thickness=cv2.FILLED)

        # Pull the mask in from the silhouette edge so the boundary itself
        # can never be mistaken for an internal defect.
        margin = max(3, int(min(h, w) * 0.02))
        kernel = np.ones((margin, margin), np.uint8)
        mask = cv2.erode(mask, kernel, iterations=1)
        return mask

    def _largest_anomalous_contour(self, gray: np.ndarray):
        """
        Finds the most likely defect region *inside* the segmented product
        area using adaptive thresholding + contour extraction. Deterministic:
        identical input -> identical output, always.
        """
        object_mask = self._segment_object_mask(gray)

        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Adaptive threshold copes with uneven industrial lighting far
        # better than a single global threshold.
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 25, 5,
        )

        # Only consider anomalies inside the product, never the background
        # or the silhouette edge.
        thresh = cv2.bitwise_and(thresh, thresh, mask=object_mask)

        # Morphological close to merge broken edge fragments of the same
        # defect into one contour instead of many tiny ones.
        kernel = np.ones((5, 5), np.uint8)
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None

        # Discard anything implausibly large (>60% of the inspectable
        # area is texture noise, not a single defect) or too tiny to be
        # a real defect (<0.05% is sensor noise / JPEG artifact).
        h, w = gray.shape[:2]
        frame_area = h * w
        candidates = [
            c for c in contours
            if 0.0005 * frame_area < cv2.contourArea(c) < 0.60 * frame_area
        ]
        if not candidates:
            return None

        return max(candidates, key=cv2.contourArea)

    @staticmethod
    def _texture_confidence(gray: np.ndarray, bbox) -> float:
        """
        Confidence proxy: Laplacian variance (edge/texture sharpness)
        inside the flagged region relative to the whole image. A sharply
        defined, high-contrast region is a more reliable detection than
        a faint, low-contrast one.
        """
        x, y, w, h = bbox
        roi = gray[y:y + h, x:x + w]
        if roi.size == 0:
            return 60.0

        roi_energy = cv2.Laplacian(roi, cv2.CV_64F).var()
        frame_energy = cv2.Laplacian(gray, cv2.CV_64F).var() + 1e-6
        ratio = roi_energy / frame_energy

        confidence = 55.0 + min(ratio * 12.0, 43.0)
        return round(min(max(confidence, 40.0), 98.0), 1)

    def run_inference(self, image_np: np.ndarray, category: str = "general") -> dict:
        """
        image_np: BGR image as loaded by cv2.imread / cv2.imdecode.
        category: MVTec-style product category, used only to pick a
                  human-readable defect label and to seed a repeatable
                  image hash for traceability.
        """
        if image_np is None or image_np.size == 0:
            raise ValueError("run_inference received an empty image")

        h, w = image_np.shape[:2]
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY) if image_np.ndim == 3 else image_np

        image_hash = hashlib.sha256(image_np.tobytes()).hexdigest()[:12]

        contour = self._largest_anomalous_contour(gray)
        defect_label = CATEGORY_DEFECT_LABELS.get(category, "Surface Scratch")

        if contour is None:
            # No anomalous region found -> genuinely clean part.
            scoring_result = self.calculator.calculate_defect_severity(
                size_score=0.0, location_score=0.0,
                defect_type="None Detected", confidence=97.0,
            )
            return {
                "model_metadata": self._metadata(),
                "image_hash": image_hash,
                "defects": [],
                "scoring": scoring_result,
            }

        x, y, cw, ch = cv2.boundingRect(contour)
        area_ratio = cv2.contourArea(contour) / float(h * w)
        size_score = round(min(area_ratio * 550.0, 100.0), 1)

        # Location score: how close the defect's center is to the
        # component's functional center (closer = more critical).
        cx, cy = x + cw / 2.0, y + ch / 2.0
        center_x, center_y = w / 2.0, h / 2.0
        dist = np.sqrt((cx - center_x) ** 2 + (cy - center_y) ** 2)
        max_dist = np.sqrt(center_x ** 2 + center_y ** 2) + 1e-6
        location_score = round((1.0 - (dist / max_dist)) * 100.0, 1)

        confidence = self._texture_confidence(gray, (x, y, cw, ch))

        scoring_result = self.calculator.calculate_defect_severity(
            size_score=size_score,
            location_score=location_score,
            defect_type=defect_label,
            confidence=confidence,
        )

        bbox_normalized = {
            "x": round((x / w) * 100, 2),
            "y": round((y / h) * 100, 2),
            "width": round((cw / w) * 100, 2),
            "height": round((ch / h) * 100, 2),
        }

        return {
            "model_metadata": self._metadata(),
            "image_hash": image_hash,
            "defects": [{
                "defect_type": defect_label,
                "confidence": confidence,
                "bounding_box": bbox_normalized,
                "size_score": size_score,
                "location_score": location_score,
            }],
            "scoring": scoring_result,
        }

    def _metadata(self) -> dict:
        return {
            "architecture": self.config.get("model_name", "VisionInspect-ClassicalCV-v1"),
            "version": self.config.get("version", "1.0.0"),
            "framework": "OpenCV (deterministic, no training required)",
            "upgrade_path": "ai_model/train_yolo.py trains a real YOLOv8 model on MVTec AD",
        }


# Maintain backward compatibility with existing imports
DefectDetector = YOLOv8DefectDetector