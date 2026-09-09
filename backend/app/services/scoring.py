def calculate_severity_score(
    size_score: float, 
    location_score: float, 
    defect_type_score: float, 
    confidence_score: float
) -> float:
    """
    Calculates the severity score based on the formula:
    Severity Score = (Size * 30%) + (Location * 25%) + (Defect Type * 25%) + (Confidence * 20%)
    """
    score = (size_score * 0.30) + (location_score * 0.25) + (defect_type_score * 0.25) + (confidence_score * 0.20)
    return round(score, 2)


def get_severity_level(score: float) -> str:
    """
    Determines the severity level based on the score:
    Critical (80-100)
    High (60-79)
    Medium (40-59)
    Low (0-39)
    """
    if score >= 80:
        return "Critical"
    elif score >= 60:
        return "High"
    elif score >= 40:
        return "Medium"
    else:
        return "Low"
