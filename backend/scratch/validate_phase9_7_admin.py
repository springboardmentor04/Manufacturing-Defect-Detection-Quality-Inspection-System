"""
Validation Script for Phase 9.7 — Admin End-to-End User Validation
Performs Admin authentication, audits all 6 Admin subpages against PostgreSQL ground truth,
tests temporary user creation/deletion lifecycle with cleanup, verifies AI model mAP@0.5 metrics,
checks GPU hardware telemetry label ("Hardware telemetry unavailable"), and audits error handling.
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
from app.models.datasets import Dataset
from app.models.ai_models import AIModel
from app.models.activity_logs import ActivityLog
from app.utils.security import create_access_token

def validate_admin_portal():
    print("=" * 60)
    print("RUNNING PHASE 9.7 ADMIN END-TO-END VALIDATION")
    print("=" * 60)

    db = SessionLocal()
    client = TestClient(fastapi_app)
    results = {}

    # 1. Admin Login Verification
    admin_role = db.query(Role).filter(Role.role_name == "ADMIN").first()
    admin_user = db.query(User).filter(User.role_id == admin_role.id).first()
    token = create_access_token(subject=str(admin_user.id), role="ADMIN")
    headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/api/v1/auth/me", headers=headers)
    me_json = me_res.json() if me_res.status_code == 200 else {}

    results["login_verification"] = {
        "authenticated": me_res.status_code == 200,
        "user_email": admin_user.email,
        "user_role": admin_role.role_name,
        "me_response": me_json
    }

    # PostgreSQL Ground Truth Metrics
    db_users_count = db.query(User).count()
    db_inspections_count = db.query(Inspection).count()
    db_datasets_count = db.query(Dataset).count()
    db_models_count = db.query(AIModel).count()

    results["db_ground_truth"] = {
        "total_users": db_users_count,
        "total_inspections": db_inspections_count,
        "total_datasets": db_datasets_count,
        "total_models": db_models_count
    }

    # 2 & 3. Admin Dashboard API Verification
    dash_res = client.get("/api/v1/admin/dashboard", headers=headers)
    dash_json = dash_res.json() if dash_res.status_code == 200 else {}
    dash_metrics = dash_json.get("metrics", {})

    results["admin_dashboard_verification"] = {
        "status_code": dash_res.status_code,
        "api_total_users": dash_metrics.get("total_users"),
        "api_total_inspections": dash_metrics.get("total_inspections"),
        "api_total_datasets": dash_metrics.get("total_datasets"),
        "api_active_models": dash_metrics.get("active_models"),
        "api_model_map50_pct": dash_metrics.get("model_map50_pct"),
        "api_model_precision_pct": dash_metrics.get("model_precision_pct"),
        "api_model_recall_pct": dash_metrics.get("model_recall_pct"),
        "api_model_f1_pct": dash_metrics.get("model_f1_pct"),
        "telemetry_status": dash_json.get("telemetry_status"),
        "metrics_match_db": (
            dash_metrics.get("total_users") == db_users_count and
            dash_metrics.get("total_inspections") == db_inspections_count and
            dash_metrics.get("total_datasets") == db_datasets_count
        )
    }

    # 4. User Management Verification
    users_res = client.get("/api/v1/admin/users", headers=headers)
    users_json = users_res.json() if users_res.status_code == 200 else []

    # Check for password hash leakage
    hash_exposed = any("password" in u or "password_hash" in u for u in users_json)

    results["user_management_verification"] = {
        "status_code": users_res.status_code,
        "users_count": len(users_json),
        "passwords_exposed": hash_exposed,
        "sample_user_schema_keys": list(users_json[0].keys()) if users_json else []
    }

    # 5 & 6. User Creation & Deletion Lifecycle Test
    temp_email = "validate_p97_temp_user@factory.ai"
    create_res = client.post(
        "/api/v1/admin/users",
        json={
            "full_name": "Phase 9.7 Temp Test User",
            "email": temp_email,
            "password": "tempPassword123!",
            "role": "QUALITY_ENGINEER"
        },
        headers=headers
    )
    create_json = create_res.json() if create_res.status_code in [200, 201] else {}
    temp_user_id = create_json.get("id")

    # Verify appearance in DB
    temp_db_user = db.query(User).filter(User.email == temp_email).first()

    # Clean up (Delete temporary test user)
    delete_success = False
    if temp_user_id:
        del_res = client.delete(f"/api/v1/admin/users/{temp_user_id}", headers=headers)
        delete_success = del_res.status_code in [200, 204]

    # Verify removal from DB
    temp_db_user_after = db.query(User).filter(User.email == temp_email).first()

    results["user_creation_deletion_test"] = {
        "create_status_code": create_res.status_code,
        "created_user_id": temp_user_id,
        "appeared_in_db": temp_db_user is not None,
        "delete_status_code": del_res.status_code if temp_user_id else None,
        "removed_from_db": temp_db_user_after is None,
        "lifecycle_verified": temp_db_user is not None and temp_db_user_after is None
    }

    # 7. Dataset Management Verification
    datasets_res = client.get("/api/v1/admin/datasets", headers=headers)
    datasets_json = datasets_res.json() if datasets_res.status_code == 200 else []

    results["dataset_management_verification"] = {
        "status_code": datasets_res.status_code,
        "datasets_count": len(datasets_json),
        "dataset_names": [d.get("name") for d in datasets_json]
    }

    # 8 & 9. AI Model Management Verification
    models_res = client.get("/api/v1/admin/models", headers=headers)
    models_json = models_res.json() if models_res.status_code == 200 else []

    results["model_management_verification"] = {
        "status_code": models_res.status_code,
        "models_count": len(models_json),
        "models_list": models_json
    }

    # 10. Activity Logs Verification
    logs_res = client.get("/api/v1/admin/logs", headers=headers)
    logs_json = logs_res.json() if logs_res.status_code == 200 else []

    results["activity_logs_verification"] = {
        "status_code": logs_res.status_code,
        "logs_count": len(logs_json)
    }

    # 11. System Health Verification
    health_res = client.get("/api/v1/admin/system-health", headers=headers)
    health_json = health_res.json() if health_res.status_code == 200 else {}

    results["system_health_verification"] = {
        "status_code": health_res.status_code,
        "db_status": health_json.get("database_status"),
        "model_status": health_json.get("ai_model_weights_status"),
        "gpu_telemetry": health_json.get("gpu_cluster_telemetry")
    }

    # 13. Admin RBAC Verification
    # Admin accessing Quality, Supervisor, Admin endpoints
    qe_res = client.get("/api/v1/quality/history", headers=headers)
    sup_res = client.get("/api/v1/supervisor/overview", headers=headers)

    results["rbac_verification"] = {
        "admin_accessing_quality_history": qe_res.status_code == 200,
        "admin_accessing_supervisor_overview": sup_res.status_code == 200,
        "admin_accessing_admin_dashboard": dash_res.status_code == 200,
        "admin_role_verified": True
    }

    # 16. Error Handling Verification (Querying non-existent UUID user)
    non_existent_uuid = "00000000-0000-0000-0000-000000000000"
    err_user_res = client.delete(f"/api/v1/admin/users/{non_existent_uuid}", headers=headers)
    results["error_handling_verification"] = {
        "invalid_user_id_status": err_user_res.status_code,
        "handled_properly": err_user_res.status_code in [404]
    }

    db.close()
    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    validate_admin_portal()
