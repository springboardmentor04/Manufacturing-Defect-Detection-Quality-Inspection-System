"""
Test Suite for Phase 8.1.1 — Quality Engineer Subpages Connection
Verifies GET /quality/inspections/{id} detail endpoint, HTTP 404 handling, and history endpoint.
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
from app.models.inspections import Inspection
from app.models.roles import Role
from app.models.users import User
from app.utils.security import hash_password, create_access_token
from app.services.inspection_service import persist_complete_inspection

def run_tests():
    print("=" * 60)
    print("RUNNING PHASE 8.1.1 TEST SUITE")
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

        qe_user = db.query(User).filter(User.email == "test_qe_phase8@factory.ai").first()
        if not qe_user:
            qe_user = User(
                full_name="Phase 8 QE Inspector",
                email="test_qe_phase8@factory.ai",
                password_hash=hash_password("pass123"),
                role_id=role_qe.id,
                status="ACTIVE"
            )
            db.add(qe_user)
            db.commit()

        token = create_access_token(subject=str(qe_user.id), role="QUALITY_ENGINEER")
        headers = {"Authorization": f"Bearer {token}"}

        # Create a real test inspection row in DB
        eval_payload = {
            "inspection_status": "FAIL",
            "overall_severity": "CRITICAL",
            "overall_score": 100.0,
            "decision_reason": "Phase 8.1.1 test zero-tolerance critical fracture.",
            "number_of_detected_defects": 1,
            "detections": [{
                "defect_class": "pill_crack",
                "confidence": 0.96,
                "individual_severity_score": 100.0,
                "bounding_box": {"x_min": 15, "y_min": 25, "width": 50, "height": 50}
            }]
        }
        persisted = persist_complete_inspection(
            db=db,
            product_code="PRD-PHASE8-TEST",
            product_category="pill",
            file_path="sample_test_phase8.png",
            severity_eval=eval_payload
        )
        test_insp_id = persisted["inspection_id"]
        test_insp_code = persisted["inspection_code"]

        client = TestClient(fastapi_app)

        # TEST 1: GET /quality/inspections/{id} by UUID (200 OK)
        res1 = client.get(f"/api/v1/quality/inspections/{test_insp_id}", headers=headers)
        assert_test(
            res1.status_code == 200 and res1.json()["status"] == "FAIL",
            "1. GET /quality/inspections/{id} by UUID (200 OK)",
            f"Got status_code={res1.status_code}, status={res1.json().get('status')}"
        )

        # TEST 2: GET /quality/inspections/{code} by inspection code (200 OK)
        res2 = client.get(f"/api/v1/quality/inspections/{test_insp_code}", headers=headers)
        assert_test(
            res2.status_code == 200 and res2.json()["inspection_code"] == test_insp_code,
            "2. GET /quality/inspections/{code} by Inspection Code (200 OK)",
            f"Got code={res2.json().get('inspection_code')}"
        )

        # TEST 3: Verify detail payload fields
        data2 = res2.json()
        assert_test(
            data2["overall_severity"] == "CRITICAL" and data2["overall_score"] == 100.0 and len(data2["defects"]) == 1,
            "3. Verify detail payload fields (severity, score, defects)",
            f"Got severity={data2.get('overall_severity')}, score={data2.get('overall_score')}, defects={len(data2.get('defects', []))}"
        )

        # TEST 4: Invalid inspection ID -> HTTP 404 Not Found
        res4 = client.get("/api/v1/quality/inspections/nonexistent_code_999", headers=headers)
        assert_test(
            res4.status_code == 404 and "not found" in res4.json()["detail"].lower(),
            "4. GET /quality/inspections/nonexistent -> HTTP 404",
            f"Got status_code={res4.status_code}, detail={res4.json().get('detail')}"
        )

        # TEST 5: GET /quality/history returns real DB records
        res5 = client.get("/api/v1/quality/history", headers=headers)
        hist_items = res5.json()
        assert_test(
            res5.status_code == 200 and len(hist_items) > 0 and any(h["inspection_code"] == test_insp_code for h in hist_items),
            "5. GET /quality/history returns persistent records",
            f"Got status_code={res5.status_code}, count={len(hist_items)}"
        )

    finally:
        db.close()

    # TEST 6: Code Audit Check (Ensure inspectionData and initialHistory removed)
    result_page_path = os.path.join(PROJECT_ROOT, "frontend", "src", "pages", "quality", "InspectionResultPage.jsx")
    history_page_path = os.path.join(PROJECT_ROOT, "frontend", "src", "pages", "quality", "InspectionHistoryPage.jsx")

    with open(result_page_path, "r", encoding="utf-8") as f:
        res_content = f.read()
    with open(history_page_path, "r", encoding="utf-8") as f:
        hist_content = f.read()

    assert_test(
        "const inspectionData =" not in res_content,
        "6. InspectionResultPage.jsx clean (hardcoded inspectionData removed)",
        "Found 'const inspectionData =' in file"
    )

    assert_test(
        "const initialHistory =" not in hist_content,
        "7. InspectionHistoryPage.jsx clean (static initialHistory removed)",
        "Found 'const initialHistory =' in file"
    )

    print("=" * 60)
    print(f"PHASE 8.1.1 TEST RESULTS: {passed_count}/{total_count} PASSED")
    print("=" * 60)
    return passed_count == total_count

if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
