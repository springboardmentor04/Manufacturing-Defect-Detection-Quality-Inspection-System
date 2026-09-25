from ..models import Severity

# Configurable location weights
LOCATION_SCORES = {"NON_CRITICAL": 25.0, "NORMAL": 50.0, "FUNCTIONAL": 80.0, "CRITICAL": 100.0}

def size_score(bbox, image_shape):
    h, w = image_shape[:2]
    x1, y1, x2, y2 = bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]
    area_ratio = max(0.0, min(1.0, ((x2 - x1) * (y2 - y1)) / max(1.0, w * h)))
    # Scale non-linear area: 1% of total surface area -> ~40 score, 5%+ -> 100 score
    return min(100.0, round(area_ratio * 2000.0, 2))

def location_score(bbox, image_shape):
    # Center zone (30%-70% in x and y) is critical/functional
    h, w = image_shape[:2]
    cx = (bbox["x1"] + bbox["x2"]) / 2.0 / w
    cy = (bbox["y1"] + bbox["y2"]) / 2.0 / h
    if 0.35 <= cx <= 0.65 and 0.35 <= cy <= 0.65:
        return LOCATION_SCORES["CRITICAL"]
    elif 0.20 <= cx <= 0.80 and 0.20 <= cy <= 0.80:
        return LOCATION_SCORES["FUNCTIONAL"]
    elif 0.10 <= cx <= 0.90 and 0.10 <= cy <= 0.90:
        return LOCATION_SCORES["NORMAL"]
    return LOCATION_SCORES["NON_CRITICAL"]

def defect_type_score(class_name: str) -> float:
    cn = class_name.lower()
    # Structural / Fatal defects
    if any(k in cn for k in ["broken", "crack", "hole", "damaged", "missing", "faulty", "split", "defective"]):
        return 95.0
    # Significant physical defects
    if any(k in cn for k in ["bent", "cut", "squeeze", "fold", "poke", "manipulated", "misplaced"]):
        return 75.0
    # Surface & Cosmetic defects
    if any(k in cn for k in ["scratch", "stain", "contamination", "color", "thread", "print", "stroke", "rough", "oil", "glue"]):
        return 45.0
    return 60.0

def level(score: float) -> Severity:
    if score >= 80.0:
        return Severity.CRITICAL
    if score >= 60.0:
        return Severity.HIGH
    if score >= 40.0:
        return Severity.MEDIUM
    return Severity.LOW

def score_detection(detection, image_shape):
    s = size_score(detection["bbox"], image_shape)
    l = location_score(detection["bbox"], image_shape)
    t = defect_type_score(detection["class_name"])
    c = min(100.0, max(0.0, detection["confidence"] * 100.0))
    
    # Formula: Size (30%) + Location (25%) + Defect Type (25%) + Confidence (20%)
    total = s * 0.30 + l * 0.25 + t * 0.25 + c * 0.20
    score_rounded = round(total, 2)
    
    return {
        **detection,
        "size_score": s,
        "location_score": l,
        "defect_type_score": t,
        "confidence_score": round(c, 2),
        "severity_score": score_rounded,
        "severity_level": level(score_rounded)
    }

