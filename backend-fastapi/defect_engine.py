from ultralytics import YOLO
from pathlib import Path

# ============================================================
# MODEL - single-stage defect detector.
# Detects the defect region AND classifies its type in one pass.
# ============================================================

MODEL_PATH = Path(r"C:\Users\veene.LAPTOP-VQNJ8SHT\runs\detect\train-12\weights\best.pt")
model = YOLO(str(MODEL_PATH))

# ============================================================
# SEVERITY SCORING FRAMEWORK
# ------------------------------------------------------------
# Severity Score = Size(30%) + Location(25%) + Type(25%) + Confidence(20%)
#
#   Critical : 80-100  -> Major structural defect, reject product
#   High     : 60-79   -> Significant issue, repair/rework
#   Medium   : 40-59   -> Moderate concern, inspection review
#   Low      : 0-39    -> Minor cosmetic defect, generally acceptable
# ============================================================

SIZE_WEIGHT = 0.30
LOCATION_WEIGHT = 0.25
TYPE_WEIGHT = 0.25
CONFIDENCE_WEIGHT = 0.20

# ------------------------------------------------------------
# Defect Type severity base ranges (0-100 scale).
# Reflects "seriousness of the detected defect category" —
# e.g. Surface Scratch -> low, Crack / Missing Component -> high.
# The detector's own class-confidence scales the score within
# this range (higher confidence in the class -> closer to the
# high end of that class's range).
# ------------------------------------------------------------
DEFECT_TYPE_DISPLAY = {
    "crack":              {"name": "Crack",               "base_type_score": (70, 96)},
    "broken":             {"name": "Broken",               "base_type_score": (75, 98)},
    "missing_component":  {"name": "Missing Component",    "base_type_score": (80, 100)},
    "hole":                {"name": "Hole",                 "base_type_score": (60, 85)},
    "cut":                {"name": "Cut",                  "base_type_score": (55, 80)},
    "deformation":        {"name": "Deformation",          "base_type_score": (40, 65)},
    "contamination":      {"name": "Contamination",        "base_type_score": (30, 55)},
    "foreign_material":   {"name": "Foreign Material",     "base_type_score": (25, 50)},
    "other":               {"name": "Other Defect",         "base_type_score": (20, 50)},
    "discoloration":      {"name": "Discoloration",        "base_type_score": (10, 35)},
    "scratch":            {"name": "Surface Scratch",      "base_type_score": (20, 45)},
}


def severity_level(score: float) -> str:
    if score >= 80:
        return "Critical"
    if score >= 60:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def recommendation_for(level: str, status: str) -> str:
    if status == "pass":
        return "Full Quality Pass — Approve Product for Shipment"
    if level == "Critical":
        return "Reject Product and Trigger Quality Inspection Workflow"
    if level == "High":
        return "Quarantine Product & Route for Repair / Rework"
    if level == "Medium":
        return "Flag for Manual Inspection Review"
    return "Log Defect — Product Generally Acceptable"


def compute_size_score(box_area: float, image_area: float) -> float:
    """
    Defect Size (30%): larger defect relative to product surface -> higher score.
    area_ratio is scaled up (x5) so that small-but-real defects still register
    meaningfully instead of being crushed near 0 on a 0-100 scale.
    """
    area_ratio = box_area / image_area if image_area > 0 else 0
    return min(area_ratio * 100 * 5, 100)


def compute_location_score(x1, y1, x2, y2, image_width, image_height) -> float:
    """
    Defect Location (25%): cosmetic (non-critical) areas score lower,
    functional/critical areas score higher.

    ASSUMPTION: without per-product functional-zone maps, this uses
    distance-from-center as a proxy — edges/corners of a product are
    treated as more likely to be structurally/functionally significant
    than dead-center cosmetic surface. Swap this function out for a
    per-product zone lookup if/when that data becomes available.
    """
    center_x = (x1 + x2) / 2
    center_y = (y1 + y2) / 2
    normalized_x = center_x / image_width
    normalized_y = center_y / image_height
    distance_from_center = (
        ((normalized_x - 0.5) ** 2) + ((normalized_y - 0.5) ** 2)
    ) ** 0.5
    return min(distance_from_center * 200, 100)


def compute_type_score(raw_label: str, class_confidence: float):
    """
    Defect Type (25%): seriousness of the defect category itself.
    Scaled within that category's base range by the model's own
    confidence in this class.
    """
    entry = DEFECT_TYPE_DISPLAY.get(raw_label, DEFECT_TYPE_DISPLAY["other"])
    base_min, base_max = entry["base_type_score"]
    type_score = round(base_min + (base_max - base_min) * class_confidence, 1)
    return entry["name"], type_score


def run_inspection(image_path: str) -> dict:

    results = model.predict(
        source=image_path,
        imgsz=640,
        conf=0.10,
        device="cpu",
        verbose=False,
    )

    result = results[0]

    # --------------------------------------------------------
    # No detection = PASS
    # --------------------------------------------------------
    if result.boxes is None or len(result.boxes) == 0:
        return {
            "defect_type": "None",
            "defect_class_confidence": 0,
            "status": "pass",
            "size_score": 0,
            "location_score": 0,
            "type_score": 0,
            "confidence_score": 0,
            "severity_score": 0,
            "severity_level": "Low",
            "recommendation": "Full Quality Pass — Approve Product for Shipment",
            "bbox": None,
        }

    # --------------------------------------------------------
    # Highest-confidence detection
    # --------------------------------------------------------
    boxes = result.boxes
    best_index = int(boxes.conf.argmax())
    confidence = float(boxes.conf[best_index])
    class_id = int(boxes.cls[best_index])
    raw_label = result.names.get(class_id, "other")

    xyxy = boxes.xyxy[best_index].tolist()
    x1, y1, x2, y2 = xyxy
    width = max(0, x2 - x1)
    height = max(0, y2 - y1)

    if result.orig_shape:
        image_height, image_width = result.orig_shape
    else:
        image_width, image_height = 640, 640

    # --------------------------------------------------------
    # Scoring Parameters
    # --------------------------------------------------------
    size_score = compute_size_score(width * height, image_width * image_height)
    location_score = compute_location_score(x1, y1, x2, y2, image_width, image_height)
    defect_type, type_score = compute_type_score(raw_label, confidence)
    confidence_score = round(confidence * 100, 1)  # Detection Confidence (20%)

    # --------------------------------------------------------
    # Overall Severity Formula
    # --------------------------------------------------------
    severity_score = round(
        size_score * SIZE_WEIGHT
        + location_score * LOCATION_WEIGHT
        + type_score * TYPE_WEIGHT
        + confidence_score * CONFIDENCE_WEIGHT,
        1,
    )
    level = severity_level(severity_score)

    # Confidence < 70% flagged for manual review per spec, without
    # overriding the pass/fail decision itself.
    needs_manual_review = confidence_score < 70

    status = "fail"

    bbox = {
        "x": round(x1),
        "y": round(y1),
        "w": round(width),
        "h": round(height),
    }

    return {
        "defect_type": defect_type,
        "defect_class_confidence": confidence_score,
        "status": status,
        "size_score": round(size_score, 1),
        "location_score": round(location_score, 1),
        "type_score": round(type_score, 1),
        "confidence_score": confidence_score,
        "severity_score": severity_score,
        "severity_level": level,
        "needs_manual_review": needs_manual_review,
        "recommendation": recommendation_for(level, status),
        "bbox": bbox,
    }