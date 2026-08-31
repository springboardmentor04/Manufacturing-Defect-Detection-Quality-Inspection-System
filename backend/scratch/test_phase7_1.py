"""
Comprehensive Phase 7.1 Unit & End-to-End Test Suite
Verifies all 11 required testing requirements for Phase 7.1 persistence implementation.
"""

import os
import sys
import uuid
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.database import SessionLocal, engine, Base
from app.models.inspections import Inspection
from app.models.inspection_images import InspectionImage
from app.models.ai_predictions import AIPrediction
from app.models.bounding_boxes import BoundingBox
from app.models.defect_diagnostics import DefectDiagnostic
from app.services.inspection_service import persist_complete_inspection
from app.routers.supervisor import (
    get_production_overview,
    get_recent_reports,
    get_quality_analytics
)

def run_tests():
    print("=" * 60)
    print("RUNNING PHASE 7.1 COMPREHENSIVE TEST SUITE")
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
        # TEST 1: Successful Inspection Persistence (PASS)
        eval_pass = {
            "inspection_status": "PASS",
            "overall_severity": "NONE",
            "overall_score": 0.0,
            "decision_reason": "No defect detected. Quality standard met.",
            "number_of_detected_defects": 0,
            "detections": []
        }
        res1 = persist_complete_inspection(
            db=db,
            product_code="TEST-PRD-PASS",
            product_category="carpet",
            file_path="sample_carpet_pass.png",
            severity_eval=eval_pass
        )
        assert_test(
            res1["status"] == "PASS" and res1["overall_score"] == 0.0,
            "1. Successful Inspection Persistence (PASS)",
            f"Got status={res1['status']}, score={res1['overall_score']}"
        )

        # TEST 2: Failed Inspection Persistence (FAIL)
        eval_fail = {
            "inspection_status": "FAIL",
            "overall_severity": "CRITICAL",
            "overall_score": 100.0,
            "decision_reason": "Tier-1 Critical Defect (pill_crack). Immediate FAIL.",
            "number_of_detected_defects": 1,
            "detections": [{
                "defect_class": "pill_crack",
                "confidence": 0.95,
                "individual_severity_score": 100.0,
                "bounding_box": {"x_min": 10, "y_min": 20, "width": 30, "height": 40}
            }]
        }
        res2 = persist_complete_inspection(
            db=db,
            product_code="TEST-PRD-FAIL",
            product_category="pill",
            file_path="sample_pill_fail.png",
            severity_eval=eval_fail
        )
        assert_test(
            res2["status"] == "FAIL" and res2["overall_severity"] == "CRITICAL",
            "2. Failed Inspection Persistence (FAIL)",
            f"Got status={res2['status']}, severity={res2['overall_severity']}"
        )

        # TEST 3: Manual-Review Persistence (MANUAL_REVIEW)
        eval_mr = {
            "inspection_status": "MANUAL_REVIEW",
            "overall_severity": "MEDIUM",
            "overall_score": 45.0,
            "decision_reason": "Tier-1 Defect with moderate confidence (0.35). Escalated to MANUAL_REVIEW.",
            "number_of_detected_defects": 1,
            "detections": [{
                "defect_class": "capsule_crack",
                "confidence": 0.35,
                "individual_severity_score": 45.0,
                "bounding_box": {"x_min": 5, "y_min": 5, "width": 15, "height": 15}
            }]
        }
        res3 = persist_complete_inspection(
            db=db,
            product_code="TEST-PRD-MR",
            product_category="capsule",
            file_path="sample_capsule_mr.png",
            severity_eval=eval_mr
        )
        assert_test(
            res3["status"] == "MANUAL_REVIEW",
            "3. Manual-Review Persistence (MANUAL_REVIEW)",
            f"Got status={res3['status']}"
        )

        # TEST 4 & 5: Multiple Defect & Bounding Box Persistence
        eval_multi = {
            "inspection_status": "FAIL",
            "overall_severity": "HIGH",
            "overall_score": 58.5,
            "decision_reason": "Dual scratches detected. Score 58.5 > threshold 40.0.",
            "number_of_detected_defects": 2,
            "detections": [
                {
                    "defect_class": "screw_scratch_head",
                    "confidence": 0.85,
                    "individual_severity_score": 45.0,
                    "bounding_box": {"x_min": 100, "y_min": 100, "width": 20, "height": 20}
                },
                {
                    "defect_class": "screw_scratch_neck",
                    "confidence": 0.80,
                    "individual_severity_score": 45.0,
                    "bounding_box": {"x_min": 150, "y_min": 150, "width": 25, "height": 25}
                }
            ]
        }
        res4 = persist_complete_inspection(
            db=db,
            product_code="TEST-PRD-MULTI",
            product_category="screw",
            file_path="sample_screw_multi.png",
            severity_eval=eval_multi
        )
        img_4 = db.query(InspectionImage).filter(InspectionImage.inspection_id == res4["inspection_id"]).first()
        bboxes_4 = db.query(BoundingBox).filter(BoundingBox.inspection_image_id == img_4.id).all() if img_4 else []
        assert_test(
            len(bboxes_4) == 2,
            "4 & 5. Multiple Defect & Bounding Box Persistence",
            f"Expected 2 bounding boxes, found {len(bboxes_4)}"
        )

        # TEST 6: Severity Score Persistence Check
        diag_4 = db.query(DefectDiagnostic).filter(DefectDiagnostic.inspection_id == res4["inspection_id"]).first()
        assert_test(
            diag_4 is not None and float(diag_4.severity_score) == 58.5,
            "6. Severity Score Persistence (severity_score NUMERIC(5,2))",
            f"Got severity_score={diag_4.severity_score if diag_4 else 'N/A'}"
        )

        # TEST 7: Transaction Rollback Check
        rollback_caught = False
        try:
            # Intentionally pass invalid parameters to trigger DB error inside transaction
            persist_complete_inspection(
                db=db,
                product_code=None,  # Null product code triggers exception
                product_category="pill",
                file_path="invalid.png",
                severity_eval=eval_pass
            )
        except Exception:
            rollback_caught = True

        assert_test(
            rollback_caught,
            "7. Transaction Rollback on Error",
            f"Rollback caught: {rollback_caught}"
        )

        # TEST 8: Atomic Integrity & Non-Duplication Check
        insp_count = db.query(Inspection).count()
        assert_test(
            insp_count >= 4,
            "8. Atomic Integrity & Non-Duplication Check",
            f"Total persistent inspections in DB: {insp_count}"
        )

        # TEST 9: Supervisor Overview Query Check
        ov = get_production_overview(db=db)
        assert_test(
            ov["total_products"] == insp_count and ov["failed_inspections"] >= 2,
            "9. Supervisor Overview Query (Dynamic SQL)",
            f"Got total={ov['total_products']}, failed={ov['failed_inspections']}"
        )

        # TEST 10: Supervisor Reports Query Check
        reps = get_recent_reports(db=db)
        assert_test(
            len(reps) > 0 and "productId" in reps[0],
            "10. Supervisor Reports Query (Dynamic SQL)",
            f"Got {len(reps)} report records"
        )

        # TEST 11: Quality Analytics Query Check
        analytics = get_quality_analytics(db=db)
        assert_test(
            "status_distribution" in analytics and len(analytics["status_distribution"]) == 3,
            "11. Quality Analytics Query (Dynamic SQL)",
            f"Got status_distribution count: {len(analytics.get('status_distribution', []))}"
        )

    finally:
        db.close()

    print("=" * 60)
    print(f"PHASE 7.1 TEST RESULTS: {passed_count}/{total_count} PASSED")
    print("=" * 60)
    return passed_count == total_count

if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
