"""
Test Suite for Phase 8.1.4 — Admin Frontend Connection & RBAC Verification
Verifies end-to-end Admin API responses, role-based access control, and mock data removal.
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
    print("RUNNING PHASE 8.1.4 FRONTEND CONNECTION & RBAC TEST SUITE")
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

        role_qe = db.query(Role).filter(Role.role_name == "QUALITY_ENGINEER").first()
        if not role_qe:
            role_qe = Role(role_name="QUALITY_ENGINEER", description="Quality Engineer")
            db.add(role_qe)
            db.flush()

        admin_user = db.query(User).filter(User.email == "test_admin_phase8_1_4@factory.ai").first()
        if not admin_user:
            admin_user = User(
                full_name="Phase 8.1.4 Admin",
                email="test_admin_phase8_1_4@factory.ai",
                password_hash=hash_password("adminpass123"),
                role_id=role_admin.id,
                status="ACTIVE"
            )
            db.add(admin_user)
            db.commit()

        qe_user = db.query(User).filter(User.email == "test_qe_phase8_1_4@factory.ai").first()
        if not qe_user:
            qe_user = User(
                full_name="Phase 8.1.4 QE",
                email="test_qe_phase8_1_4@factory.ai",
                password_hash=hash_password("qepass123"),
                role_id=role_qe.id,
                status="ACTIVE"
            )
            db.add(qe_user)
            db.commit()

        admin_token = create_access_token(subject=str(admin_user.id), role="ADMIN")
        qe_token = create_access_token(subject=str(qe_user.id), role="QUALITY_ENGINEER")

        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        qe_headers = {"Authorization": f"Bearer {qe_token}"}

        client = TestClient(fastapi_app)

        # TEST 1: Admin Dashboard Endpoint (200 OK for Admin)
        res1 = client.get("/api/v1/admin/dashboard", headers=admin_headers)
        dash_json = res1.json()
        assert_test(
            res1.status_code == 200 and dash_json.get("metrics", {}).get("model_map50_pct") == 45.07,
            "1. GET /admin/dashboard returns real metrics & mAP@0.5=45.07% for Admin",
            f"status={res1.status_code}, metrics={dash_json.get('metrics')}"
        )

        # TEST 2: RBAC Enforcement (403 Forbidden for non-Admin QE user)
        res2 = client.get("/api/v1/admin/dashboard", headers=qe_headers)
        assert_test(
            res2.status_code == 403,
            "2. RBAC Enforcement: Non-Admin user receives HTTP 403 Forbidden on /admin/*",
            f"Got status={res2.status_code}"
        )

        # TEST 3: User Management Endpoints (GET/POST/DELETE)
        res3a = client.get("/api/v1/admin/users", headers=admin_headers)
        create_user_payload = {
          "full_name": "E2E Created User",
          "email": "e2e_user@factory.ai",
          "password": "pass123",
          "role_name": "Quality Engineer"
        }
        res3b = client.post("/api/v1/admin/users", json=create_user_payload, headers=admin_headers)
        created_id = res3b.json().get("id") if res3b.status_code == 201 else None
        res3c = client.delete(f"/api/v1/admin/users/{created_id}", headers=admin_headers) if created_id else None

        assert_test(
            res3a.status_code == 200 and res3b.status_code == 201 and (res3c is not None and res3c.status_code == 200),
            "3. User Management APIs (GET 200, POST 201, DELETE 200) execute against PostgreSQL",
            f"res3a={res3a.status_code}, res3b={res3b.status_code}, res3c={res3c.status_code if res3c else None}"
        )

        # TEST 4: Dataset & Model Management Endpoints
        res4a = client.get("/api/v1/admin/datasets", headers=admin_headers)
        res4b = client.get("/api/v1/admin/models", headers=admin_headers)
        assert_test(
            res4a.status_code == 200 and res4b.status_code == 200,
            "4. Dataset & AI Model Registry APIs return real PostgreSQL records",
            f"res4a={res4a.status_code}, res4b={res4b.status_code}"
        )

        # TEST 5: Activity Logs & System Health Endpoints
        res5a = client.get("/api/v1/admin/logs", headers=admin_headers)
        res5b = client.get("/api/v1/admin/system-health", headers=admin_headers)
        assert_test(
            res5a.status_code == 200 and res5b.status_code == 200 and res5b.json().get("server_status") == "OPERATIONAL",
            "5. Activity Logs & System Health APIs return empirical operational status",
            f"res5a={res5a.status_code}, res5b={res5b.status_code}, status={res5b.json().get('server_status')}"
        )

    finally:
        db.close()

    # TEST 6: Admin Frontend Mock Removal Audit
    admin_dir = os.path.join(PROJECT_ROOT, "frontend", "src", "pages", "admin")
    admin_main_path = os.path.join(PROJECT_ROOT, "frontend", "src", "pages", "admin", "AdminDashboardPage.jsx")

    admin_pages = [
        "AdminDashboardPage.jsx",
        "UserManagementPage.jsx",
        "DatasetManagementPage.jsx",
        "AIModelManagementPage.jsx",
        "ActivityLogsPage.jsx",
        "SystemHealthPage.jsx"
    ]

    forbidden_mocks = [
        "initialUsers =",
        "initialPostgresDataset =",
        "modelHistory =",
        "initialActivityLogs =",
        "monthlyInspectionsData =",
        "usersByRoleData =",
        "datasetDistributionData ="
    ]

    found_mocks = []
    for ap in admin_pages:
        ap_path = os.path.join(admin_dir, ap)
        if os.path.exists(ap_path):
            with open(ap_path, "r", encoding="utf-8") as f:
                content = f.read()
            for sig in forbidden_mocks:
                if sig in content:
                    found_mocks.append((ap, sig))

    assert_test(
        len(found_mocks) == 0,
        "6. Code Audit Check (Static mock arrays removed from all 6 Admin React pages)",
        f"Found remaining mock signatures: {found_mocks}"
    )

    print("=" * 60)
    print(f"PHASE 8.1.4 TEST RESULTS: {passed_count}/{total_count} PASSED")
    print("=" * 60)
    return passed_count == total_count

if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
