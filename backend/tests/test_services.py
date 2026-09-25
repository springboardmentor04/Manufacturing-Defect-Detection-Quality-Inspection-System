from app.services.decision_service import decide
from app.services.severity_service import level
from app.models import Decision, Severity

def test_no_defect_passes():
    assert decide([]) == Decision.PASS

def test_low_severity_is_low():
    assert level(20) == Severity.LOW

def test_critical_is_critical():
    assert level(80) == Severity.CRITICAL

def test_uncertain_detection_requires_review():
    d={"confidence":0.69,"severity_level":Severity.HIGH}
    assert decide([d]) == Decision.MANUAL_REVIEW
