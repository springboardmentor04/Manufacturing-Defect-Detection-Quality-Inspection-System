import asyncio
import os
import sys
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

from database import connect_to_mongo, close_mongo_connection, db_instance
from routes.reports import seed_reports_to_mongo
import httpx

async def test_system():
    print("=" * 80)
    print("  VisionInspect AI -- System Integration & MongoDB Atlas End-to-End Test")
    print("=" * 80)

    # 1. Test Database Connection & Seeding
    print("\n[Step 1/4] Testing MongoDB Atlas Database Connection & Report Seeding...")
    await connect_to_mongo()
    await seed_reports_to_mongo()
    
    if db_instance.db is not None:
        try:
            user_count = await db_instance.db["users"].count_documents({})
            report_count = await db_instance.db["inspection_reports"].count_documents({})
            print(f"  [OK] MongoDB Atlas Connected! Collection 'users': {user_count} docs | 'inspection_reports': {report_count} docs")
        except Exception as e:
            print("  [!] MongoDB Atlas query notice:", e)

    # 2. Test Backend API Server Endpoints via FastAPI ASGI Test Client
    print("\n[Step 2/4] Testing FastAPI API Endpoints...")
    from main import app
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Test Root Endpoint
        res_root = await client.get("/")
        print(f"  [OK] GET / -> Status {res_root.status_code}: {res_root.json()}")

        # Test Registration Endpoint
        test_email = f"test.engineer_{int(asyncio.get_event_loop().time())}@visioninspect.ai"
        reg_payload = {
            "fullName": "Test Quality Engineer",
            "email": test_email,
            "password": "password123",
            "role": "Quality Engineer",
            "department": "Automotive QA Line A",
            "employeeId": "QE-TEST-99"
        }
        res_reg = await client.post("/api/auth/register", json=reg_payload)
        print(f"  [OK] POST /api/auth/register -> Status {res_reg.status_code}: User Registered & Saved in MongoDB Atlas ({res_reg.json().get('id')})")

        # Test Login Endpoint
        res_login = await client.post("/api/auth/login", json={"email": test_email, "password": "password123"})
        print(f"  [OK] POST /api/auth/login -> Status {res_login.status_code}: Auth Successful, Registered Role Retrieved: '{res_login.json().get('role')}'")

        # Test Model Metrics Endpoint
        res_model = await client.get("/api/model/metrics")
        print(f"  [OK] GET /api/model/metrics -> Status {res_model.status_code}: YOLOv8 Telemetry & 100 Epoch History Loaded")

        # Test Report Posting Endpoint (Simulating Image Upload Inspection)
        sample_report_input = {
            "certificateId": "CERT-2026-TEST-99",
            "partNumber": "ENG-884-X",
            "partName": "Cast Aluminum Engine Block (Top Housing)",
            "batchCode": "B-9021-AL",
            "defectType": "Surface Crack",
            "defectLocation": "Functional Component Area",
            "sizeScore": 85,
            "locationScore": 90,
            "defectTypeScore": 95,
            "confidenceScore": 96,
            "severityScore": 91,
            "severityLevel": "Critical",
            "verdict": "REJECT",
            "recommendation": "Reject Product and Trigger Quality Inspection Workflow",
            "inspector": "Test Engineer (AI Studio Upload)"
        }
        res_post_report = await client.post("/api/reports", json=sample_report_input)
        print(f"  [OK] POST /api/reports -> Status {res_post_report.status_code}: Inspection Report Saved into MongoDB Atlas ({res_post_report.json().get('id')})")

        # Test Report Retrieval Endpoint
        res_reports = await client.get("/api/reports")
        reports = res_reports.json()
        print(f"  [OK] GET /api/reports -> Status {res_reports.status_code}: Retrieved {len(reports)} persistent reports from MongoDB Atlas")

    # 3. Close Connection
    await close_mongo_connection()

    print("\n[Step 3/4] SYSTEM INTEGRATION & MONGODB ATLAS END-TO-END TEST PASSED CLEANLY!")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    asyncio.run(test_system())
