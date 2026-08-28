TYPE_SEVERITY_WEIGHTS = {
    "Scratch": 30.0,
    "Surface Defect": 40.0,
    "Dent": 60.0,
    "Crack": 90.0,
    "Cracked Screen": 95.0,
    "Missing Component": 95.0
}


def calculate_severity(
    defect_type: str,
    size_mm2: float,
    is_functional_location: bool,
    confidence: float
) -> dict:
    size_score = min(100.0, (size_mm2 / 100.0) * 100.0)
    location_score = 90.0 if is_functional_location else 35.0
    type_score = TYPE_SEVERITY_WEIGHTS.get(defect_type, 50.0)
    confidence_score = confidence * 100.0

    overall_score = round(
        (size_score * 0.30) +
        (location_score * 0.25) +
        (type_score * 0.25) +
        (confidence_score * 0.20),
        1
    )

    if overall_score >= 80.0:
        level = "Critical"
        recommendation = "Reject product and trigger immediate quality inspection workflow."
    elif overall_score >= 60.0:
        level = "High"
        recommendation = "Significant quality issue. Rework or repair recommended."
    elif overall_score >= 40.0:
        level = "Medium"
        recommendation = "Moderate quality concern. Requires manual supervisor review."
    else:
        level = "Low"
        recommendation = "Minor cosmetic defect. Product acceptable for release."

    return {
        "severity_score": overall_score,
        "severity_level": level,
        "recommendation": recommendation,
        "breakdown": {
            "size_score": size_score,
            "location_score": location_score,
            "type_score": type_score,
            "confidence_score": confidence_score
        }
    }
