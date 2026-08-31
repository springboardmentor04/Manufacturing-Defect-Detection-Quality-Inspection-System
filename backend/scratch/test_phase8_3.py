"""
Test Suite for Phase 8.3 — Secondary Quality Pages Connection
Verifies DefectDetailsPage and QualityReportPage data binding and clean mock removal.
"""

import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from fastapi.testclient import TestClient
from app.main import app as fastapi_app
from app.database import SessionLocal, engine, Base
from app.models.roles import Role
from app.models.users import User
from app.utils.security import hash_password, create_access_token
from app.services.inspection_service import persist_complete_inspection

def run_tests():
    print("=" * 60)
    print("RUNNING PHASE 8.3 SECONDARY QUALITY PAGES TEST SUITE")
    print("=" * 60)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    passed_count = 0
    total_count = 0

    def assert_test(condition, name, details=""):
        nonlocal passed_count, total_count
        total_count += 1
        if condition:
            passed_count += 1
            print(f"[PASS] Test {total_count}: {name}")
        else:
            print(f"[FAIL] Test {total_count}: {name} | Details: {details}")

    try:
        # Seed test QE user & token
        role_qe = db.query(Role).filter(Role.role_name == "QUALITY_ENGINEER").first()
        if not role_qe:
            role_qe = Role(role_name="QUALITY_ENGINEER", description="Quality Engineer")
            db.add(role_qe)
            db.flush()

        qe_user = db.query(User).filter(User.email == "test_qe_phase8_3@factory.ai").first()
        if not qe_user:
            qe_user = User(
                full_name="Phase 8.3 Inspector",
                email="test_qe_phase8_3@factory.ai",
                password_hash=hash_password("pass123"),
                role_id=role_qe.id,
                status="ACTIVE"
            )
            db.add(qe_user)
            db.commit()

        token = create_access_token(subject=str(qe_user.id), role="QUALITY_ENGINEER")
        headers = {"Authorization": f"Bearer {token}"}

        # Create real test inspection
        eval_payload = {
            "inspection_status": "FAIL",
            "overall_severity": "CRITICAL",
            "overall_score": 100.0,
            "decision_reason": "Tier-1 Zero-Tolerance Critical Defect detected.",
            "number_of_detected_defects": 1,
            "detections": [{
                "defect_class": "bottle_broken_large",
                "confidence": 0.99,
                "individual_severity_score": 100.0,
                "bounding_box": {"x_min": 140, "y_min": 92, "width": 80, "height": 60}
            }]
        }
        persisted = persist_complete_inspection(
            db=db,
            product_code="PRD-BOTTLE-P83",
            product_category="bottle",
            file_path="dataset_yolo/images/test/bottle_broken_large_000.png",
            severity_eval=eval_payload
        )
        test_code = persisted["inspection_code"]

        client = TestClient(fastapi_app)

        # TEST 1: GET /quality/inspections/{code} (200 OK)
        res1 = client.get(f"/api/v1/quality/inspections/{test_code}", headers=headers)
        data1 = res1.json()
        assert_test(
            res1.status_code == 200 and data1["inspection_code"] == test_code,
            "1. GET /quality/inspections/{code} returns complete detail payload for report/defect pages",
            f"code={data1.get('inspection_code')}"
        )

        # TEST 2: Verify real fields match PostgreSQL record
        assert_test(
            data1["status"] == "FAIL" and data1["overall_severity"] == "CRITICAL" and data1["overall_score"] == 100.0,
            "2. Verify real database fields (status=FAIL, severity=CRITICAL, score=100.0)",
            f"status={data1.get('status')}, score={data1.get('overall_score')}"
        )

        # TEST 3: Verify bounding box coordinates match PostgreSQL
        bboxes = data1.get("defects", [])
        assert_test(
            len(bboxes) == 1 and bboxes[0]["bounding_box"]["x_min"] == 140,
            "3. Verify bounding box coordinates match PostgreSQL (x_min=140, width=80)",
            f"bbox={bboxes[0]['bounding_box'] if bboxes else None}"
        )

        # TEST 4: Invalid ID -> 404 handling
        res4 = client.get("/api/v1/quality/inspections/INVALID_P83_ID", headers=headers)
        assert_test(
            res4.status_code == 404,
            "4. GET /quality/inspections/invalid -> HTTP 404 Not Found",
            f"status={res4.status_code}"
        )

    finally:
        db.close()

    # TEST 5 & 6: Code Audit Check (Remove mock objects from DefectDetailsPage & QualityReportPage)
    dd_path = os.path.join(PROJECT_ROOT, "frontend", "src", "pages", "quality", "DefectDetailsPage.jsx")
    qr_path = os.path.join(PROJECT_ROOT, "frontend", "src", "pages", "quality", "QualityReportPage.jsx")

    with open(dd_path, "r", encoding="utf-8") as f:
        dd_content = f.read()
    with open(qr_path, "r", encoding="utf-8") as f:
        qr_content = f.read()

    assert_test(
        "Microscopic crack detected" not in dd_content and "BOUNDING BOX PREVIEW: MICRO CRACK" not in dd_content,
        "5. DefectDetailsPage.jsx clean (hardcoded micro-crack mock removed)",
        "Found hardcoded mock in DefectDetailsPage"
    )

    assert_test(
        "const reportMetadata =" not in qr_content and "PRD-8092" not in qr_content,
        "6. QualityReportPage.jsx clean (static reportMetadata mock removed)",
        "Found hardcoded reportMetadata in QualityReportPage"
    )

    print("=" * 60)
    print(f"PHASE 8.3 TEST RESULTS: {passed_count}/{total_count} PASSED")
    print("=" * 60)
    return passed_count == total_count

if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
