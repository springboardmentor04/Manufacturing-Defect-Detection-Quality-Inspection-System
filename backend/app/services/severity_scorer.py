import logging
from typing import Dict, Any, List, Optional
from app.services.defect_categorizer import categorize

logger = logging.getLogger(__name__)

DEFECT_TYPE_SCORE_MAPPING = {
    "Structural Defect": 95,
    "Component Defect": 85,
    "Assembly Defect": 75,
    "Contamination": 60,
    "Color / Appearance Defect": 40,
    "Surface Defect": 30,
    "Other / Unclassified": 50
}

def get_defect_type_score(defect_category: str) -> float:
    return float(DEFECT_TYPE_SCORE_MAPPING.get(defect_category, 50))

def calculate_size_score(bounding_box: Optional[List[float]], segmentation_mask: Optional[List[List[float]]]) -> float:
    """
    Calculate size score based on defect geometry.
    Returns 0-100 normalized score.
    Uses mask area if available, fallback to bounding box area.
    """
    area = 0.0
    if segmentation_mask and len(segmentation_mask) >= 3:
        # Shoelace formula for polygon area
        n = len(segmentation_mask)
        area = 0.5 * abs(
            sum(segmentation_mask[i][0] * segmentation_mask[(i + 1) % n][1] - 
                segmentation_mask[(i + 1) % n][0] * segmentation_mask[i][1] 
                for i in range(n))
        )
    elif bounding_box and len(bounding_box) == 4:
        x1, y1, x2, y2 = bounding_box
        area = max(0, x2 - x1) * max(0, y2 - y1)
        
    # Assuming the area is relative to the normalized image coordinates (0-1).
    # Area will be between 0 and 1. We scale this to a 0-100 score.
    # To make smaller defects more meaningful, we can use a non-linear scale or cap it.
    # We will use a simple linear scaling for this implementation but cap it at 100.
    size_score = min(area * 100 * 2, 100.0) # Multiply by 2 so that a 50% image area defect is 100 score.
    return round(size_score, 2)

def calculate_location_score(bounding_box: Optional[List[float]], segmentation_mask: Optional[List[List[float]]]) -> float:
    """
    Calculate location score based on distance from center.
    Center is considered more critical (100) and edges less critical (0).
    """
    center_x, center_y = 0.5, 0.5
    def_x, def_y = 0.5, 0.5
    
    if bounding_box and len(bounding_box) == 4:
        x1, y1, x2, y2 = bounding_box
        def_x = (x1 + x2) / 2
        def_y = (y1 + y2) / 2
    elif segmentation_mask and len(segmentation_mask) > 0:
        xs = [p[0] for p in segmentation_mask]
        ys = [p[1] for p in segmentation_mask]
        def_x = sum(xs) / len(xs)
        def_y = sum(ys) / len(ys)
        
    # Max distance from center is ~0.707 (sqrt(0.5^2 + 0.5^2))
    import math
    distance = math.sqrt((def_x - center_x)**2 + (def_y - center_y)**2)
    max_distance = 0.7071
    
    # Invert distance so center = 100, edge = 0
    normalized_dist = min(distance / max_distance, 1.0)
    score = (1.0 - normalized_dist) * 100
    
    return round(score, 2)

def calculate_severity(detection: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculates the severity score components and final score for a single detection.
    """
    raw_conf = detection.get("confidence", 0.0)
    if raw_conf <= 1.0:
        confidence_score = raw_conf * 100
    else:
        confidence_score = raw_conf
    confidence_score = round(min(max(confidence_score, 0.0), 100.0), 2)
    
    defect_cat = detection.get("defect_category")
    if not defect_cat:
         defect_cat = categorize(detection.get("defect_type")).get("defect_category", "Other / Unclassified")
         
    defect_type_score = min(max(get_defect_type_score(defect_cat), 0.0), 100.0)
    
    size_score = min(max(calculate_size_score(
        detection.get("bounding_box"), 
        detection.get("segmentation_mask")
    ), 0.0), 100.0)
    
    location_score = min(max(calculate_location_score(
        detection.get("bounding_box"), 
        detection.get("segmentation_mask")
    ), 0.0), 100.0)
    
    # Weights from PDF
    final_score = (
        size_score * 0.30 +
        location_score * 0.25 +
        defect_type_score * 0.25 +
        confidence_score * 0.20
    )
    
    final_score = round(min(max(final_score, 0.0), 100.0), 2)
    
    return {
        "size_score": size_score,
        "location_score": location_score,
        "defect_type_score": defect_type_score,
        "confidence_score": confidence_score,
        "final_score": final_score
    }

def get_severity_level(score: float) -> str:
    if score >= 80:
        return "CRITICAL"
    elif score >= 60:
        return "HIGH"
    elif score >= 40:
        return "MEDIUM"
    else:
        return "LOW"

def get_quality_risk_action(severity_level: str, confidence_score: float) -> Dict[str, str]:
    if confidence_score < 70.0:
        return {
            "quality_risk": "Manual Review Recommended",
            "recommended_action": "Manual inspection required due to low confidence."
        }
        
    if severity_level == "CRITICAL":
        return {
            "quality_risk": "Major structural defect. Product rejection required.",
            "recommended_action": "Reject Product and Trigger Quality Inspection Workflow"
        }
    elif severity_level == "HIGH":
        return {
            "quality_risk": "Significant quality issue.",
            "recommended_action": "Repair or rework recommended."
        }
    elif severity_level == "MEDIUM":
        return {
            "quality_risk": "Moderate quality concern.",
            "recommended_action": "Inspection review required."
        }
    else:
        return {
            "quality_risk": "Minor cosmetic defect.",
            "recommended_action": "Product generally acceptable."
        }
