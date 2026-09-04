"""
Unit and integration tests for strict 4-decision quality workflow:
PASS, FAIL, REVIEW, REWORK.
Asserts that no other decision values are ever produced or accepted.
"""

import os
import sys
import pytest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parent))

from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models.all_models import (
    User, Role, Product, ProductionBatch, Inspection,
    Detection, DefectAssessment, QualityDecision, QualityAssessment, SeverityScore
)
from app.services.quality_analytics import calculate_quality_analytics
from ml.quality.assessment_engine import (
    decision_for, assess_defect, assess_inspection,
    is_reworkable_defect, normalize_defect_type
)
from ml.inference.pipeline import InferencePipeline

client = TestClient(app)

ALLOWED_DECISIONS = {"PASS", "FAIL", "REVIEW", "REWORK"}
PROHIBITED_VALUES = {
    "UNKNOWN", "OTHER", "UNCLASSIFIED", "LOW CONFIDENCE CLASSIFICATION",
    "MANUAL REVIEW", "REJECT", "APPROVED", "DEFECT", "GOOD", "NONE"
}


# ---------------------------------------------------------------------------
# 1. Decision Logic Engine Unit Tests
# ---------------------------------------------------------------------------

def test_decision_for_returns_only_allowed_decisions():
    test_cases = [
        # (defect_type, level, manual_review, confidence, expected)
        ("", "LOW", False, 95.0, "PASS"),
        ("no_defect", "LOW", False, 95.0, "PASS"),
        ("scratch", "MEDIUM", False, 85.0, "REWORK"),
        ("contamination", "LOW", False, 90.0, "REWORK"),
        ("bent_wire", "HIGH", False, 88.0, "REWORK"),
        ("broken_large", "CRITICAL", False, 95.0, "FAIL"),
        ("hole", "HIGH", False, 92.0, "FAIL"),
        ("crack", "HIGH", False, 90.0, "FAIL"),
        ("missing_cable", "CRITICAL", False, 99.0, "FAIL"),
        ("scratch", "MEDIUM", True, 85.0, "REVIEW"),
        ("scratch", "MEDIUM", False, 65.0, "REVIEW"),  # Low confidence < 70
        ("broken_large", "CRITICAL", False, 55.0, "REVIEW"),  # Low confidence < 70
    ]

    for defect_type, level, manual_review, conf, expected in test_cases:
        decision = decision_for(defect_type, level, manual_review_required=manual_review, confidence=conf)
        assert decision == expected, f"Failed for {defect_type}, {level}, review={manual_review}, conf={conf}: got {decision}"
        assert decision in ALLOWED_DECISIONS
        assert decision not in PROHIBITED_VALUES


def test_assess_defect_fields_separation():
    dims = (500, 500)
    defect = {
        "type": "scratch",
        "confidence": 88.5,
        "bbox": [50, 50, 100, 100],
        "area": 2500,
        "product_category": "bottle",
    }
    result = assess_defect(defect, dims)

    # 4 strictly separate fields
    assert "category" in result
    assert "confidence_score" in result
    assert "severity_score" in result
    assert "quality_decision" in result

    assert result["category"] == "Scratch"
    assert result["confidence_score"] == 88.5
    assert isinstance(result["severity_score"], float)
    assert result["quality_decision"] in ALLOWED_DECISIONS
    assert result["quality_decision"] == "REWORK"


def test_assess_inspection_overall_outcomes():
    dims = (500, 500)

    # Case A: Normal Part -> PASS
    pass_outcome = assess_inspection([])
    assert pass_outcome["overall_result"] == "PASS"
    assert pass_outcome["defect_count"] == 0

    # Case B: Reworkable Defects Only -> REWORK
    rework_defect = assess_defect({"type": "scratch", "confidence": 90.0, "bbox": [10, 10, 20, 20], "area": 100}, dims)
    rework_outcome = assess_inspection([rework_defect])
    assert rework_outcome["overall_result"] == "REWORK"
    assert rework_outcome["defect_count"] == 1

    # Case C: Uncorrectable Defect -> FAIL
    fail_defect = assess_defect({"type": "broken_large", "confidence": 95.0, "bbox": [10, 10, 200, 200], "area": 36100}, dims)
    fail_outcome = assess_inspection([rework_defect, fail_defect])
    assert fail_outcome["overall_result"] == "FAIL"

    # Case D: Low Confidence / Review Required -> REVIEW
    review_defect = assess_defect({"type": "scratch", "confidence": 55.0, "bbox": [10, 10, 20, 20], "area": 100}, dims)
    review_outcome = assess_inspection([review_defect])
    assert review_outcome["overall_result"] == "REVIEW"
    assert review_outcome["manual_review_required"] is True

    # Case E: Poor Image Quality -> REVIEW
    poor_img_outcome = assess_inspection([rework_defect], image_quality_status="POOR")
    assert poor_img_outcome["overall_result"] == "REVIEW"


