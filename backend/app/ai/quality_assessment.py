# ============================================================
# VISIONINSPECT AI
# QUALITY ASSESSMENT
# Milestone 3
# ============================================================


def calculate_quality_assessment(
    prediction: str,
    confidence: float,
    defect_type: str = "Unknown",
    defect_size_score: float | None = None,
    defect_location_score: float | None = None,
    defect_type_score: float | None = None
):
    """
    Calculate severity, risk level, quality decision,
    and recommendation for an inspection.

    Project severity framework:

        Defect Size          = 30%
        Defect Location      = 25%
        Defect Type          = 25%
        Detection Confidence = 20%

    Severity thresholds:

        Critical = 80 - 100
        High     = 60 - 79
        Medium   = 40 - 59
        Low      = 0 - 39

    The current production AI pipeline does not yet generate
    reliable defect-size and defect-location measurements.

    Therefore:

    1. If all three component scores are supplied, the complete
       weighted severity framework is used.

    2. If those scores are unavailable, the system uses the
       confidence-based fallback assessment.

    This avoids inventing unsupported visual measurements.
    """

    # ========================================================
    # NORMAL PRODUCT
    # ========================================================

    if prediction == "Normal":
        return {
            "severity": "None",
            "severity_score": 0,
            "risk_level": "Low",
            "quality_decision": "PASS",
            "recommendation": (
                "Product passed quality inspection."
            )
        }

    # ========================================================
    # NORMALIZE CONFIDENCE
    # ========================================================

    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.0

    confidence = max(
        0.0,
        min(100.0, confidence)
    )

    # ========================================================
    # CHECK FULL FRAMEWORK AVAILABILITY
    # ========================================================

    framework_available = all(
        score is not None
        for score in (
            defect_size_score,
            defect_location_score,
            defect_type_score
        )
    )

    # ========================================================
    # FULL WEIGHTED SEVERITY FRAMEWORK
    # ========================================================

    if framework_available:

        try:
            defect_size_score = float(
                defect_size_score
            )

            defect_location_score = float(
                defect_location_score
            )

            defect_type_score = float(
                defect_type_score
            )

        except (TypeError, ValueError):

            framework_available = False

    if framework_available:

        defect_size_score = max(
            0.0,
            min(100.0, defect_size_score)
        )

        defect_location_score = max(
            0.0,
            min(100.0, defect_location_score)
        )

        defect_type_score = max(
            0.0,
            min(100.0, defect_type_score)
        )

        # ----------------------------------------------------
        # WEIGHTED SCORE
        # ----------------------------------------------------

        severity_score = (
            defect_size_score * 0.30
            + defect_location_score * 0.25
            + defect_type_score * 0.25
            + confidence * 0.20
        )

        severity_score = round(
            severity_score,
            2
        )

        # ----------------------------------------------------
        # PROJECT SEVERITY THRESHOLDS
        # ----------------------------------------------------

        if severity_score >= 80:

            severity = "Critical"
            risk_level = "High"
            quality_decision = "FAIL"

        elif severity_score >= 60:

            severity = "High"
            risk_level = "High"
            quality_decision = "FAIL"

        elif severity_score >= 40:

            severity = "Medium"
            risk_level = "Medium"
            quality_decision = "WARNING"

        else:

            severity = "Low"
            risk_level = "Low"
            quality_decision = "WARNING"

    # ========================================================
    # CONFIDENCE-BASED FALLBACK
    # ========================================================

    else:

        # ----------------------------------------------------
        # HIGH CONFIDENCE DEFECT
        # ----------------------------------------------------

        if confidence >= 85:

            severity = "High"
            severity_score = round(
                confidence,
                2
            )

            risk_level = "High"
            quality_decision = "FAIL"

        # ----------------------------------------------------
        # MEDIUM CONFIDENCE DEFECT
        # ----------------------------------------------------

        elif confidence >= 70:

            severity = "Medium"
            severity_score = round(
                confidence,
                2
            )

            risk_level = "Medium"
            quality_decision = "WARNING"

        # ----------------------------------------------------
        # LOW CONFIDENCE DEFECT
        # ----------------------------------------------------

        else:

            severity = "Low"
            severity_score = round(
                confidence,
                2
            )

            risk_level = "Low"
            quality_decision = "WARNING"

    # ========================================================
    # RECOMMENDATION
    # ========================================================

    if severity == "Critical":

        recommendation = (
            f"Critical defect detected ({defect_type}). "
            "Product must be rejected and manual quality "
            "inspection is required."
        )

    elif severity == "High":

        recommendation = (
            f"High-severity defect detected ({defect_type}). "
            "Product should be rejected and manual quality "
            "inspection is required."
        )

    elif severity == "Medium":

        recommendation = (
            f"Medium-severity defect detected ({defect_type}). "
            "Additional quality inspection is recommended."
        )

    else:

        recommendation = (
            f"Low-severity defect detected ({defect_type}). "
            "Manual verification is recommended."
        )

    # ========================================================
    # FINAL RESULT
    # ========================================================

    return {
        "severity": severity,
        "severity_score": severity_score,
        "risk_level": risk_level,
        "quality_decision": quality_decision,
        "recommendation": recommendation
    }