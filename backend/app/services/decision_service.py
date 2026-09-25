from ..models import Decision, Severity

def decide(detections, quality_poor=False):
    if quality_poor:
        return Decision.MANUAL_REVIEW
    if not detections:
        return Decision.PASS
    if any(d["confidence"] < .70 for d in detections):
        return Decision.MANUAL_REVIEW
    levels = {d["severity_level"] for d in detections}
    if Severity.CRITICAL in levels or Severity.HIGH in levels:
        return Decision.FAIL
    if Severity.MEDIUM in levels:
        return Decision.MANUAL_REVIEW
    return Decision.PASS

def recommendation(decision, severity):
    if decision == Decision.PASS:
        return "Product passed automated visual inspection."
    if decision == Decision.MANUAL_REVIEW:
        return "Inspection requires Quality Engineer review before release."
    if severity == Severity.CRITICAL:
        return "Critical defect detected. Reject product and trigger quality inspection workflow."
    return "Significant defect detected. Isolate the product for rework and quality verification."
