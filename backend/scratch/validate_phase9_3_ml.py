"""
Validation Script for Phase 9.3 — Real Image Inspection & End-to-End ML Validation
Evaluates 4 real MVTec-derived images against the frozen YOLOv8s model and Severity Engine,
tracing predictions from FastAPI through PostgreSQL, API responses, and latency benchmarks.
"""

import os
import sys
import time
import json

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from fastapi.testclient import TestClient
from app.main import app as fastapi_app
from app.database import SessionLocal
from app.models.roles import Role
from app.models.users import User
from app.utils.security import create_access_token
from app.models.inspections import Inspection
from app.models.inspection_images import InspectionImage
from app.models.ai_predictions import AIPrediction
from app.models.bounding_boxes import BoundingBox
from app.models.defect_diagnostics import DefectDiagnostic

def run_ml_validation():
    print("=" * 60)
    print("RUNNING PHASE 9.3 REAL IMAGE INSPECTION VALIDATION")
    print("=" * 60)

    db = SessionLocal()
    client = TestClient(fastapi_app)

    # Fetch QE token
    qe_role = db.query(Role).filter(Role.role_name == "QUALITY_ENGINEER").first()
    qe_user = db.query(User).filter(User.role_id == qe_role.id).first()
    token = create_access_token(subject=str(qe_user.id), role="QUALITY_ENGINEER")
    headers = {"Authorization": f"Bearer {token}"}

    test_samples = [
        {
            "test_name": "Test 1 — NORMAL Image",
            "file_name": "bottle_good_002.png",
            "category": "bottle",
            "product_code": "PRD-BOTTLE-GOOD",
            "expected_status": "PASS",
            "expected_class": "good"
        },
        {
            "test_name": "Test 2 — CLEAR DEFECTIVE Image",
            "file_name": "bottle_broken_large_000.png",
            "category": "bottle",
            "product_code": "PRD-BOTTLE-DEFECT",
            "expected_status": "FAIL",
            "expected_class": "bottle_broken_large"
        },
        {
            "test_name": "Test 3 — SMALL DEFECT Image",
            "file_name": "capsule_crack_000.png",
            "category": "capsule",
            "product_code": "PRD-CAPSULE-SMALL",
            "expected_status": "FAIL/MANUAL_REVIEW",
            "expected_class": "capsule_crack"
        },
        {
            "test_name": "Test 4 — DIFFERENT CATEGORY Image",
            "file_name": "cable_bent_wire_001.png",
            "category": "cable",
            "product_code": "PRD-CABLE-BENT",
            "expected_status": "FAIL",
            "expected_class": "cable_bent_wire"
        }
    ]

    results = []

    for sample in test_samples:
        img_path = os.path.join(PROJECT_ROOT, "dataset_yolo", "images", "test", sample["file_name"])
        if not os.path.exists(img_path):
            print(f"[ERROR] Image file not found: {img_path}")
            continue

        # Measure end-to-end API + inference latency
        t0 = time.perf_counter()
        with open(img_path, "rb") as f:
            response = client.post(
                "/api/v1/quality/analyze",
                files={"file": (sample["file_name"], f, "image/png")},
                data={
                    "product_code": sample["product_code"],
                    "product_category": sample["category"],
                    "production_line_code": "LINE-A1"
                },
                headers=headers
            )
        t1 = time.perf_counter()
        elapsed_ms = (t1 - t0) * 1000.0

        if response.status_code != 200:
            print(f"[FAIL] {sample['test_name']} failed API response: {response.status_code} | {response.text}")
            continue

        api_data = response.json()
        insp_code = api_data.get("inspection_code")

        # Query GET /quality/inspections/{id} detail endpoint to verify API consistency
        detail_res = client.get(f"/api/v1/quality/inspections/{insp_code}", headers=headers)
        detail_data = detail_res.json() if detail_res.status_code == 200 else {}

        # Query PostgreSQL database records
        db_insp = db.query(Inspection).filter(Inspection.inspection_code == insp_code).first()
        db_image = db.query(InspectionImage).filter(InspectionImage.inspection_id == db_insp.id).first() if db_insp else None
        db_pred = db.query(AIPrediction).filter(AIPrediction.inspection_image_id == db_image.id).all() if db_image else []
        db_bbox = db.query(BoundingBox).filter(BoundingBox.inspection_image_id == db_image.id).all() if db_image else []
        db_diag = db.query(DefectDiagnostic).filter(DefectDiagnostic.inspection_id == db_insp.id).first() if db_insp else None

        ai_pred = api_data.get("ai_prediction", {})
        status = api_data.get("status", "UNKNOWN")
        overall_severity = ai_pred.get("severity", "NONE")
        overall_score = ai_pred.get("overall_score", 0.0)
        primary_defect = ai_pred.get("defect_type", "No Defect (Passed)")
        confidence = ai_pred.get("confidence_percentage", 0.0)

        bboxes = []
        defect_details = api_data.get("defect_details", {})
        if defect_details and "bounding_box" in defect_details and defect_details["bounding_box"].get("width", 0) > 0:
            bboxes.append(defect_details["bounding_box"])

        # Check qualitative accuracy
        correct = False
        result_type = "CORRECT"
        if sample["expected_class"] == "good":
            if status == "PASS" and primary_defect == "No Defect (Passed)":
                correct = True
            else:
                result_type = "FALSE POSITIVE"
        else:
            if status in ["FAIL", "MANUAL_REVIEW"]:
                if primary_defect.lower().replace(" ", "_") == sample["expected_class"].lower():
                    correct = True
                    result_type = "CORRECT"
                else:
                    result_type = "MISCLASSIFICATION"
            else:
                result_type = "FALSE NEGATIVE"

        res_entry = {
            "test_name": sample["test_name"],
            "file_name": sample["file_name"],
            "category": sample["category"],
            "expected_class": sample["expected_class"],
            "predicted_class": primary_defect,
            "confidence_pct": confidence,
            "overall_severity": overall_severity,
            "overall_score": overall_score,
            "decision_status": status,
            "qualitative_result": result_type,
            "correct": correct,
            "latency_ms": round(elapsed_ms, 2),
            "inspection_code": insp_code,
            "inspection_id": str(db_insp.id) if db_insp else None,
            "bounding_boxes": bboxes,
            "db_verification": {
                "inspection_found": db_insp is not None,
                "image_found": db_image is not None,
                "predictions_count": len(db_pred),
                "bboxes_count": len(db_bbox),
                "diagnostic_found": db_diag is not None,
                "diagnostic_score": float(db_diag.severity_score) if db_diag and db_diag.severity_score is not None else 0.0
            },
            "api_consistency": {
                "analyze_status": status,
                "detail_status": detail_data.get("status"),
                "status_match": status == detail_data.get("status"),
                "score_match": overall_score == detail_data.get("overall_score")
            }
        }

        results.append(res_entry)

    db.close()
    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    run_ml_validation()
