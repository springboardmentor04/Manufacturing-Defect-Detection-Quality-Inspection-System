from pathlib import Path
import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from fastapi.testclient import TestClient
from app.main import app
import cv2
import numpy as np

from ml.severity.severity_engine import SeverityEngine
from ml.quality.assessment_engine import assess_defect, assess_inspection
from app.database.session import SessionLocal
from app.models.all_models import DefectAssessment, Detection, Inspection, QualityAssessment, QualityDecision, Role, SeverityScore, User
from app.services.quality_analytics import calculate_quality_analytics
from ml.inference.image_processing import ImageValidationError, validate_image
from ml.inference.pipeline import InferencePipeline

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_mandatory_severity():
    # Size = 85, Location = 90, Type = 95, Confidence = 92
    # Severity = Size×30% + Location×25% + Type×25% + Confidence×20%
    engine = SeverityEngine(0.30, 0.25, 0.25, 0.20)
    severity, level = engine.calculate_severity(85, 90, 95, 92)
    # Expected: 85*0.3 + 90*0.25 + 95*0.25 + 92*0.2 = 25.5 + 22.5 + 23.75 + 18.4 = 90.15
    assert abs(severity - 90.15) < 0.01
    assert level == "CRITICAL"


def test_quality_assessment_levels_and_manual_review():
    dimensions = (100, 100)
    low = assess_defect({"type": "contamination", "confidence": 90, "bbox": [0, 0, 2, 2], "area": 4}, dimensions)
    medium = assess_defect({"type": "scratch", "confidence": 80, "bbox": [0, 0, 2, 2], "area": 4}, dimensions)
    high = assess_defect({"type": "hole", "confidence": 98, "bbox": [25, 25, 65, 65], "area": 500}, dimensions)
    critical = assess_defect({"type": "missing_component", "confidence": 99, "bbox": [10, 10, 70, 70], "area": 3600}, dimensions)
    uncertain = assess_defect({"type": "scratch", "confidence": 65, "bbox": [0, 0, 4, 4], "area": 16}, dimensions)

    assert low["severity_level"] in {"LOW", "MEDIUM"}
    assert low["quality_decision"] == "REWORK"
    assert medium["severity_level"] == "MEDIUM"
    assert medium["quality_decision"] == "REWORK"
    assert high["severity_level"] == "HIGH"
    assert high["quality_decision"] == "FAIL"
    assert critical["severity_level"] == "CRITICAL"
    assert critical["quality_decision"] == "FAIL"
    assert uncertain["manual_review_required"] is True
    assert uncertain["quality_decision"] == "REVIEW"

    overall = assess_inspection([low, high, uncertain])
    assert overall["overall_result"] == "REVIEW"
    assert overall["highest_severity"] == "HIGH"
    assert overall["manual_review_required"] is True


def test_no_defect_quality_assessment_passes():
    assessment = assess_inspection([])
    assert assessment["overall_result"] == "PASS"
    assert assessment["defect_count"] == 0


def test_image_validation_and_missing_model_are_safe(tmp_path):
    image_path = tmp_path / "valid.png"
    assert cv2.imwrite(str(image_path), np.full((120, 160, 3), 128, dtype=np.uint8))
    image, info = validate_image(str(image_path))
    assert image.shape[:2] == (120, 160)
    assert info["width"] == 160

    pipeline_without_model = InferencePipeline(str(tmp_path / "does-not-exist.pt"))
    assert pipeline_without_model.model_status == "AVAILABLE"
    assert pipeline_without_model.model_mode == "production"
    assert pipeline_without_model.model is not None

    result = pipeline_without_model.inspect_image(str(image_path), str(tmp_path / "processed.jpg"))
    assert result["model_status"] == "AVAILABLE"
    assert result["model_mode"] == "production"
    assert result["defects"] == []
    assert result["quality_assessment"]["overall_result"] == "PASS"
    assert (tmp_path / "processed.jpg").exists()

    invalid_path = tmp_path / "invalid.jpg"
    invalid_path.write_text("not an image")
    with pytest.raises(ImageValidationError):
        validate_image(str(invalid_path))


def test_model_only_counts_real_detections(tmp_path):
    pipeline = InferencePipeline()

    normal_image = tmp_path / "normal.png"
    assert cv2.imwrite(
        str(normal_image),
        np.full((180, 220, 3), 200, dtype=np.uint8)
    )

    clean_result = pipeline.inspect_image(str(normal_image))

    assert clean_result["defects"] == []
    assert clean_result["quality_assessment"]["overall_result"] == "PASS"
    assert clean_result["quality_assessment"]["defect_count"] == 0

    project_root = Path(__file__).resolve().parents[2]

    defect_image = (
        project_root
        / "datasets"
        / "mvtec_raw"
        / "bottle"
        / "test"
        / "broken_large"
        / "000.png"
    )

    mask_image = (
        project_root
        / "datasets"
        / "mvtec_raw"
        / "bottle"
        / "ground_truth"
        / "broken_large"
        / "000_mask.png"
    )

    assert defect_image.exists(), f"Missing real MVTec defect image: {defect_image}"
    assert mask_image.exists(), f"Missing corresponding MVTec ground-truth mask: {mask_image}"

    defect_result = pipeline.inspect_image(str(defect_image), product_name="bottle")

    assert len(defect_result["defects"]) > 0
    assert (
        defect_result["quality_assessment"]["defect_count"]
        == len(defect_result["defects"])
    )
    assert defect_result["quality_assessment"]["overall_result"] in {"FAIL", "REVIEW"}


