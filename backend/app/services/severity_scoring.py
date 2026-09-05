import random
from typing import Dict, Any, Union

# Mapping of defect types to base severity weights
DEFECT_TYPE_SEVERITY_MAP: Dict[str, float] = {
    "crack": 90.0,
    "missing_component": 95.0,
    "missing_part": 95.0,
    "hole": 85.0,
    "dent": 60.0,
    "scratch": 30.0,
    "discoloration": 25.0,
}

DEFAULT_TYPE_SCORE: float = 50.0

def get_type_score(defect_type: str) -> float:
    """
    Returns base type severity score based on the defect category.
    Defaults to 50.0 for unknown defect types.
    """
    if not defect_type:
        return DEFAULT_TYPE_SCORE
    normalized = defect_type.strip().lower().replace(" ", "_").replace("-", "_")
    
    # Direct lookup or substring match
    if normalized in DEFECT_TYPE_SEVERITY_MAP:
        return DEFECT_TYPE_SEVERITY_MAP[normalized]
    
    for key, score in DEFECT_TYPE_SEVERITY_MAP.items():
        if key in normalized:
            return score
            
    return DEFAULT_TYPE_SCORE

def get_severity_level(score: float) -> str:
    """
    Classifies numeric severity score (0-100) into discrete severity levels:
    - Critical (80-100)
    - High (60-79)
    - Medium (40-59)
    - Low (0-39)
    """
    if score >= 80.0:
        return "Critical"
    elif score >= 60.0:
        return "High"
    elif score >= 40.0:
        return "Medium"
    else:
        return "Low"

def calculate_severity(
    defect: Union[Dict[str, Any], Any],
    image_width: int = 640,
    image_height: int = 640,
    seed: int = None
) -> Dict[str, Any]:
    """
    Calculates the severity score and discrete level for a defect using the weighted formula:
    severity_score = (size_score * 0.30) + (location_score * 0.25) + 
                     (type_score * 0.25) + (confidence_score * 0.20)
    
    Parameters:
    - defect: dictionary or object with bbox coordinates, defect_type, and confidence_score
    - image_width: image width in pixels (defaults to 640)
    - image_height: image height in pixels (defaults to 640)
    - seed: optional deterministic seed for tests
    """
    if seed is not None:
        rng = random.Random(seed)
    else:
        rng = random.Random()

    # Extract defect fields whether passed as dict or ORM/Pydantic object
    if isinstance(defect, dict):
        d_type = defect.get("defect_type", "")
        conf = defect.get("confidence_score", 0.0)
        bx = defect.get("bbox_x", 0) or 0
        by = defect.get("bbox_y", 0) or 0
        bw = defect.get("bbox_width", 0) or 0
        bh = defect.get("bbox_height", 0) or 0
    else:
        d_type = getattr(defect, "defect_type", "")
        conf = getattr(defect, "confidence_score", 0.0)
        bx = getattr(defect, "bbox_x", 0) or 0
        by = getattr(defect, "bbox_y", 0) or 0
        bw = getattr(defect, "bbox_width", 0) or 0
        bh = getattr(defect, "bbox_height", 0) or 0

    # 1. Size Score: % of total image area scaled to 0-100
    img_w = max(1, image_width)
    img_h = max(1, image_height)
    total_area = float(img_w * img_h)
    defect_area = float(max(0, bw) * max(0, bh))
    
    area_pct = (defect_area / total_area) * 100.0
    # In industrial inspection, scaling area % by 5x (20% bbox = 100 max score)
    size_score = min(100.0, max(0.0, area_pct * 5.0))
    # If size is minimal or 0, give small baseline based on dimension
    if size_score < 5.0 and (bw > 0 or bh > 0):
        size_score = min(100.0, max(5.0, area_pct * 10.0))

    # 2. Location Score: Critical zone (middle 60%) vs Cosmetic zone (outer 40%)
    center_x = bx + (bw / 2.0)
    center_y = by + (bh / 2.0)

    # Middle 60% range: [20% to 80%]
    is_in_critical_x = (0.20 * img_w) <= center_x <= (0.80 * img_w)
    is_in_critical_y = (0.20 * img_h) <= center_y <= (0.80 * img_h)

    if is_in_critical_x and is_in_critical_y:
        # Critical functional area (70-100)
        location_score = round(rng.uniform(75.0, 95.0), 2)
    else:
        # Outer cosmetic area (20-50)
        location_score = round(rng.uniform(22.0, 48.0), 2)

    # 3. Type Score from classification dictionary (0-100)
    type_score = float(get_type_score(d_type))

    # 4. Confidence Score scaled to 0-100
    confidence_scaled = float(conf)
    if confidence_scaled <= 1.0:
        confidence_scaled = confidence_scaled * 100.0
    confidence_score = min(100.0, max(0.0, confidence_scaled))

    # 5. Compute Weighted Severity Score
    severity_score = (
        (size_score * 0.30) +
        (location_score * 0.25) +
        (type_score * 0.25) +
        (confidence_score * 0.20)
    )
    severity_score = min(100.0, max(0.0, severity_score))
    severity_level = get_severity_level(severity_score)

    return {
        "size_score": round(size_score, 2),
        "location_score": round(location_score, 2),
        "type_score": round(type_score, 2),
        "severity_score": round(severity_score, 2),
        "severity_level": severity_level
    }
