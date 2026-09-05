from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app.models import User, Role, Inspection, Image, Defect
from app.auth import create_access_token
from app.services.severity_scoring import calculate_severity
from app.services.quality_control import make_pass_fail_decision
from datetime import datetime, timedelta

client = TestClient(app)

def run():
    print("=== IN-PROCESS TEST SUITE: MILESTONE 3 ===")
    
    db = SessionLocal()
    try:
        # 1. Verify / Create Roles in DB
        qe_role = db.query(Role).filter(Role.role_name == "quality_engineer").first()
        if not qe_role:
            qe_role = Role(role_name="quality_engineer")
            db.add(qe_role)
            db.commit()
            db.refresh(qe_role)

        fs_role = db.query(Role).filter(Role.role_name == "factory_supervisor").first()
        if not fs_role:
            fs_role = Role(role_name="factory_supervisor")
            db.add(fs_role)
            db.commit()
            db.refresh(fs_role)

        # 2. Verify / Create Test Users
        qe_user = db.query(User).filter(User.username == "qe_tester").first()
        if not qe_user:
            qe_user = User(
                username="qe_tester",
                email="qe_tester@example.com",
                password_hash="fakehash",
                role_id=qe_role.id
            )
            db.add(qe_user)
            db.commit()
            db.refresh(qe_user)

        fs_user = db.query(User).filter(User.username == "fs_tester").first()
        if not fs_user:
            fs_user = User(
                username="fs_tester",
                email="fs_tester@example.com",
                password_hash="fakehash",
                role_id=fs_role.id
            )
            db.add(fs_user)
            db.commit()
            db.refresh(fs_user)

        # 3. Create Tokens
        qe_token = create_access_token({"sub": str(qe_user.id)})
        fs_token = create_access_token({"sub": str(fs_user.id)})

        qe_headers = {"Authorization": f"Bearer {qe_token}"}
        fs_headers = {"Authorization": f"Bearer {fs_token}"}

        print("[OK] Test users & JWT tokens initialized.")

        # 4. Test Reports Endpoint
        r1 = client.get("/reports/quality-summary", headers=qe_headers)
        assert r1.status_code == 200, f"QE report failed: {r1.text}"
        print(f"[OK] GET /reports/quality-summary (QE): {r1.json()}")

        r2 = client.get("/reports/quality-summary", headers=fs_headers)
        assert r2.status_code == 200, f"FS report failed: {r2.text}"
        print(f"[OK] GET /reports/quality-summary (FS): {r2.json()}")

        r_export = client.get("/reports/quality-summary/export", headers=qe_headers)
        assert r_export.status_code == 200
        assert "text/csv" in r_export.headers["content-type"]
        print(f"[OK] GET /reports/quality-summary/export: CSV received ({len(r_export.content)} bytes)")

        # 5. Test Analytics RBAC
        # Engineer MUST receive 403 Forbidden
        assert client.get("/analytics/defect-trends", headers=qe_headers).status_code == 403
        assert client.get("/analytics/defect-type-breakdown", headers=qe_headers).status_code == 403
        assert client.get("/analytics/severity-distribution", headers=qe_headers).status_code == 403
        print("[OK] Quality Engineer correctly denied access (403) to all /analytics/* endpoints.")

        # Supervisor MUST receive 200 OK
        t_res = client.get("/analytics/defect-trends?period=daily", headers=fs_headers)
        assert t_res.status_code == 200, f"Trends failed: {t_res.text}"
        print(f"[OK] GET /analytics/defect-trends (FS): {len(t_res.json())} periods")

        b_res = client.get("/analytics/defect-type-breakdown", headers=fs_headers)
        assert b_res.status_code == 200, f"Breakdown failed: {b_res.text}"
        print(f"[OK] GET /analytics/defect-type-breakdown (FS): {b_res.json()}")

        s_res = client.get("/analytics/severity-distribution", headers=fs_headers)
        assert s_res.status_code == 200, f"Severity dist failed: {s_res.text}"
        print(f"[OK] GET /analytics/severity-distribution (FS): {s_res.json()}")

        # 6. Test Quality Control Zero-Defect Rule
        # Create test inspection & test defects
        test_img = db.query(Image).first()
        if not test_img:
            test_img = Image(uploaded_by=qe_user.id, filename="test_pcb.jpg", filepath="uploads/test_pcb.jpg")
            db.add(test_img)
            db.commit()
            db.refresh(test_img)

        # Inspection with 0 defects -> PASS
        clean_insp = Inspection(image_id=test_img.id, status="completed", defect_count=0)
        db.add(clean_insp)
        db.commit()
        db.refresh(clean_insp)

        dec_pass = make_pass_fail_decision(clean_insp.id, db)
        assert dec_pass == "pass", f"Expected pass for 0 defects, got: {dec_pass}"
        print(f"[OK] Zero defects inspection decision: {dec_pass} (PASSED)")

        # Inspection with defects -> FAIL
        defect_insp = Inspection(image_id=test_img.id, status="completed", defect_count=1)
        db.add(defect_insp)
        db.commit()
        db.refresh(defect_insp)

        d_obj = Defect(
            inspection_id=defect_insp.id,
            defect_type="crack",
            confidence_score=0.92,
            bbox_x=300,
            bbox_y=300,
            bbox_width=50,
            bbox_height=50,
            size_score=15.0,
            location_score=85.0,
            type_score=90.0,
            severity_score=68.0,
            severity_level="High"
        )
        db.add(d_obj)
        db.commit()

        dec_fail = make_pass_fail_decision(defect_insp.id, db)
        assert dec_fail == "fail", f"Expected fail for >0 defects, got: {dec_fail}"
        print(f"[OK] Defective inspection decision: {dec_fail} (REJECTED)")

        # 7. Test Re-inspect RBAC
        # Supervisor MUST get 403
        reinsp_fs = client.post(f"/inspections/{defect_insp.id}/reinspect", headers=fs_headers)
        assert reinsp_fs.status_code == 403
        print("[OK] Supervisor correctly denied (403) on /inspections/{id}/reinspect")

        print("\n🎉 ALL IN-PROCESS VERIFICATION TESTS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    run()