def test_dashboard_summary_endpoint():
    login = client.post(
        "/api/auth/mock-login",
        json={"username": "admin", "password": "admin"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    response = client.get(
        "/api/analytics/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert "total_inspections" in payload
    assert "passed_inspections" in payload
    assert "failed_inspections" in payload
    assert "defect_types" in payload
    assert "trends" in payload

    for endpoint in ("/api/analytics/summary?period=TODAY", "/api/analytics/trends?period=LAST_7_DAYS", "/api/analytics/quality-report?period=LAST_30_DAYS"):
        response = client.get(endpoint, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert "total_inspections" in response.json() or "trends" in response.json()


def test_quality_analytics_uses_persisted_inspections():
    db = SessionLocal()
    try:
        role = Role(name="ANALYTICS_TEST_ROLE")
        db.add(role)
        db.flush()
        user = User(username="analytics_test_user", email="analytics@example.test", hashed_password="test", role_id=role.id)
        db.add(user)
        db.flush()

        passed = Inspection(operator_id=user.id)
        failed1 = Inspection(operator_id=user.id)
        failed2 = Inspection(operator_id=user.id)
        db.add_all([passed, failed1, failed2])
        db.flush()
        pass_detection = Detection(inspection_id=passed.id, defect_type="scratch", confidence=96, bbox_x1=0, bbox_y1=0, bbox_x2=2, bbox_y2=2, area=4)
        fail_detection1 = Detection(inspection_id=failed1.id, defect_type="scratch", confidence=80, bbox_x1=0, bbox_y1=0, bbox_x2=5, bbox_y2=5, area=25)
        fail_detection2 = Detection(inspection_id=failed2.id, defect_type="crack", confidence=98, bbox_x1=10, bbox_y1=10, bbox_x2=70, bbox_y2=70, area=3600)
        db.add_all([pass_detection, fail_detection1, fail_detection2])
        db.flush()
        db.add_all([
            DefectAssessment(detection_id=pass_detection.id, size_score=1, location_score=40, type_score=60, confidence_score=96, severity_score=37, severity_level="LOW", quality_risk="Low Risk", quality_decision="FAIL", recommended_action="Record", manual_review_required=False),
            DefectAssessment(detection_id=fail_detection1.id, size_score=10, location_score=50, type_score=60, confidence_score=80, severity_score=45, severity_level="MEDIUM", quality_risk="Moderate Risk", quality_decision="FAIL", recommended_action="Repair", manual_review_required=False),
            DefectAssessment(detection_id=fail_detection2.id, size_score=100, location_score=90, type_score=95, confidence_score=98, severity_score=95, severity_level="CRITICAL", quality_risk="Critical Risk", quality_decision="FAIL", recommended_action="Reject", manual_review_required=False),
            SeverityScore(inspection_id=failed2.id, size_score=100, location_score=90, type_score=95, confidence_score=98, total_score=95, level="CRITICAL"),
            QualityDecision(inspection_id=passed.id, ai_decision="PASS", final_decision="PASS"),
            QualityDecision(inspection_id=failed1.id, ai_decision="FAIL", final_decision="FAIL"),
            QualityDecision(inspection_id=failed2.id, ai_decision="FAIL", final_decision="FAIL"),
            QualityAssessment(inspection_id=passed.id, overall_result="PASS", highest_severity="LOW", quality_risk="Low Risk", defect_count=1, recommended_action="Record", manual_review_required=False),
            QualityAssessment(inspection_id=failed1.id, overall_result="FAIL", highest_severity="MEDIUM", quality_risk="Moderate Risk", defect_count=1, recommended_action="Repair", manual_review_required=False),
            QualityAssessment(inspection_id=failed2.id, overall_result="FAIL", highest_severity="CRITICAL", quality_risk="Critical Risk", defect_count=1, recommended_action="Reject", manual_review_required=False),
        ])
        db.flush()

        metrics = calculate_quality_analytics(db, "TODAY")
        assert metrics["total_inspections"] >= 3
        assert metrics["total_defects"] >= 3
        assert metrics["passed_inspections"] >= 1
        assert metrics["failed_inspections"] >= 2
        assert metrics["critical_defects"] >= 1
        assert any(item["name"] in {"Crack", "Structural Crack", "Surface Crack"} for item in metrics["defects_by_category"])
    finally:
        db.rollback()
        db.close()
