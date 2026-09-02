import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, status
from database import db_instance
from models import InspectionReportCreateSchema, InspectionReportSchema

router = APIRouter(prefix="/api/reports", tags=["Inspection Reports & Database"])

# In-memory backup store for reports if MongoDB Atlas connection is initializing
IN_MEMORY_REPORTS_DB = []

SAMPLE_REPORTS_SEED = [
    {
        "id": "INS-9921",
        "certificateId": "CERT-2026-88091",
        "partNumber": "ENG-884-X",
        "partName": "Cast Aluminum Engine Block (Top Housing)",
        "batchCode": "B-9021-AL",
        "lineStation": "Line A1",
        "defectType": "Surface Crack",
        "defectLocation": "Functional Component Area",
        "sizeScore": 85,
        "locationScore": 90,
        "defectTypeScore": 95,
        "confidenceScore": 94,
        "severityScore": 88,
        "severityLevel": "Critical",
        "verdict": "REJECT",
        "recommendation": "Reject Product and Trigger Quality Inspection Workflow",
        "inspector": "Alex Rivera (Quality Engineer)",
        "timestamp": (datetime.utcnow() - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S")
    },
    {
        "id": "INS-9920",
        "certificateId": "CERT-2026-88090",
        "partNumber": "PCB-301-B",
        "partName": "PCB Controller Board (SMT Line #3)",
        "batchCode": "B-4402-PCB",
        "lineStation": "Line B3",
        "defectType": "Solder Bridge / Short",
        "defectLocation": "Functional Component Area",
        "sizeScore": 65,
        "locationScore": 95,
        "defectTypeScore": 90,
        "confidenceScore": 91,
        "severityScore": 84,
        "severityLevel": "Critical",
        "verdict": "REJECT",
        "recommendation": "Reject Product and Route to SMT Repair Station",
        "inspector": "Alex Rivera (Quality Engineer)",
        "timestamp": (datetime.utcnow() - timedelta(minutes=35)).strftime("%Y-%m-%d %H:%M:%S")
    },
    {
        "id": "INS-9919",
        "certificateId": "CERT-2026-88089",
        "partNumber": "NUT-44-M10",
        "partName": "Precision Metal Nut & Threading",
        "batchCode": "B-1120-NT",
        "lineStation": "Line C2",
        "defectType": "Surface Scratch",
        "defectLocation": "Cosmetic Surface",
        "sizeScore": 30,
        "locationScore": 30,
        "defectTypeScore": 40,
        "confidenceScore": 97,
        "severityScore": 33,
        "severityLevel": "Low",
        "verdict": "PASS",
        "recommendation": "Product Passed Quality Check (Minor Cosmetic Defect)",
        "inspector": "Sarah Chen (Quality Analyst)",
        "timestamp": (datetime.utcnow() - timedelta(hours=1, minutes=10)).strftime("%Y-%m-%d %H:%M:%S")
    },
    {
        "id": "INS-9918",
        "certificateId": "CERT-2026-88088",
        "partNumber": "GEAR-900-V2",
        "partName": "Automotive Gear Shaft Assembly",
        "batchCode": "B-7719-GR",
        "lineStation": "Line A2",
        "defectType": "Pore / Void",
        "defectLocation": "Assembly Edge",
        "sizeScore": 55,
        "locationScore": 60,
        "defectTypeScore": 60,
        "confidenceScore": 86,
        "severityScore": 55,
        "severityLevel": "Medium",
        "verdict": "REWORK",
        "recommendation": "Manual Quality Inspection Review & Rework Required",
        "inspector": "Sarah Chen (Quality Analyst)",
        "timestamp": (datetime.utcnow() - timedelta(hours=1, minutes=45)).strftime("%Y-%m-%d %H:%M:%S")
    },
    {
        "id": "INS-9917",
        "certificateId": "CERT-2026-88087",
        "partNumber": "GSK-220-L",
        "partName": "Industrial Leather Gasket Seal",
        "batchCode": "B-5529-LT",
        "lineStation": "Line C1",
        "defectType": "Discoloration",
        "defectLocation": "Cosmetic Surface",
        "sizeScore": 20,
        "locationScore": 25,
        "defectTypeScore": 25,
        "confidenceScore": 98,
        "severityScore": 22,
        "severityLevel": "Low",
        "verdict": "PASS",
        "recommendation": "Product Generally Acceptable",
        "inspector": "Alex Rivera (Quality Engineer)",
        "timestamp": (datetime.utcnow() - timedelta(hours=2, minutes=20)).strftime("%Y-%m-%d %H:%M:%S")
    },
    {
        "id": "INS-9916",
        "certificateId": "CERT-2026-88086",
        "partNumber": "PCB-301-B",
        "partName": "PCB Controller Board (SMT Line #3)",
        "batchCode": "B-4402-PCB",
        "lineStation": "Line B3",
        "defectType": "Missing Component",
        "defectLocation": "Functional Component Area",
        "sizeScore": 90,
        "locationScore": 95,
        "defectTypeScore": 95,
        "confidenceScore": 96,
        "severityScore": 93,
        "severityLevel": "Critical",
        "verdict": "REJECT",
        "recommendation": "Reject Product and Halt Placement Feeder #4",
        "inspector": "Alex Rivera (Quality Engineer)",
        "timestamp": (datetime.utcnow() - timedelta(hours=3, minutes=10)).strftime("%Y-%m-%d %H:%M:%S")
    }
]

async def seed_reports_to_mongo():
    """Seeds sample inspection report documents into MongoDB Atlas collection 'inspection_reports'"""
    if db_instance.db is not None:
        try:
            reports_collection = db_instance.db["inspection_reports"]
            count = await reports_collection.count_documents({})
            if count == 0:
                print("Seeding sample inspection reports into MongoDB Atlas collection 'inspection_reports'...")
                await reports_collection.insert_many(SAMPLE_REPORTS_SEED)
                print(f"Successfully seeded {len(SAMPLE_REPORTS_SEED)} sample reports into MongoDB Atlas!")
            else:
                print(f"MongoDB Atlas 'inspection_reports' collection ready with {count} reports.")
        except Exception as e:
            print("MongoDB Atlas report seeding notice:", e)
    
    # Always keep in-memory fallback list ready
    if not IN_MEMORY_REPORTS_DB:
        IN_MEMORY_REPORTS_DB.extend(SAMPLE_REPORTS_SEED)

@router.post("/seed", status_code=status.HTTP_200_OK)
async def seed_reports_endpoint():
    """Manually trigger report data seeding into MongoDB Atlas"""
    await seed_reports_to_mongo()
    return {"status": "success", "message": "Sample reports seeded into MongoDB Atlas successfully."}

@router.post("", response_model=InspectionReportSchema, status_code=status.HTTP_201_CREATED)
async def create_inspection_report(report_input: InspectionReportCreateSchema):
    """
    Saves a newly generated inspection report into MongoDB Atlas collection 'inspection_reports'.
    """
    report_id = f"INS-{uuid.uuid4().hex[:6].upper()}"
    cert_id = report_input.certificateId or f"CERT-2026-{Math_floor_rand()}"
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    report_record = {
        "id": report_id,
        "certificateId": cert_id,
        "partNumber": report_input.partNumber,
        "partName": report_input.partName,
        "batchCode": report_input.batchCode or "B-BATCH-01",
        "lineStation": report_input.lineStation or "Line A1",
        "defectType": report_input.defectType,
        "defectLocation": report_input.defectLocation,
        "sizeScore": report_input.sizeScore,
        "locationScore": report_input.locationScore,
        "defectTypeScore": report_input.defectTypeScore,
        "confidenceScore": report_input.confidenceScore,
        "severityScore": report_input.severityScore,
        "severityLevel": report_input.severityLevel,
        "verdict": report_input.verdict,
        "recommendation": report_input.recommendation or "Quality Verification Completed",
        "inspector": report_input.inspector or "Quality Engineer",
        "imageUrl": report_input.imageUrl,
        "timestamp": timestamp
    }

    # Save into MongoDB Atlas
    if db_instance.db is not None:
        try:
            await db_instance.db["inspection_reports"].insert_one(report_record)
            print(f"Saved inspection report {report_id} into MongoDB Atlas!")
        except Exception as e:
            print("MongoDB insert report notice:", e)

    # Save to memory backup list as well
    IN_MEMORY_REPORTS_DB.insert(0, report_record)

    return report_record

def Math_floor_rand():
    import random
    return random.randint(80000, 99999)

@router.get("", response_model=List[InspectionReportSchema])
async def get_all_inspection_reports(
    verdict: Optional[str] = Query("ALL", description="Filter by verdict: ALL, PASS, REJECT, REWORK"),
    search: Optional[str] = Query(None, description="Search term for part, ID, or defect")
):
    """
    Fetches all inspection reports from MongoDB Atlas collection 'inspection_reports'.
    Supports search queries and verdict filtering.
    """
    reports_list = []

    if db_instance.db is not None:
        try:
            reports_collection = db_instance.db["inspection_reports"]
            query = {}
            if verdict and verdict != "ALL":
                query["verdict"] = verdict.upper()

            cursor = reports_collection.find(query).sort("timestamp", -1)
            async for doc in cursor:
                doc["_id"] = str(doc.get("_id", doc.get("id")))
                reports_list.append(doc)
        except Exception as e:
            print("MongoDB fetch reports notice:", e)

    if not reports_list:
        # Use fallback in-memory list
        reports_list = list(IN_MEMORY_REPORTS_DB)
        if verdict and verdict != "ALL":
            reports_list = [r for r in reports_list if r.get("verdict") == verdict.upper()]

    if search:
        s = search.lower()
        reports_list = [
            r for r in reports_list
            if s in r.get("id", "").lower()
            or s in r.get("partNumber", "").lower()
            or s in r.get("partName", "").lower()
            or s in r.get("defectType", "").lower()
        ]

    return reports_list

@router.get("/{report_id}", response_model=InspectionReportSchema)
async def get_report_by_id(report_id: str):
    """
    Retrieves a single inspection report by ID or Certificate ID from MongoDB Atlas.
    """
    if db_instance.db is not None:
        try:
            report = await db_instance.db["inspection_reports"].find_one({
                "$or": [{"id": report_id}, {"certificateId": report_id}]
            })
            if report:
                report["_id"] = str(report.get("_id", report.get("id")))
                return report
        except Exception as e:
            print("MongoDB query report by ID notice:", e)

    for r in IN_MEMORY_REPORTS_DB:
        if r["id"] == report_id or r.get("certificateId") == report_id:
            return r

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection report not found.")
