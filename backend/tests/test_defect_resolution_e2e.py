"""
End-to-End Test Suite for VisionInspect AI Defect Resolution & Quality Decision Pipeline.

Covers all 15 required verification checkpoints:
 1. Valid defect detection
 2. Valid non-defect / PASS result
 3. Low-confidence detection (<70% -> REVIEW)
 4. Multiple detections
 5. Unknown / invalid class ID
 6. Correct class mapping (73 MVTec classes)
 7. Correct defect type resolution
 8. Correct severity calculation
 9. Correct PASS / FAIL / REVIEW / REWORK 4-state decisions
10. Database persistence
11. API response schema and field alignment
12. Frontend display formatting
13. Product selection
14. New inspection creation flow
15. Inspection history retrieval
"""

import os
import sys
import io
import json
import pytest
import numpy as np
import cv2
from pathlib import Path

# Ensure paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models.all_models import (
    User, Role, Product, ProductionBatch, Inspection, InspectionImage,
    Detection, DefectAssessment, QualityDecision, QualityAssessment, SeverityScore
)
from ml.inference.class_resolution import (
    load_class_mapping, resolve_detection_class, resolve_class_name, describe_model_classes
)
from ml.quality.assessment_engine import (
    decision_for, assess_defect, assess_inspection, category_label, format_defect_name,
    is_reworkable_defect, normalize_defect_type
)
from ml.severity.severity_engine import SeverityEngine
from ml.inference.pipeline import InferencePipeline

client = TestClient(app)


def _get_auth_token():
    res = client.post("/api/auth/mock-login", json={"username": "admin", "password": "admin"})
    assert res.status_code == 200
    return res.json()["access_token"]


# ---------------------------------------------------------------------------
# Requirement 1: Valid defect detection
# ---------------------------------------------------------------------------
def test_01_valid_defect_detection(tmp_path):
    defect_img = tmp_path / "defect.png"
    img_data = np.full((300, 300, 3), 180, dtype=np.uint8)
    cv2.circle(img_data, (150, 150), 30, (20, 20, 20), -1)
    cv2.imwrite(str(defect_img), img_data)

    pipeline = InferencePipeline()
    result = pipeline.inspect_image(str(defect_img), product_name="bottle")
    
    assert "quality_assessment" in result
    assert "defects" in result
    assert result["model_status"] == "AVAILABLE"
    assert isinstance(result["defects"], list)


# ---------------------------------------------------------------------------
# Requirement 2: Valid non-defect / PASS result
# ---------------------------------------------------------------------------
def test_02_valid_non_defect_pass_result(tmp_path):
    clean_img = tmp_path / "clean_part.png"
    img_data = np.full((250, 250, 3), 220, dtype=np.uint8)
    cv2.imwrite(str(clean_img), img_data)

    pipeline = InferencePipeline()
    result = pipeline.inspect_image(str(clean_img), product_name="bottle")

    assert result["quality_assessment"]["overall_result"] == "PASS"
    assert result["quality_assessment"]["defect_count"] == 0
    assert result["defects"] == []
    assert result["status"] == "normal"


# ---------------------------------------------------------------------------
# Requirement 3: Low-confidence detection (<70% -> REVIEW)
# ---------------------------------------------------------------------------
def test_03_low_confidence_detection():
    # Confidence 62% is below the 70% threshold
    decision = decision_for("scratch", "MEDIUM", manual_review_required=False, confidence=62.0)
    assert decision == "REVIEW"

    # Defect assessment with 55% confidence
    dims = (400, 400)
    defect = {"type": "scratch", "confidence": 55.0, "bbox": [10, 10, 30, 30], "area": 400}
    assessed = assess_defect(defect, dims)
    assert assessed["manual_review_required"] is True
    assert assessed["quality_decision"] == "REVIEW"


