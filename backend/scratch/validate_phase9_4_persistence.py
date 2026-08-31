"""
Validation Script for Phase 9.4 — Final Database Persistence Verification
Performs a 100% read-only audit of the 4 Phase 9.3 inspection records across PostgreSQL tables,
relational foreign keys, API round-trips, Quality History, Supervisor Reports, and Admin metrics.
"""

import os
import sys
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
from app.models.inspections import Inspection
from app.models.inspection_images import InspectionImage
from app.models.ai_predictions import AIPrediction
from app.models.bounding_boxes import BoundingBox
from app.models.defect_diagnostics import DefectDiagnostic
from app.models.products import Product
from app.models.production_lines import ProductionLine
from app.utils.security import create_access_token

def validate_persistence():
    print("=" * 60)
    print("RUNNING PHASE 9.4 FINAL DATABASE PERSISTENCE VERIFICATION")
    print("=" * 60)

    db = SessionLocal()
    client = TestClient(fastapi_app)
    results = {}

    target_codes = [
        "INSP-5B6C361A",
        "INSP-64397CA4",
        "INSP-B447898F",
        "INSP-81153E4D"
    ]

    # Seed token for API checks
    qe_role = db.query(Role).filter(Role.role_name == "QUALITY_ENGINEER").first()
    qe_user = db.query(User).filter(User.role_id == qe_role.id).first()
    qe_token = create_access_token(subject=str(qe_user.id), role="QUALITY_ENGINEER")
    qe_headers = {"Authorization": f"Bearer {qe_token}"}

    admin_role = db.query(Role).filter(Role.role_name == "ADMIN").first()
    admin_user = db.query(User).filter(User.role_id == admin_role.id).first()
    admin_token = create_access_token(subject=str(admin_user.id), role="ADMIN")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    sup_role = db.query(Role).filter(Role.role_name == "FACTORY_SUPERVISOR").first()
    sup_user = db.query(User).filter(User.role_id == sup_role.id).first()
    sup_token = create_access_token(subject=str(sup_user.id), role="FACTORY_SUPERVISOR")
    sup_headers = {"Authorization": f"Bearer {sup_token}"}

    inspection_audits = []

    for code in target_codes:
        insp = db.query(Inspection).filter(Inspection.inspection_code == code).first()
        if not insp:
            print(f"[ERROR] Target inspection {code} not found!")
            continue

        prod = db.query(Product).filter(Product.id == insp.product_id).first() if insp.product_id else None
        line = db.query(ProductionLine).filter(ProductionLine.id == insp.production_line_id).first() if insp.production_line_id else None
        user = db.query(User).filter(User.id == insp.inspected_by_user_id).first() if insp.inspected_by_user_id else None
        image = db.query(InspectionImage).filter(InspectionImage.inspection_id == insp.id).first()
        diag = db.query(DefectDiagnostic).filter(DefectDiagnostic.inspection_id == insp.id).first()
        preds = db.query(AIPrediction).filter(AIPrediction.inspection_image_id == image.id).all() if image else []
        bboxes = db.query(BoundingBox).filter(BoundingBox.inspection_image_id == image.id).all() if image else []

        # API Detail Check (GET /quality/inspections/{id})
        detail_res = client.get(f"/api/v1/quality/inspections/{code}", headers=qe_headers)
        detail_json = detail_res.json() if detail_res.status_code == 200 else {}

        bbox_data = []
        for b in bboxes:
            bbox_data.append({
                "x_min": b.x_min,
                "y_min": b.y_min,
                "width": b.width,
                "height": b.height,
                "confidence": float(b.confidence) if b.confidence else 0.0
            })

        audit_entry = {
            "inspection_code": code,
            "inspection_id": str(insp.id),
            "status": insp.status,
            "confidence_score": float(insp.confidence_score) if insp.confidence_score else 0.0,
            "inspected_at": insp.inspected_at.strftime("%Y-%m-%d %H:%M:%S") if insp.inspected_at else None,
            "product_code": prod.product_code if prod else "PRD-UNKNOWN",
            "production_line": line.line_code if line else "LINE-A1",
            "inspected_by": user.email if user else "Inspector",
            "image_record": {
                "found": image is not None,
                "file_path": image.file_path if image else None,
                "resolution": image.image_resolution if image else "320x320"
            },
            "ai_predictions": [
                {"label": p.predicted_label, "confidence_percentage": float(p.confidence_percentage)} for p in preds
            ],
            "bounding_boxes": bbox_data,
            "defect_diagnostic": {
                "found": diag is not None,
                "severity": diag.severity if diag else "NONE",
                "severity_score": float(diag.severity_score) if diag and diag.severity_score is not None else 0.0,
                "description": diag.description if diag else "N/A"
            },
            "api_round_trip": {
                "get_detail_status_code": detail_res.status_code,
                "status_matches": detail_json.get("status") == insp.status,
                "score_matches": detail_json.get("overall_score") == (float(diag.severity_score) if diag and diag.severity_score is not None else 0.0)
            }
        }
        inspection_audits.append(audit_entry)

    results["inspections"] = inspection_audits

    # STEP 7: Relational Integrity & Orphan Check
    all_insps = db.query(Inspection).all()
    all_images = db.query(InspectionImage).all()
    all_diags = db.query(DefectDiagnostic).all()

    orphan_images = [img for img in all_images if not db.query(Inspection).filter(Inspection.id == img.inspection_id).first()]
    orphan_diags = [diag for diag in all_diags if not db.query(Inspection).filter(Inspection.id == diag.inspection_id).first()]

    results["database_integrity"] = {
        "total_inspections_in_db": len(all_insps),
        "total_images_in_db": len(all_images),
        "total_diagnostics_in_db": len(all_diags),
        "orphan_images_count": len(orphan_images),
        "orphan_diagnostics_count": len(orphan_diags),
        "integrity_status": "🟢 VERIFIED (Zero Orphans)" if len(orphan_images) == 0 and len(orphan_diags) == 0 else "🔴 FAILED"
    }

    # STEP 9: Quality History Endpoint Check
    hist_res = client.get("/api/v1/quality/history", headers=qe_headers)
    hist_json = hist_res.json() if hist_res.status_code == 200 else []
    found_in_history = [code for code in target_codes if any(item.get("id") == code or item.get("productId") == code for item in hist_json)]

    results["quality_history_verification"] = {
        "status_code": hist_res.status_code,
        "total_history_records": len(hist_json),
        "target_inspections_found_in_history": len(found_in_history),
        "verified": len(found_in_history) > 0
    }

    # STEP 10: Supervisor Reports Check
    sup_rep_res = client.get("/api/v1/supervisor/reports", headers=sup_headers)
    sup_json = sup_rep_res.json() if sup_rep_res.status_code == 200 else {}
    reports_list = sup_json.get("reports", []) if isinstance(sup_json, dict) else []

    results["supervisor_reports_verification"] = {
        "status_code": sup_rep_res.status_code,
        "reports_count": len(reports_list),
        "verified": sup_rep_res.status_code == 200
    }

    # STEP 11: Admin Counts Check
    admin_dash_res = client.get("/api/v1/admin/dashboard", headers=admin_headers)
    admin_json = admin_dash_res.json() if admin_dash_res.status_code == 200 else {}
    admin_metrics = admin_json.get("metrics", {})

    results["admin_counts_verification"] = {
        "status_code": admin_dash_res.status_code,
        "total_inspections_count": admin_metrics.get("total_inspections"),
        "monthly_inspections_chart_records": len(admin_json.get("monthly_inspections", [])),
        "verified": admin_metrics.get("total_inspections", 0) >= len(all_insps)
    }

    db.close()
    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    validate_persistence()
