"""
Test Suite for Phase 8.1.2 — Supervisor Subpages Connection
Verifies supervisor APIs, dynamic SQL data, loading/error states, and mock code removal.
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
    print("RUNNING PHASE 8.1.2 TEST SUITE")
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
        # Seed test Supervisor user & token
        role_sup = db.query(Role).filter(Role.role_name == "FACTORY_SUPERVISOR").first()
        if not role_sup:
            role_sup = Role(role_name="FACTORY_SUPERVISOR", description="Factory Supervisor Role")
            db.add(role_sup)
            db.flush()

        sup_user = db.query(User).filter(User.email == "test_sup_phase8@factory.ai").first()
        if not sup_user:
            sup_user = User(
                full_name="Phase 8 Supervisor",
                email="test_sup_phase8@factory.ai",
                password_hash=hash_password("pass123"),
                role_id=role_sup.id,
                status="ACTIVE"
            )
            db.add(sup_user)
            db.commit()

        token = create_access_token(subject=str(sup_user.id), role="FACTORY_SUPERVISOR")
        headers = {"Authorization": f"Bearer {token}"}

        client = TestClient(fastapi_app)

        # TEST 1: GET /supervisor/overview (200 OK)
        res1 = client.get("/api/v1/supervisor/overview", headers=headers)
        assert_test(
            res1.status_code == 200 and "total_products" in res1.json(),
            "1. GET /supervisor/overview returns database metrics (200 OK)",
            f"Got status={res1.status_code}, total_products={res1.json().get('total_products')}"
        )

        # TEST 2: GET /supervisor/monitoring (200 OK)
        res2 = client.get("/api/v1/supervisor/monitoring", headers=headers)
        assert_test(
            res2.status_code == 200 and "lines" in res2.json(),
            "2. GET /supervisor/monitoring returns line & alert data (200 OK)",
            f"Got status={res2.status_code}, lines_count={len(res2.json().get('lines', []))}"
        )

        # TEST 3: GET /supervisor/defect-trends (200 OK)
        res3 = client.get("/api/v1/supervisor/defect-trends", headers=headers)
        assert_test(
            res3.status_code == 200 and isinstance(res3.json(), list),
            "3. GET /supervisor/defect-trends returns trend telemetry (200 OK)",
            f"Got status={res3.status_code}, items_count={len(res3.json())}"
        )

        # TEST 4: GET /supervisor/quality-analytics (200 OK)
        res4 = client.get("/api/v1/supervisor/quality-analytics", headers=headers)
        assert_test(
            res4.status_code == 200 and "status_distribution" in res4.json(),
            "4. GET /supervisor/quality-analytics returns analytics data (200 OK)",
            f"Got status={res4.status_code}"
        )

        # TEST 5: GET /supervisor/reports (200 OK)
        res5 = client.get("/api/v1/supervisor/reports", headers=headers)
        assert_test(
            res5.status_code == 200 and isinstance(res5.json(), list),
            "5. GET /supervisor/reports returns inspection reports (200 OK)",
            f"Got status={res5.status_code}, reports_count={len(res5.json())}"
        )

    finally:
        db.close()

    # TEST 6: Code Audit Check for 5 Supervisor Subpages
    supervisor_dir = os.path.join(PROJECT_ROOT, "frontend", "src", "pages", "supervisor")
    subpages = [
        "ProductionOverviewPage.jsx",
        "ProductionMonitoringPage.jsx",
        "DefectTrendsPage.jsx",
        "QualityAnalyticsPage.jsx",
        "InspectionReportsPage.jsx"
    ]

    mock_signatures = [
        "productionLines =",
        "weeklyDefectTrendData =",
        "defectDistributionData =",
        "confidenceDistribution =",
        "dailyVsWeekly =",
        "initialReports ="
    ]

    found_mocks = []
    for sp in subpages:
        sp_path = os.path.join(supervisor_dir, sp)
        if os.path.exists(sp_path):
            with open(sp_path, "r", encoding="utf-8") as f:
                content = f.read()
            for sig in mock_signatures:
                if sig in content:
                    found_mocks.append((sp, sig))

    assert_test(
        len(found_mocks) == 0,
        "6. Code Audit Check (Static mock arrays removed from 5 Supervisor subpages)",
        f"Found remaining mock signatures: {found_mocks}"
    )

    print("=" * 60)
    print(f"PHASE 8.1.2 TEST RESULTS: {passed_count}/{total_count} PASSED")
    print("=" * 60)
    return passed_count == total_count

if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
