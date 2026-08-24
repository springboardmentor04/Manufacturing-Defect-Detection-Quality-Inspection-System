# ==========================================
# VisionInspect AI
# Severity & Quality Risk Assessment Module
# ==========================================


def calculate_severity(status: str, confidence: float):
    """
    Calculate severity and quality risk based
    on AI prediction confidence.

    Returns:
        severity
        severity_score
        risk_level
        risk_description
        recommendation
    """

    # ==========================================
    # Product Passed Inspection
    # ==========================================

    if status.lower() == "pass":

        return {
            "severity": "None",
            "severity_score": 0,

            "risk_level": "None",

            "risk_description":
                "No defect detected. Product has passed AI inspection.",

            "recommendation":
                "Product Accepted",
        }


    # ==========================================
    # Convert Confidence
    # ==========================================

    confidence_percent = confidence * 100


    # ==========================================
    # CRITICAL RISK
    # ==========================================

    if confidence_percent >= 95:

        return {
            "severity": "Critical",

            "severity_score": 95,

            "risk_level": "Critical",

            "risk_description":
                "Very high-confidence defect detection. "
                "Immediate quality-control action is recommended.",

            "recommendation":
                "Reject Product Immediately",
        }


    # ==========================================
    # HIGH RISK
    # ==========================================

    elif confidence_percent >= 85:

        return {
            "severity": "High",

            "severity_score": 85,

            "risk_level": "High",

            "risk_description":
                "High-confidence defect detection. "
                "Product requires rework before acceptance.",

            "recommendation":
                "Rework Required",
        }


    # ==========================================
    # MEDIUM RISK
    # ==========================================

    elif confidence_percent >= 70:

        return {
            "severity": "Medium",

            "severity_score": 70,

            "risk_level": "Medium",

            "risk_description":
                "Moderate-confidence defect detection. "
                "Manual inspection is recommended.",

            "recommendation":
                "Manual Inspection Required",
        }


    # ==========================================
    # LOW RISK
    # ==========================================

    else:

        return {
            "severity": "Low",

            "severity_score": 50,

            "risk_level": "Low",

            "risk_description":
                "Low-confidence defect detection. "
                "Review the product before final acceptance.",

            "recommendation":
                "Accept With Review",
        }