from typing import Dict, Any, List, Optional

DEFECT_TAXONOMY_MAPPING = {
    # Structural Defect
    "bent": "Structural Defect",
    "broken": "Structural Defect",
    "broken_large": "Structural Defect",
    "broken_small": "Structural Defect",
    "broken_teeth": "Structural Defect",
    "crack": "Structural Defect",
    "cut": "Structural Defect",
    "damaged_case": "Structural Defect",
    "hole": "Structural Defect",
    "split_teeth": "Structural Defect",
    "squeeze": "Structural Defect",
    "squeezed_teeth": "Structural Defect",

    # Component Defect
    "bent_lead": "Component Defect",
    "bent_wire": "Component Defect",
    "cut_inner_insulation": "Component Defect",
    "cut_lead": "Component Defect",
    "cut_outer_insulation": "Component Defect",
    "missing_cable": "Component Defect",
    "missing_wire": "Component Defect",

    # Surface Defect
    "fabric_border": "Surface Defect",
    "fabric_interior": "Surface Defect",
    "fold": "Surface Defect",
    "gray_stroke": "Surface Defect",
    "manipulated_front": "Surface Defect",
    "poke": "Surface Defect",
    "poke_insulation": "Surface Defect",
    "rough": "Surface Defect",
    "scratch": "Surface Defect",
    "scratch_head": "Surface Defect",
    "scratch_neck": "Surface Defect",
    "thread": "Surface Defect",
    "thread_side": "Surface Defect",
    "thread_top": "Surface Defect",

    # Contamination
    "contamination": "Contamination",
    "glue": "Contamination",
    "glue_strip": "Contamination",
    "liquid": "Contamination",
    "metal_contamination": "Contamination",
    "oil": "Contamination",

    # Assembly Defect
    "cable_swap": "Assembly Defect",
    "flip": "Assembly Defect",
    "misplaced": "Assembly Defect",

    # Color / Appearance Defect
    "color": "Color / Appearance Defect",
    "faulty_imprint": "Color / Appearance Defect",
    "pill_type": "Color / Appearance Defect",
    "print": "Color / Appearance Defect",

    # Other / Unclassified
    "combined": "Other / Unclassified",
    "defective": "Other / Unclassified"
}

def categorize(defect_type: Optional[str]) -> Dict[str, Optional[str]]:
    """
    Given a YOLO defect type, returns a dictionary containing
    the original defect type and the mapped defect category.
    """
    if not defect_type or defect_type.lower() == "none" or defect_type.lower() == "good":
        return {
            "defect_type": None,
            "defect_category": None
        }

    category = DEFECT_TAXONOMY_MAPPING.get(defect_type, "Other / Unclassified")
    
    return {
        "defect_type": defect_type,
        "defect_category": category
    }

def categorize_detections(detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Given a list of detections (each dict should have a 'defect_type' key),
    populates the 'defect_category' for each detection.
    """
    categorized_detections = []
    for detection in detections:
        cat_result = categorize(detection.get("defect_type"))
        # Create a new dict to avoid modifying the input directly
        new_det = dict(detection)
        new_det["defect_category"] = cat_result["defect_category"]
        categorized_detections.append(new_det)
        
    return categorized_detections
