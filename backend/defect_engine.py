"""
VisionInspect AI - Defect Detection Pipeline Bridge
"""

import random

def run_defect_pipeline(product_category: str, preprocessing_opts: dict) -> dict:
    """
    Simulates OpenCV anomaly localization and computes Severity Score:
    Severity = (Size * 30%) + (Location * 25%) + (DefectType * 25%) + (Confidence * 20%)
    """
    category_defaults = {
        "metal_nut": ("Surface Crack", 85.0, 90.0, 95.0, 94.5),
        "cable": ("Insulation Cut", 65.0, 80.0, 75.0, 89.0),
        "tile": ("Surface Scratch", 15.0, 20.0, 35.0, 76.0),
        "pill": ("Discoloration", 30.0, 45.0, 40.0, 88.0),
        "transistor": ("Missing Component", 90.0, 95.0, 95.0, 96.0)
    }

    defect_type, size_score, location_score, type_score, confidence = category_defaults.get(
        product_category,
        ("Surface Crack", random.uniform(20.0, 85.0), random.uniform(30.0, 90.0), 75.0, random.uniform(80.0, 98.0))
    )

    # Standardized formula calculation
    severity_score = (
        (size_score * 0.30) +
        (location_score * 0.25) +
        (type_score * 0.25) +
        (confidence * 0.20)
    )

    if severity_score < 40.0:
        level = "Low"
        pass_fail = "PASS"
    elif severity_score < 60.0:
        level = "Medium"
        pass_fail = "FAIL"
    elif severity_score < 80.0:
        level = "High"
        pass_fail = "FAIL"
    else:
        level = "Critical"
        pass_fail = "FAIL"

    return {
        "severity_score": round(severity_score, 2),
        "severity_level": level,
        "pass_fail": pass_fail,
        "defects": [{
            "defect_type": defect_type,
            "confidence": confidence,
            "size_score": size_score,
            "location_score": location_score,
            "bounding_box": {
                "x": round(random.uniform(20, 50), 1),
                "y": round(random.uniform(20, 50), 1),
                "width": round(random.uniform(15, 30), 1),
                "height": round(random.uniform(15, 30), 1)
            }
        }]
    }
