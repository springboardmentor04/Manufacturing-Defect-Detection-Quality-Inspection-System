def calculate_severity(confidence: float, boxes: list = None):
    """
    Calculates the Severity Score and Level based on YOLO bounding boxes and confidence.
    Follows the exact formula:
    Severity Score = (Size * 30%) + (Location * 25%) + (Defect Type * 25%) + (Confidence * 20%)
    """
    if not boxes:
        return {
            "defect_type": "None",
            "defect_size_score": 0,
            "defect_location_score": 0,
            "severity_score": 0,
            "severity_level": "None",
            "recommended_action": "None"
        }

    # 1. Defect Size (30%)
    # Calculate size score based on the largest bounding box area
    max_area = 0
    primary_box = boxes[0]
    for box in boxes:
        width = box["x2"] - box["x1"]
        height = box["y2"] - box["y1"]
        area = width * height
        if area > max_area:
            max_area = area
            primary_box = box
            
    # Normalize area to 0-100. Assume 20% of image is a huge defect (score 100)
    size_score = min(100.0, (max_area / 0.20) * 100)
    
    # 2. Defect Location (25%)
    # Center of the image is critical (0.5, 0.5). Edges are less critical.
    center_x = (primary_box["x1"] + primary_box["x2"]) / 2
    center_y = (primary_box["y1"] + primary_box["y2"]) / 2
    
    # Distance from center (0 to 0.707)
    import math
    dist_from_center = math.sqrt((center_x - 0.5)**2 + (center_y - 0.5)**2)
    # Closer to center = higher score. Max dist is ~0.707.
    location_score = max(0.0, 100.0 - (dist_from_center / 0.707 * 100))
    
    # 3. Defect Type (25%)
    # Map YOLO classes to severity scores
    defect_class = primary_box.get("class", "Unknown").lower()
    if "crack" in defect_class or "missing" in defect_class:
        type_score = 95.0
        defect_type = "Crack / Missing Component"
    elif "scratch" in defect_class:
        type_score = 40.0
        defect_type = "Surface Scratch"
    elif "hole" in defect_class or "dent" in defect_class:
        type_score = 75.0
        defect_type = "Structural Dent/Hole"
    else:
        type_score = 60.0
        defect_type = primary_box.get("class", "Potential Anomaly").title()
        
    # 4. Detection Confidence (20%)
    confidence_score = confidence
    
    # Calculate Overall Severity
    severity_score = (size_score * 0.30) + (location_score * 0.25) + (type_score * 0.25) + (confidence_score * 0.20)
    severity_score = round(min(100.0, max(0.0, severity_score)))
    
    # Determine Severity Level and Action
    if severity_score >= 80:
        level = "Critical"
        action = "Reject Product and Trigger Quality Inspection Workflow"
    elif severity_score >= 60:
        level = "High"
        action = "Repair or rework recommended"
    elif severity_score >= 40:
        level = "Medium"
        action = "Inspection review required"
    else:
        level = "Low"
        action = "Product generally acceptable"
        
    return {
        "defect_type": defect_type,
        "defect_size_score": float(round(size_score, 2)),
        "defect_location_score": float(round(location_score, 2)),
        "severity_score": float(severity_score),
        "severity_level": level,
        "recommended_action": action
    }