# ---------------------------------------------------------------------------
# Requirement 4: Multiple detections
# ---------------------------------------------------------------------------
def test_04_multiple_detections():
    dims = (500, 500)
    d1 = assess_defect({"type": "scratch", "confidence": 88.0, "bbox": [10, 10, 25, 25], "area": 225}, dims)
    d2 = assess_defect({"type": "contamination", "confidence": 92.0, "bbox": [50, 50, 70, 70], "area": 400}, dims)
    d3 = assess_defect({"type": "broken_large", "confidence": 95.0, "bbox": [100, 100, 300, 300], "area": 40000}, dims)

    assert d1["quality_decision"] == "REWORK"
    assert d2["quality_decision"] == "REWORK"
    assert d3["quality_decision"] == "FAIL"

    # Multiple reworkable defects alone -> REWORK
    rework_only = assess_inspection([d1, d2])
    assert rework_only["defect_count"] == 2
    assert rework_only["overall_result"] == "REWORK"

    # Combining with a critical defect -> FAIL
    combined = assess_inspection([d1, d2, d3])
    assert combined["defect_count"] == 3
    assert combined["overall_result"] == "FAIL"


# ---------------------------------------------------------------------------
# Requirement 5: Unknown / invalid class ID handling
# ---------------------------------------------------------------------------
def test_05_unknown_invalid_class_id():
    # When no model names dict is provided, fallback is class_999 without crashing
    resolved_empty = resolve_detection_class(999, {})
    assert resolved_empty["mapped"] is False
    assert resolved_empty["class_id"] == 999
    assert resolved_empty["class_name"] == "class_999"

    # Single-class model with {0: 'defect'}
    resolved_generic = resolve_detection_class(0, {0: "defect"}, product_name="bottle")
    assert resolved_generic["mapped"] is False
    assert resolved_generic["class_name"] == "defect"
    assert resolved_generic["defect_type"] == "defect"
    assert resolved_generic["product_category"] == "bottle"


# ---------------------------------------------------------------------------
# Requirement 6: Correct class mapping (73 MVTec classes)
# ---------------------------------------------------------------------------
def test_06_correct_class_mapping():
    mapping = load_class_mapping()
    assert len(mapping) == 73

    samples = {
        "0": ("bottle_broken_large", "bottle", "broken_large"),
        "3": ("cable_bent_wire", "cable", "bent_wire"),
        "11": ("capsule_crack", "capsule", "crack"),
        "18": ("carpet_hole", "carpet", "hole"),
        "19": ("carpet_metal_contamination", "carpet", "metal_contamination"),
        "31": ("leather_cut", "leather", "cut"),
        "33": ("leather_glue", "leather", "glue"),
        "43": ("pill_faulty_imprint", "pill", "faulty_imprint"),
        "60": ("transistor_misplaced", "transistor", "misplaced"),
        "65": ("wood_scratch", "wood", "scratch"),
        "66": ("zipper_broken_teeth", "zipper", "broken_teeth"),
    }
    for cid, (expected_name, expected_cat, expected_type) in samples.items():
        entry = mapping[cid]
        assert entry["class_name"] == expected_name
        assert entry["category"] == expected_cat
        assert entry["defect_type"] == expected_type


# ---------------------------------------------------------------------------
# Requirement 7: Correct defect type resolution
# ---------------------------------------------------------------------------
def test_07_correct_defect_type_resolution():
    res1 = resolve_class_name("bottle_broken_large")
    assert res1 is not None
    assert res1["category"] == "bottle"
    assert res1["defect_type"] == "broken_large"

    res2 = resolve_class_name("zipper_broken_teeth")
    assert res2 is not None
    assert res2["category"] == "zipper"
    assert res2["defect_type"] == "broken_teeth"

    assert normalize_defect_type("bent wire") == "bent_wire"
    assert normalize_defect_type("broken-large") == "broken_large"
    assert format_defect_name("cable_bent_wire", "cable") == "Bent Wire"
    assert format_defect_name("bottle_broken_large") == "Broken Large"