# ---------------------------------------------------------------------------
# 2. Manual Override API Endpoints Tests
# ---------------------------------------------------------------------------

def _get_auth_token():
    res = client.post("/api/auth/mock-login", json={"username": "admin", "password": "admin"})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_manual_override_accepts_all_4_decisions():
    token = _get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        insp = Inspection(operator_id=user.id)
        db.add(insp)
        db.flush()
        db.add(QualityDecision(inspection_id=insp.id, ai_decision="FAIL", final_decision="FAIL"))
        db.commit()
        insp_id = insp.id
    finally:
        db.close()

    for valid_decision in ["PASS", "FAIL", "REVIEW", "REWORK"]:
        res = client.post(
            f"/api/inspections/{insp_id}/override",
            headers=headers,
            json={"final_decision": valid_decision, "override_reason": f"Testing {valid_decision} override"}
        )
        assert res.status_code == 200
        payload = res.json()
        assert payload["final_decision"] == valid_decision
        assert payload["human_decision"] == valid_decision


def test_manual_override_rejects_invalid_decisions():
    token = _get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        insp = Inspection(operator_id=user.id)
        db.add(insp)
        db.flush()
        db.add(QualityDecision(inspection_id=insp.id, ai_decision="FAIL", final_decision="FAIL"))
        db.commit()
        insp_id = insp.id
    finally:
        db.close()

    for invalid in ["UNKNOWN", "REJECT", "APPROVED", "GOOD", "DEFECT", "MANUAL REVIEW", "INVALID"]:
        res = client.post(
            f"/api/inspections/{insp_id}/override",
            headers=headers,
            json={"final_decision": invalid, "override_reason": "Invalid test"}
        )
        assert res.status_code == 400
        assert "Decision must be one of: PASS, FAIL, REVIEW, REWORK" in res.json()["detail"]


# ---------------------------------------------------------------------------
# 3. Analytics Aggregation with 4 Decisions
# ---------------------------------------------------------------------------

def test_analytics_aggregates_4_decisions():
    token = _get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        i1 = Inspection(operator_id=user.id)
        i2 = Inspection(operator_id=user.id)
        i3 = Inspection(operator_id=user.id)
        i4 = Inspection(operator_id=user.id)
        db.add_all([i1, i2, i3, i4])
        db.flush()

        db.add_all([
            QualityDecision(inspection_id=i1.id, ai_decision="PASS", final_decision="PASS"),
            QualityDecision(inspection_id=i2.id, ai_decision="FAIL", final_decision="FAIL"),
            QualityDecision(inspection_id=i3.id, ai_decision="REVIEW", final_decision="REVIEW"),
            QualityDecision(inspection_id=i4.id, ai_decision="REWORK", final_decision="REWORK"),
        ])
        db.commit()
    finally:
        db.close()

    res = client.get("/api/analytics/overview?period=TODAY", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert "passed_inspections" in data
    assert "failed_inspections" in data
    assert "review_inspections" in data
    assert "rework_inspections" in data
    assert "pass_rate" in data
    assert "fail_rate" in data
    assert "review_rate" in data
    assert "rework_rate" in data

    assert data["passed_inspections"] >= 1
    assert data["failed_inspections"] >= 1
    assert data["review_inspections"] >= 1
    assert data["rework_inspections"] >= 1


# ---------------------------------------------------------------------------
# 4. Report CSV Generation with 4 Decisions
# ---------------------------------------------------------------------------

def test_csv_report_generation_includes_4_decisions():
    token = _get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/reports/generate",
        headers=headers,
        json={"report_type": "DAILY_SUMMARY", "date_range": "TODAY"}
    )
    assert res.status_code == 200
    report_data = res.json()
    assert report_data["file_path"].endswith(".csv")

    csv_disk_path = Path(report_data["file_path"])
    if not csv_disk_path.exists():
        csv_disk_path = Path.cwd() / report_data["file_path"]
    assert csv_disk_path.exists(), f"CSV file does not exist at {csv_disk_path}"
    content = csv_disk_path.read_text(encoding="utf-8")

    assert "PASS Count" in content
    assert "FAIL Count" in content
    assert "REVIEW Count" in content
    assert "REWORK Count" in content
    assert "=== ITEMIZED INSPECTION LOGS ===" in content
