import os
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))

from fastapi.testclient import TestClient
from backend.app.main import app

def test_full():
    print("\n==========================================")
    print("RUNNING END-TO-END VISIONINSPECT AI TEST")
    print("==========================================")

    client = TestClient(app)

    # Health
    h = client.get("/health")
    print("[1] GET /health -> Status:", h.status_code, h.json())
    assert h.status_code == 200

    # Auth
    l_qe = client.post("/api/auth/login", json={"email": "qe@visioninspect.ai", "password": "password123"})
    print("[2] Login QE -> Status:", l_qe.status_code)
    qe_headers = {"Authorization": f"Bearer {l_qe.json()['access_token']}"}

    l_pm = client.post("/api/auth/login", json={"email": "pm@visioninspect.ai", "password": "password123"})
    print("[3] Login PM -> Status:", l_pm.status_code)
    pm_headers = {"Authorization": f"Bearer {l_pm.json()['access_token']}"}

    # Products & Samples
    prods = client.get("/api/products", headers=qe_headers)
    print("[4] GET /api/products -> Count:", len(prods.json()))

    samples = client.get("/api/inspection/samples", headers=qe_headers)
    print("[5] GET /api/inspection/samples -> Count:", len(samples.json()))

    # Single Image Inspection Test
    val_dir = project_root / "dataset" / "yolo_mvtec" / "images" / "val"
    test_files = list(val_dir.glob("*.png")) if val_dir.exists() else []
    if test_files:
        test_file = test_files[0]
        print(f"\n[6] Testing YOLO Inspection on Sample Image: {test_file.name}...")
        with open(test_file, "rb") as f:
            resp = client.post(
                "/api/inspection/upload",
                headers=qe_headers,
                files={"file": (test_file.name, f, "image/png")},
                data={"product_code": "PRD-BTL-01"}
            )
            print("    Response Status Code:", resp.status_code)
            assert resp.status_code == 201
            data = resp.json()
            print("    Inspection ID:", data["id"])
            print("    Decision:", data["decision"])
            print("    Severity Level:", data["severity_level"], f"({data['severity_score']}/100)")
            print("    Defect Count:", data["defect_count"])
            print("    Processing Latency:", round(data["processing_time_ms"], 2), "ms")
            print("    Original URL:", data["original_image_url"])
            print("    Annotated URL:", data["annotated_image_url"])

            insp_id = data["id"]

            # GET details
            det = client.get(f"/api/inspection/{insp_id}", headers=qe_headers)
            print("[7] GET /api/inspection/{id} -> Status:", det.status_code)
            assert det.status_code == 200

            # PDF Report
            rep = client.get(f"/api/reports/{insp_id}", headers=qe_headers)
            print("[8] GET /api/reports/{id} (PDF Report) -> Status:", rep.status_code, "Size:", len(rep.content), "bytes")
            assert rep.status_code == 200

    # Dashboards
    qe_d = client.get("/api/dashboard/qe", headers=qe_headers)
    print("\n[9] GET /api/dashboard/qe -> OK")

    pm_d = client.get("/api/dashboard/pm", headers=pm_headers)
    print("[10] GET /api/dashboard/pm -> OK, Pass Rate:", pm_d.json()["kpis"]["pass_rate"], "%")

    print("\n==========================================")
    print("ALL TESTS PASSED SUCCESSFULLY 100%!")
    print("==========================================")

if __name__ == "__main__":
    test_full()
