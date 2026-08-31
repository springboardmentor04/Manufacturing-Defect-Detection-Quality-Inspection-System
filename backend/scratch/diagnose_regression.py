"""
Diagnostic Script for Phase 9 Regression
Empirically diagnoses Quality Engineer Analyze -> Inspection Result flow and Supervisor Dashboard endpoints.
Inspects database insertions, API URLs, response payloads, status codes, and exception tracebacks.
"""

import os
import sys
import json
import traceback

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from fastapi.testclient import TestClient
from app.main import app as fastapi_app
from app.database import SessionLocal
from app.models.users import User
from app.models.roles import Role
from app.models.inspections import Inspection
from app.utils.security import create_access_token

def diagnose_regression():
    print("=" * 60)
    print("RUNNING PHASE 9 REGRESSION DIAGNOSTIC SUITE")
    print("=" * 60)

    db = SessionLocal()
    client = TestClient(fastapi_app, raise_server_exceptions=False)
    report = {}

    # STEP 1: Service & DB Status
    db_insp_count_before = db.query(Inspection).count()
    report["step1_services"] = {
        "backend_running": True,
        "database_connected": True,
        "initial_inspections_count": db_insp_count_before
    }

    # STEP 2 & 4: Quality Engineer Login & Analyze Workflow
    qe_role = db.query(Role).filter(Role.role_name == "QUALITY_ENGINEER").first()
    qe_user = db.query(User).filter(User.role_id == qe_role.id).first()
    qe_token = create_access_token(subject=str(qe_user.id), role="QUALITY_ENGINEER")
    qe_headers = {"Authorization": f"Bearer {qe_token}"}

    # Test Image File Upload: POST /api/v1/quality/analyze
    test_img_path = os.path.join(PROJECT_ROOT, "dataset_yolo", "images", "test", "bottle_broken_large_000.png")
    with open(test_img_path, "rb") as f:
        img_bytes = f.read()

    res_analyze = client.post(
        "/api/v1/quality/analyze",
        files={"file": ("bottle_broken_large_000.png", img_bytes, "image/png")},
        data={"product_code": "PRD-BOTTLE-01", "product_category": "bottle", "production_line_code": "LINE-A1"},
        headers=qe_headers
    )

    report["qe_analyze_endpoint"] = {
        "request_url": "/api/v1/quality/analyze",
        "status_code": res_analyze.status_code,
        "response_json": res_analyze.json() if res_analyze.status_code == 200 else res_analyze.text
    }

    analyze_data = res_analyze.json() if res_analyze.status_code == 200 else {}
    returned_id = analyze_data.get("id") or analyze_data.get("inspection_id")
    returned_code = analyze_data.get("inspection_code")

    # STEP 6: DB Record Check after analyze
    db.expire_all()
    db_insp_count_after = db.query(Inspection).count()
    new_insp_db = db.query(Inspection).filter(Inspection.id == returned_id).first() if returned_id else None

    report["qe_database_check"] = {
        "inspections_count_before": db_insp_count_before,
        "inspections_count_after": db_insp_count_after,
        "new_record_created_in_db": new_insp_db is not None,
        "db_record_id": str(new_insp_db.id) if new_insp_db else None,
        "db_record_code": new_insp_db.inspection_code if new_insp_db else None
    }

    # STEP 4 & 5: Test Inspection Result GET Endpoints
    res_get_uuid = client.get(f"/api/v1/quality/inspections/{returned_id}", headers=qe_headers) if returned_id else None
    res_get_code = client.get(f"/api/v1/quality/inspections/{returned_code}", headers=qe_headers) if returned_code else None

    report["qe_result_endpoint_tests"] = {
        "get_by_uuid": {
            "request_url": f"/api/v1/quality/inspections/{returned_id}",
            "status_code": res_get_uuid.status_code if res_get_uuid else None,
            "response": res_get_uuid.json() if res_get_uuid and res_get_uuid.status_code in [200, 404, 422] else (res_get_uuid.text if res_get_uuid else None)
        },
        "get_by_code": {
            "request_url": f"/api/v1/quality/inspections/{returned_code}",
            "status_code": res_get_code.status_code if res_get_code else None,
            "response": res_get_code.json() if res_get_code and res_get_code.status_code in [200, 404, 422] else (res_get_code.text if res_get_code else None)
        }
    }

    # STEP 7: Test Pre-existing Valid Inspection Record
    existing_insp = db.query(Inspection).order_by(Inspection.inspected_at.asc()).first()
    if existing_insp:
        res_existing_uuid = client.get(f"/api/v1/quality/inspections/{existing_insp.id}", headers=qe_headers)
        res_existing_code = client.get(f"/api/v1/quality/inspections/{existing_insp.inspection_code}", headers=qe_headers)
        report["existing_inspection_test"] = {
            "existing_id": str(existing_insp.id),
            "existing_code": existing_insp.inspection_code,
            "get_existing_by_uuid_status": res_existing_uuid.status_code,
            "get_existing_by_code_status": res_existing_code.status_code,
            "uuid_response": res_existing_uuid.json() if res_existing_uuid.status_code == 200 else res_existing_uuid.text,
            "code_response": res_existing_code.json() if res_existing_code.status_code == 200 else res_existing_code.text
        }

    # STEP 8 & 9: Supervisor Diagnostics
    sup_role = db.query(Role).filter(Role.role_name == "FACTORY_SUPERVISOR").first()
    sup_user = db.query(User).filter(User.role_id == sup_role.id).first()
    sup_token = create_access_token(subject=str(sup_user.id), role="FACTORY_SUPERVISOR")
    sup_headers = {"Authorization": f"Bearer {sup_token}"}

    sup_endpoints = [
        "/api/v1/supervisor/overview",
        "/api/v1/supervisor/production-lines",
        "/api/v1/supervisor/defect-trends",
        "/api/v1/supervisor/analytics",
        "/api/v1/supervisor/reports"
    ]

    sup_results = {}
    for ep in sup_endpoints:
        res_ep = client.get(ep, headers=sup_headers)
        sup_results[ep] = {
            "status_code": res_ep.status_code,
            "response": res_ep.json() if res_ep.status_code in [200, 400, 404, 422, 500] else res_ep.text
        }

    report["supervisor_endpoints_test"] = sup_results

    db.close()
    print(json.dumps(report, indent=2))
    return report

if __name__ == "__main__":
    diagnose_regression()
