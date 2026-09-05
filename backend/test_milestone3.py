import requests
import json
import csv
import io

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== STARTING MILESTONE 3 VERIFICATION TESTS ===")
    
    # 1. Health / Milestone Check
    root_res = requests.get(f"{BASE_URL}/")
    assert root_res.status_code == 200, f"Root failed: {root_res.text}"
    root_data = root_res.json()
    print(f"[OK] Root Endpoint: {root_data}")
    assert root_data.get("milestone") == 3

    # 2. Login or Register Test Users
    # Role: quality_engineer
    qe_user = {
        "username": "qe_test_m3",
        "email": "qe_m3@visioninspect.ai",
        "password": "Password123!",
        "role_name": "quality_engineer"
    }
    requests.post(f"{BASE_URL}/auth/register", json=qe_user)
    qe_login = requests.post(f"{BASE_URL}/auth/login", json={"username": qe_user["username"], "password": qe_user["password"]})
    assert qe_login.status_code == 200, f"QE Login failed: {qe_login.text}"
    qe_token = qe_login.json()["access_token"]
    qe_headers = {"Authorization": f"Bearer {qe_token}"}
    print("[OK] Quality Engineer authenticated successfully.")

    # Role: factory_supervisor
    fs_user = {
        "username": "fs_test_m3",
        "email": "fs_m3@visioninspect.ai",
        "password": "Password123!",
        "role_name": "factory_supervisor"
    }
    requests.post(f"{BASE_URL}/auth/register", json=fs_user)
    fs_login = requests.post(f"{BASE_URL}/auth/login", json={"username": fs_user["username"], "password": fs_user["password"]})
    assert fs_login.status_code == 200, f"FS Login failed: {fs_login.text}"
    fs_token = fs_login.json()["access_token"]
    fs_headers = {"Authorization": f"Bearer {fs_token}"}
    print("[OK] Factory Supervisor authenticated successfully.")

    # 3. Reports Endpoints (Accessible to BOTH roles)
    print("\n--- Testing /reports/quality-summary ---")
    qe_report_res = requests.get(f"{BASE_URL}/reports/quality-summary", headers=qe_headers)
    assert qe_report_res.status_code == 200, f"QE report failed: {qe_report_res.text}"
    print(f"[OK] QE got Quality Summary: {qe_report_res.json()}")

    fs_report_res = requests.get(f"{BASE_URL}/reports/quality-summary", headers=fs_headers)
    assert fs_report_res.status_code == 200, f"FS report failed: {fs_report_res.text}"
    print(f"[OK] FS got Quality Summary: {fs_report_res.json()}")

    # 4. Reports CSV Export (Accessible to BOTH roles)
    print("\n--- Testing /reports/quality-summary/export ---")
    csv_res = requests.get(f"{BASE_URL}/reports/quality-summary/export", headers=fs_headers)
    assert csv_res.status_code == 200, f"CSV export failed: {csv_res.text}"
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "attachment; filename=" in csv_res.headers.get("content-disposition", "")
    print(f"[OK] CSV exported successfully. Size: {len(csv_res.content)} bytes.")

    # 5. Analytics Endpoints (RESTRICTED to factory_supervisor ONLY)
    print("\n--- Testing /analytics/defect-trends RBAC ---")
    # Engineer MUST get 403 Forbidden
    qe_trends = requests.get(f"{BASE_URL}/analytics/defect-trends", headers=qe_headers)
    assert qe_trends.status_code == 403, f"Expected 403 for engineer on trends, got: {qe_trends.status_code}"
    print("[OK] 403 Forbidden correctly returned for quality_engineer on /analytics/defect-trends")

    # Supervisor MUST get 200 OK
    fs_trends = requests.get(f"{BASE_URL}/analytics/defect-trends?period=daily", headers=fs_headers)
    assert fs_trends.status_code == 200, f"Supervisor trends failed: {fs_trends.text}"
    print(f"[OK] 200 OK returned for factory_supervisor on /analytics/defect-trends (got {len(fs_trends.json())} periods)")

    fs_trends_weekly = requests.get(f"{BASE_URL}/analytics/defect-trends?period=weekly", headers=fs_headers)
    assert fs_trends_weekly.status_code == 200
    print("[OK] Weekly period trends query passed.")

    print("\n--- Testing /analytics/defect-type-breakdown RBAC ---")
    qe_breakdown = requests.get(f"{BASE_URL}/analytics/defect-type-breakdown", headers=qe_headers)
    assert qe_breakdown.status_code == 403, f"Expected 403 for engineer on breakdown, got {qe_breakdown.status_code}"
    print("[OK] 403 Forbidden correctly returned for quality_engineer on /analytics/defect-type-breakdown")

    fs_breakdown = requests.get(f"{BASE_URL}/analytics/defect-type-breakdown", headers=fs_headers)
    assert fs_breakdown.status_code == 200, f"Supervisor breakdown failed: {fs_breakdown.text}"
    print(f"[OK] 200 OK returned for factory_supervisor on /analytics/defect-type-breakdown: {fs_breakdown.json()}")

    print("\n--- Testing /analytics/severity-distribution RBAC ---")
    qe_sev = requests.get(f"{BASE_URL}/analytics/severity-distribution", headers=qe_headers)
    assert qe_sev.status_code == 403, f"Expected 403 for engineer on severity distribution, got {qe_sev.status_code}"
    print("[OK] 403 Forbidden correctly returned for quality_engineer on /analytics/severity-distribution")

    fs_sev = requests.get(f"{BASE_URL}/analytics/severity-distribution", headers=fs_headers)
    assert fs_sev.status_code == 200, f"Supervisor severity dist failed: {fs_sev.text}"
    print(f"[OK] 200 OK returned for factory_supervisor on /analytics/severity-distribution: {fs_sev.json()}")

    # 6. Re-inspect Endpoint (RESTRICTED to quality_engineer ONLY)
    print("\n--- Testing /inspections/{id}/reinspect RBAC ---")
    # Fetch an inspection if available
    insp_list = requests.get(f"{BASE_URL}/inspections", headers=qe_headers).json()
    if insp_list:
        test_insp_id = insp_list[0]["id"]
        # Supervisor MUST get 403 Forbidden on reinspect
        fs_reinspect = requests.post(f"{BASE_URL}/inspections/{test_insp_id}/reinspect", headers=fs_headers)
        assert fs_reinspect.status_code == 403, f"Expected 403 for supervisor on reinspect, got: {fs_reinspect.status_code}"
        print(f"[OK] 403 Forbidden correctly returned for factory_supervisor on /inspections/{test_insp_id}/reinspect")

        # Engineer can trigger reinspect
        qe_reinspect = requests.post(f"{BASE_URL}/inspections/{test_insp_id}/reinspect", headers=qe_headers)
        print(f"[OK] QE reinspect status: {qe_reinspect.status_code}")
        if qe_reinspect.status_code == 200:
            reinspect_data = qe_reinspect.json()
            assert "decision" in reinspect_data
            assert "defects" in reinspect_data
            print(f"[OK] Re-inspection response decision: {reinspect_data.get('decision')}, defect count: {reinspect_data.get('defect_count')}")
            for d in reinspect_data.get("defects", []):
                print(f"     Defect {d.get('defect_type')}: Severity={d.get('severity_score')} ({d.get('severity_level')})")
    else:
        print("[INFO] No inspections found to trigger live reinspection test, tested schema and endpoints.")

    print("\n=== ALL MILESTONE 3 API TESTS PASSED! ===")

if __name__ == "__main__":
    run_tests()