# ---------------------------------------------------------------------------
# Requirement 8: Correct severity calculation
# ---------------------------------------------------------------------------
def test_08_correct_severity():
    engine = SeverityEngine(0.30, 0.25, 0.25, 0.20)
    score, level = engine.calculate_severity(
        size_score=70.0,
        loc_score=80.0,
        type_score=80.0,
        conf_score=90.0
    )
    # Expected: 70*0.3 + 80*0.25 + 80*0.25 + 90*0.20 = 21 + 20 + 20 + 18 = 79.0
    assert abs(score - 79.0) < 0.01
    assert level == "HIGH"

    # Critical severity test
    score_crit, level_crit = engine.calculate_severity(
        size_score=90.0,
        loc_score=90.0,
        type_score=95.0,
        conf_score=95.0
    )
    # Expected: 90*0.3 + 90*0.25 + 95*0.25 + 95*0.2 = 27 + 22.5 + 23.75 + 19 = 92.25
    assert abs(score_crit - 92.25) < 0.01
    assert level_crit == "CRITICAL"


# ---------------------------------------------------------------------------
# Requirement 9: Strict 4-State Decisions (PASS, FAIL, REVIEW, REWORK)
# ---------------------------------------------------------------------------
def test_09_correct_pass_fail_review_rework_decision():
    valid_decisions = {"PASS", "FAIL", "REVIEW", "REWORK"}

    # 1. Clean part -> PASS
    d_pass = decision_for("", "LOW", manual_review_required=False, confidence=95.0)
    assert d_pass == "PASS"

    # 2. Repairable defect -> REWORK
    d_rework = decision_for("scratch", "MEDIUM", manual_review_required=False, confidence=85.0)
    assert d_rework == "REWORK"

    # 3. Critical defect -> FAIL
    d_fail = decision_for("broken_large", "CRITICAL", manual_review_required=False, confidence=95.0)
    assert d_fail == "FAIL"

    # 4. Low confidence -> REVIEW
    d_review = decision_for("scratch", "MEDIUM", manual_review_required=False, confidence=60.0)
    assert d_review == "REVIEW"

    for d in [d_pass, d_rework, d_fail, d_review]:
        assert d in valid_decisions


