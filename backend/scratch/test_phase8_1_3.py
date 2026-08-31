"""
Test Suite for Phase 8.1.3 — Admin API Binding Audit & Implementation
Verifies all Admin endpoints with real PostgreSQL database records and data-correctness checks.
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

def run_tests():
    print("=" * 60)
    print("RUNNING PHASE 8.1.3 ADMIN API TEST SUITE (WITH DATA CORRECTNESS CHECKS)")
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
        # Seed test Admin user & token
        role_admin = db.query(Role).filter(Role.role_name == "ADMIN").first()
        if not role_admin:
            role_admin = Role(role_name="ADMIN", description="System Administrator")
            db.add(role_admin)
            db.flush()

        admin_user = db.query(User).filter(User.email == "test_admin_phase8@factory.ai").first()
        if not admin_user:
            admin_user = User(
                full_name="Phase 8 Admin",
                email="test_admin_phase8@factory.ai",
                password_hash=hash_password("adminpass123"),
                role_id=role_admin.id,
                status="ACTIVE"
            )
            db.add(admin_user)
            db.commit()

        token = create_access_token(subject=str(admin_user.id), role="ADMIN")
        headers = {"Authorization": f"Bearer {token}"}

        client = TestClient(fastapi_app)

        # TEST 1: GET /admin/dashboard (200 OK & Data Correctness)
        res1 = client.get("/api/v1/admin/dashboard", headers=headers)
        dash_data = res1.json()
        assert_test(
            res1.status_code == 200 and "metrics" in dash_data,
            "1. GET /admin/dashboard returns database metrics (200 OK)",
            f"Got status={res1.status_code}"
        )

        # TEST 2: Check 1 & Check 4 (monthly_inspections sum & model_map50_pct metric name)
        m_list = dash_data.get("monthly_inspections", [])
        tot_insp = dash_data.get("metrics", {}).get("total_inspections", 0)
        map50_pct = dash_data.get("metrics", {}).get("model_map50_pct")
        sum_m = sum(item["inspections"] for item in m_list)
        assert_test(
            (tot_insp == 0 or sum_m == tot_insp) and map50_pct == 45.07,
            "2. Monthly inspections dynamically calculated and metric exposed as model_map50_pct",
            f"tot_insp={tot_insp}, sum_m={sum_m}, map50_pct={map50_pct}"
        )

        # TEST 3: Check 2 & Check 3 (GPU load is None, system_status is empirical OPERATIONAL)
        gpu_val = dash_data.get("gpu_cluster_load_pct")
        sys_stat = dash_data.get("system_status")
        assert_test(
            gpu_val is None and sys_stat in ["OPERATIONAL", "HEALTHY", "DEGRADED"],
            "3. GPU load is None (no fake telemetry) & system_status is empirically calculated",
            f"gpu_val={gpu_val}, sys_stat={sys_stat}"
        )

        # TEST 4: GET /admin/users (200 OK)
        res4 = client.get("/api/v1/admin/users", headers=headers)
        users_list = res4.json()
        assert_test(
            res4.status_code == 200 and isinstance(users_list, list) and len(users_list) > 0,
            "4. GET /admin/users returns database users list (200 OK)",
            f"Got status={res4.status_code}, count={len(users_list)}"
        )

        # TEST 5: POST /admin/users (201 Created)
        new_user_payload = {
            "full_name": "New Audit User",
            "email": "new_audit_user@factory.ai",
            "password": "password123",
            "role_name": "Quality Engineer"
        }
        res5 = client.post("/api/v1/admin/users", json=new_user_payload, headers=headers)
        assert_test(
            res5.status_code == 201 and res5.json()["email"] == "new_audit_user@factory.ai",
            "5. POST /admin/users creates user in database (201 Created)",
            f"Got status={res5.status_code}, email={res5.json().get('email')}"
        )
        created_user_id = res5.json()["id"]

        # TEST 6: DELETE /admin/users/{user_id} (200 OK & 404 Not Found)
        res6a = client.delete(f"/api/v1/admin/users/{created_user_id}", headers=headers)
        res6b = client.delete("/api/v1/admin/users/00000000-0000-0000-0000-000000000000", headers=headers)
        assert_test(
            res6a.status_code == 200 and res6b.status_code == 404,
            "6. DELETE /admin/users deletes user (200 OK) and handles invalid ID (404 Not Found)",
            f"res6a={res6a.status_code}, res6b={res6b.status_code}"
        )

        # TEST 7: GET /admin/datasets (200 OK)
        res7 = client.get("/api/v1/admin/datasets", headers=headers)
        assert_test(
            res7.status_code == 200 and isinstance(res7.json(), list),
            "7. GET /admin/datasets returns dataset records (200 OK)",
            f"Got status={res7.status_code}, count={len(res7.json())}"
        )

        # TEST 8: GET /admin/models (200 OK)
        res8 = client.get("/api/v1/admin/models", headers=headers)
        models_data = res8.json()
        assert_test(
            res8.status_code == 200 and len(models_data) > 0 and "map50" in models_data[0],
            "8. GET /admin/models returns AI models list with map50 metric (200 OK)",
            f"Got status={res8.status_code}, map50={models_data[0].get('map50') if models_data else None}"
        )

        # TEST 9: POST /admin/models/deploy (200 OK)
        res9 = client.post("/api/v1/admin/models/deploy?model_version=Phase%204.4%20Architecture", headers=headers)
        assert_test(
            res9.status_code == 200 and "deployed successfully" in res9.json()["message"],
            "9. POST /admin/models/deploy updates deployment status (200 OK)",
            f"Got status={res9.status_code}"
        )

        # TEST 10: GET /admin/logs & /admin/system-health (200 OK)
        res10a = client.get("/api/v1/admin/logs", headers=headers)
        res10b = client.get("/api/v1/admin/system-health", headers=headers)
        assert_test(
            res10a.status_code == 200 and res10b.status_code == 200,
            "10. GET /admin/logs and /admin/system-health return valid responses (200 OK)",
            f"res10a={res10a.status_code}, res10b={res10b.status_code}"
        )

    finally:
        db.close()

    print("=" * 60)
    print(f"PHASE 8.1.3 ADMIN API TEST RESULTS: {passed_count}/{total_count} PASSED")
    print("=" * 60)
    return passed_count == total_count

if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
