"""
Severity Assessment Framework (Milestone 3, Week 5 & 6).

Implements the 4-parameter Severity Scoring Framework:

    Severity Score = (Size Score * 30%) +
                     (Location Score * 25%) +
                     (Defect Type Score * 25%) +
                     (Confidence Score * 20%)

Severity Levels:
    - Critical (80-100): Major structural defect. Product rejection required.
    - High (60-79): Significant quality issue. Rework/repair recommended.
    - Medium (40-59): Moderate quality concern. Inspection review required.
    - Low (0-39): Minor cosmetic defect. Product generally acceptable.
"""
from typing import Optional, List, Dict, Tuple, Any

# Defect Type Severity Scores (25% weight)
# Base severity mapping from 0 to 100 per defect category
DEFECT_TYPE_SEVERITY_MAP: Dict[str, float] = {
    # Minor / Cosmetic
    "scratch": 35.0,
    "surface_scratch": 35.0,
    "cosmetic": 30.0,
    "stain": 40.0,
    "good": 0.0,

    # Moderate
    "pitting": 60.0,
    "contamination": 65.0,
    "color": 50.0,
    "thread": 55.0,

    # High / Structural
    "crack": 90.0,
    "surface_crack": 95.0,
    "broken_small": 85.0,
    "broken_large": 98.0,
    "deformation": 88.0,
    "bent": 85.0,
    "missing_component": 100.0,
    "cut": 90.0,
    "hole": 92.0,
}

DEFAULT_DEFECT_TYPE_SCORE = 60.0


def calculate_size_score(status: str, anomaly_ratio: Optional[float]) -> float:
    """
    Size Score (30% weight): Measures physical size of defect relative to product surface.
    anomaly_ratio is typically between 0.0005 (0.05%) and 0.05 (5.0%).
    Maps ratio to 0-100 scale smoothly:
        ratio <= 0.0 -> 0.0
        ratio = 0.002 (0.2%) -> ~20
        ratio = 0.005 (0.5%) -> ~45
        ratio = 0.015 (1.5%) -> ~85
        ratio >= 0.025 (2.5%) -> 100.0
    """
    if status != "fail" or not anomaly_ratio or anomaly_ratio <= 0:
        return 0.0

    # Scale using non-linear curve to give sensitive response to defect area
    score = (anomaly_ratio / 0.02) * 100.0
    return float(round(min(100.0, max(10.0, score)), 1))


def calculate_location_score(
    status: str,
    bounding_boxes: Optional[List[Dict[str, Any]]],
    image_width: int = 256,
    image_height: int = 256,
) -> float:
    """
    Location Score (25% weight): Measures whether defect occurs in critical central functional area
    versus non-critical peripheral area.
    Normalized distance d from image center (0 at exact center, ~1.0 at farthest corner).
    Central area -> higher score (~80-100).
    Edge area -> lower score (~30-50).
    """
    if status != "fail" or not bounding_boxes:
        return 0.0

    cx_img = image_width / 2.0
    cy_img = image_height / 2.0
    max_dist = (cx_img**2 + cy_img**2) ** 0.5

    loc_scores = []
    for box in bounding_boxes:
        bx = box.get("x", 0) + box.get("w", 0) / 2.0
        by = box.get("y", 0) + box.get("h", 0) / 2.0

        dist = ((bx - cx_img) ** 2 + (by - cy_img) ** 2) ** 0.5
        norm_dist = min(1.0, dist / max_dist)

        # Center (norm_dist ~0) yields score ~95-100; Edge (norm_dist ~1.0) yields ~35
        score = (1.0 - norm_dist * 0.65) * 100.0
        loc_scores.append(score)

    # Use maximum location impact among detected defect regions
    max_score = max(loc_scores) if loc_scores else 50.0
    return float(round(min(100.0, max(20.0, max_score)), 1))


def calculate_defect_type_score(status: str, defect_type: Optional[str]) -> float:
    """
    Defect Type Score (25% weight): Measures seriousness of detected defect category.
    """
    if status != "fail" or not defect_type:
        return 0.0

    key = defect_type.strip().lower().replace(" ", "_")
    if key in DEFECT_TYPE_SEVERITY_MAP:
        return DEFECT_TYPE_SEVERITY_MAP[key]

    # Partial keyword matching fallback
    for pattern, score in DEFECT_TYPE_SEVERITY_MAP.items():
        if pattern in key or key in pattern:
            return score

    return DEFAULT_DEFECT_TYPE_SCORE


def calculate_confidence_score_pct(confidence: Optional[float]) -> float:
    """
    Detection Confidence Score (20% weight): Measures model confidence in defect prediction (0-100%).
    """
    if confidence is None:
        return 50.0
    return float(round(min(100.0, max(0.0, confidence * 100.0)), 1))


def derive_severity_level(score: float, status: str) -> Tuple[str, str]:
    """
    Map overall severity score (0-100) to Severity Level and Recommended Action.

    Levels:
        Critical (80-100): Major structural defect. Rejection required.
        High (60-79): Significant quality issue. Rework recommended.
        Medium (40-59): Moderate quality concern. Inspection review required.
        Low (0-39): Minor cosmetic defect / Pass.
    """
    if status != "fail" or score < 40.0:
        if status == "pass":
            return "Low", "Pass Product - Quality Control Approved"
        return "Low", "Acceptable with Minor Cosmetic Note - Approved for Release"

    if score >= 80.0:
        return "Critical", "Reject Product and Trigger Quality Inspection Workflow"
    if score >= 60.0:
        return "High", "Rework / Repair Recommended - Flagged for Supervisor Review"
    return "Medium", "Manual Inspection Review Required - Secondary Verification Needed"


def calculate_severity(
    status: str,
    anomaly_ratio: Optional[float] = None,
    bounding_boxes: Optional[List[Dict[str, Any]]] = None,
    defect_type: Optional[str] = None,
    confidence_score: Optional[float] = None,
    image_width: int = 256,
    image_height: int = 256,
) -> Dict[str, Any]:
    """
    Computes overall severity score and parameter breakdown using the formula:
        Severity Score = Size(30%) + Location(25%) + Defect Type(25%) + Confidence(20%)
    """
    if status != "fail":
        return {
            "severity_score": 0.0,
            "severity_level": "Low",
            "quality_recommendation": "Pass Product - Quality Control Approved",
            "severity_details": {
                "size_score": 0.0,
                "location_score": 0.0,
                "defect_type_score": 0.0,
                "confidence_score_pct": calculate_confidence_score_pct(confidence_score),
            },
        }

    size_score = calculate_size_score(status, anomaly_ratio)
    location_score = calculate_location_score(status, bounding_boxes, image_width, image_height)
    defect_type_score = calculate_defect_type_score(status, defect_type)
    confidence_score_pct = calculate_confidence_score_pct(confidence_score)

    overall_score = (
        (size_score * 0.30)
        + (location_score * 0.25)
        + (defect_type_score * 0.25)
        + (confidence_score_pct * 0.20)
    )

    overall_score = float(round(min(100.0, max(0.0, overall_score)), 1))
    level, recommendation = derive_severity_level(overall_score, status)

    return {
        "severity_score": overall_score,
        "severity_level": level,
        "quality_recommendation": recommendation,
        "severity_details": {
            "size_score": size_score,
            "location_score": location_score,
            "defect_type_score": defect_type_score,
            "confidence_score_pct": confidence_score_pct,
        },
    }