# ---------------------------------------------------------------------------
# Requirement 10: Database persistence
# ---------------------------------------------------------------------------
def test_10_database_persistence():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        product = db.query(Product).first()
        if not product:
            product = Product(name="Test Bottle", category="bottle")
            db.add(product)
            db.flush()

        batch = db.query(ProductionBatch).filter(ProductionBatch.product_id == product.id).first()
        if not batch:
            batch = ProductionBatch(product_id=product.id, batch_number="TEST_BATCH_1")
            db.add(batch)
            db.flush()

        insp = Inspection(
            batch_id=batch.id,
            operator_id=user.id,
            processing_time_ms=45.2
        )
        db.add(insp)
        db.flush()

        img = InspectionImage(
            inspection_id=insp.id,
            file_path="uploads/test_sample.png",
            image_type="raw"
        )
        db.add(img)

        det = Detection(
            inspection_id=insp.id,
            defect_type="scratch",
            confidence=87.5,
            bbox_x1=10, bbox_y1=10, bbox_x2=50, bbox_y2=50,
            area=1600
        )
        db.add(det)
        db.flush()

        assessment = DefectAssessment(
            detection_id=det.id,
            size_score=20,
            location_score=40,
            type_score=50,
            confidence_score=87.5,
            severity_score=45.0,
            severity_level="MEDIUM",
            quality_risk="Moderate Risk",
            quality_decision="REWORK",
            recommended_action="Surface Polish",
            manual_review_required=False
        )
        decision = QualityDecision(
            inspection_id=insp.id,
            ai_decision="REWORK",
            final_decision="REWORK"
        )
        q_assessment = QualityAssessment(
            inspection_id=insp.id,
            overall_result="REWORK",
            highest_severity="MEDIUM",
            quality_risk="Moderate Risk",
            defect_count=1,
            recommended_action="Surface Polish",
            manual_review_required=False
        )
        db.add_all([assessment, decision, q_assessment])
        db.commit()

        # Query back and verify persistence
        saved_insp = db.query(Inspection).filter(Inspection.id == insp.id).first()
        assert saved_insp is not None
        assert len(saved_insp.detections) == 1
        assert saved_insp.detections[0].defect_type == "scratch"
        assert saved_insp.quality_decision.final_decision == "REWORK"
        assert saved_insp.quality_assessment.overall_result == "REWORK"
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Requirement 11: API response schema and field alignment
# ---------------------------------------------------------------------------
def test_11_api_response_schema():
    token = _get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        product = db.query(Product).first()
        if not product:
            product = Product(name="API Bottle", category="bottle")
            db.add(product)
            db.commit()
        prod_id = product.id
    finally:
        db.close()

    # Create dummy JPEG in memory
    img_data = np.full((120, 120, 3), 200, dtype=np.uint8)
    _, buffer = cv2.imencode(".jpg", img_data)
    file_bytes = io.BytesIO(buffer.tobytes())

    response = client.post(
        "/api/inspections/run",
        headers=headers,
        data={"product_id": str(prod_id)},
        files={"file": ("test_part.jpg", file_bytes, "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()

    assert "id" in data
    assert "product_id" in data
    assert "image_path" in data
    assert "detections" in data
    assert "final_decision" in data
    assert "quality_decision" in data
    assert "quality_assessment" in data
    assert data["final_decision"] in {"PASS", "FAIL", "REVIEW", "REWORK"}


# ---------------------------------------------------------------------------
# Requirement 12: Frontend display formatting
# ---------------------------------------------------------------------------
def test_12_frontend_display_formatting():
    assert category_label("broken_large", "bottle") == "Broken Large"
    assert category_label("bent_wire", "cable") == "Bent Wire"
    assert category_label("broken_teeth", "zipper") == "Broken Teeth"
    assert category_label("faulty_imprint", "pill") == "Faulty Imprint"
    assert format_defect_name("capsule_crack", "capsule") == "Crack"
    assert format_defect_name("scratch") == "Scratch"


# ---------------------------------------------------------------------------
# Requirement 13: Product selection
# ---------------------------------------------------------------------------
def test_13_product_selection():
    token = _get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/products/", headers=headers)
    assert res.status_code == 200
    products = res.json()
    assert isinstance(products, list)
    assert len(products) > 0

    first_product = products[0]
    assert "id" in first_product
    assert "name" in first_product


# ---------------------------------------------------------------------------
# Requirement 14: New inspection flow
# ---------------------------------------------------------------------------
def test_14_new_inspection_flow():
    token = _get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    products_res = client.get("/api/products/", headers=headers)
    assert products_res.status_code == 200
    product_id = products_res.json()[0]["id"]

    img_data = np.full((100, 100, 3), 180, dtype=np.uint8)
    _, buffer = cv2.imencode(".jpg", img_data)
    file_bytes = io.BytesIO(buffer.tobytes())

    create_res = client.post(
        "/api/inspections/run",
        headers=headers,
        data={"product_id": str(product_id)},
        files={"file": ("flow_test.jpg", file_bytes, "image/jpeg")}
    )
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["id"] > 0
    assert created["product_id"] == product_id


# ---------------------------------------------------------------------------
# Requirement 15: Inspection history
# ---------------------------------------------------------------------------
def test_15_inspection_history():
    token = _get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    list_res = client.get("/api/inspections/?skip=0&limit=10", headers=headers)
    assert list_res.status_code == 200
    history = list_res.json()
    assert isinstance(history, list)
    assert len(history) > 0

    inspection_id = history[0]["id"]
    detail_res = client.get(f"/api/inspections/{inspection_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == inspection_id
    assert "detections" in detail
    assert "quality_decision" in detail
