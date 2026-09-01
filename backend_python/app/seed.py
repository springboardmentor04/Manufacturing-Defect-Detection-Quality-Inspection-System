from datetime import datetime
from app.db import (
    get_users_col,
    get_batches_col,
    get_products_col,
    get_images_col,
    get_model_runs_col,
    get_findings_col,
    get_quality_reports_col
)

async def seed_initial_data_if_empty():
    batches_col = get_batches_col()
    count = await batches_col.count_documents({})
    if count > 0:
        print("[FastAPI Seed] Database already contains inspection batches. Skipping seed.")
        return

    print("[FastAPI Seed] Seeding initial inspection data into MongoDB...")

    now = datetime.utcnow()

    # Default admin user
    await get_users_col().update_one(
        {"_id": "usr_qe_admin"},
        {"$set": {
            "_id": "usr_qe_admin",
            "openId": "usr_qe_admin",
            "name": "Lead Quality Engineer",
            "email": "engineer@visioninspect.ai",
            "role": "quality_engineer",
            "accountStatus": "active"
        }},
        upsert=True
    )

    # Initial Batches
    initial_batches = [
        {
            "_id": "BT-4108",
            "batchCode": "BT-4108",
            "name": "BATCH-L04-20260828-0842",
            "line": "Line 04",
            "createdBy": "usr_qe_admin",
            "status": "Hold for review",
            "capturedAt": now,
            "itemCount": 3,
            "flagCount": 1,
            "reviewedCount": 1,
            "reviewRequired": True,
            "verdict": "Hold",
            "overallSeverity": "High",
            "overallSeverityScore": 74.0,
            "overallConfidence": 96.4,
            "mode": "Detection + segmentation",
            "sortOrder": 4.0,
            "failureReason": "Edge discontinuity exceeded the product tolerance."
        },
        {
            "_id": "BT-4106",
            "batchCode": "BT-4106",
            "name": "BATCH-L02-20260828-0817",
            "line": "Line 02",
            "createdBy": "usr_qe_admin",
            "status": "Review queued",
            "capturedAt": now,
            "itemCount": 2,
            "flagCount": 1,
            "reviewedCount": 0,
            "reviewRequired": True,
            "verdict": "Review",
            "overallSeverity": "Medium",
            "overallSeverityScore": 52.0,
            "overallConfidence": 91.8,
            "mode": "Detection",
            "sortOrder": 3.0,
            "failureReason": "A solder bridge was detected and requires manual verification."
        },
        {
            "_id": "BT-4104",
            "batchCode": "BT-4104",
            "name": "BATCH-L03-20260827-1630",
            "line": "Line 03",
            "createdBy": "usr_qe_admin",
            "status": "Hold for review",
            "capturedAt": now,
            "itemCount": 2,
            "flagCount": 1,
            "reviewedCount": 0,
            "reviewRequired": True,
            "verdict": "Hold",
            "overallSeverity": "High",
            "overallSeverityScore": 82.0,
            "overallConfidence": 97.2,
            "mode": "Detection + segmentation",
            "sortOrder": 2.5,
            "failureReason": "Cap deformation was detected on the seal collar."
        },
        {
            "_id": "BT-4102",
            "batchCode": "BT-4102",
            "name": "BATCH-L01-20260825-0751",
            "line": "Line 01",
            "createdBy": "usr_qe_admin",
            "status": "Passed",
            "capturedAt": now,
            "itemCount": 1,
            "flagCount": 0,
            "reviewedCount": 1,
            "reviewRequired": False,
            "verdict": "Pass",
            "overallSeverity": "Low",
            "overallSeverityScore": 0.0,
            "overallConfidence": 88.6,
            "mode": "Segmentation",
            "sortOrder": 2.0
        }
    ]

    await get_batches_col().insert_many(initial_batches)

    # Initial Products
    initial_products = [
        {"_id": "PRD-2026-101", "productCode": "PRD-2026-101", "batchId": "BT-4108", "sequence": 1, "name": "Machined drive housing", "status": "Failed", "confidence": 96.4, "capturedAt": now, "primaryImageId": "IMG-ORIG-101", "findingCount": 1, "failedFindingCount": 1},
        {"_id": "PRD-2026-102", "productCode": "PRD-2026-102", "batchId": "BT-4108", "sequence": 2, "name": "Machined drive housing", "status": "Passed", "confidence": 98.9, "capturedAt": now, "primaryImageId": "IMG-ORIG-102", "findingCount": 1, "failedFindingCount": 0},
        {"_id": "PRD-2026-103", "productCode": "PRD-2026-103", "batchId": "BT-4108", "sequence": 3, "name": "Machined drive housing", "status": "Passed", "confidence": 97.6, "capturedAt": now, "primaryImageId": "IMG-ORIG-103", "findingCount": 1, "failedFindingCount": 0},
        {"_id": "PRD-2026-104", "productCode": "PRD-2026-104", "batchId": "BT-4106", "sequence": 1, "name": "Circuit board assembly", "status": "Failed", "confidence": 91.8, "capturedAt": now, "primaryImageId": "IMG-ORIG-104", "findingCount": 1, "failedFindingCount": 1},
        {"_id": "PRD-2026-106", "productCode": "PRD-2026-106", "batchId": "BT-4102", "sequence": 1, "name": "Woven protective mesh", "status": "Passed", "confidence": 88.6, "capturedAt": now, "primaryImageId": "IMG-ORIG-106", "findingCount": 1, "failedFindingCount": 0}
    ]

    await get_products_col().insert_many(initial_products)

    # Initial Images
    initial_images = [
        {"_id": "IMG-ORIG-101", "batchId": "BT-4108", "productId": "PRD-2026-101", "kind": "original", "storageKey": "uploads/hazelnut_cap_defective.png", "url": "/manus-storage/hazelnut_cap_defective.png", "originalName": "hazelnut_cap_defective.png", "mimeType": "image/png", "sizeBytes": 524288},
        {"_id": "IMG-ORIG-102", "batchId": "BT-4108", "productId": "PRD-2026-102", "kind": "original", "storageKey": "uploads/hazelnut_cap_passed_102.png", "url": "/manus-storage/hazelnut_cap_passed_102.png", "originalName": "hazelnut_cap_passed_102.png", "mimeType": "image/png", "sizeBytes": 412000},
        {"_id": "IMG-ORIG-103", "batchId": "BT-4108", "productId": "PRD-2026-103", "kind": "original", "storageKey": "uploads/hazelnut_cap_passed_103.png", "url": "/manus-storage/hazelnut_cap_passed_103.png", "originalName": "hazelnut_cap_passed_103.png", "mimeType": "image/png", "sizeBytes": 398000},
        {"_id": "IMG-ORIG-104", "batchId": "BT-4106", "productId": "PRD-2026-104", "kind": "original", "storageKey": "uploads/electronics-after_33ab70a2.png", "url": "/manus-storage/electronics-after_33ab70a2.png", "originalName": "electronics-after.png", "mimeType": "image/png", "sizeBytes": 612000},
        {"_id": "IMG-ORIG-106", "batchId": "BT-4102", "productId": "PRD-2026-106", "kind": "original", "storageKey": "uploads/hazelnut.jpg", "url": "/manus-storage/hazelnut.jpg", "originalName": "hazelnut.jpg", "mimeType": "image/jpeg", "sizeBytes": 284000}
    ]

    await get_images_col().insert_many(initial_images)

    # Initial Findings
    initial_findings = [
        {"_id": "IR-4821", "batchId": "BT-4108", "productId": "PRD-2026-101", "findingCode": "IR-4821", "defectType": "Contamination", "severity": "High", "severityScore": 74.0, "confidence": 96.4, "defectArea": "12.5%", "decision": "Hold for review", "boundingBox": {"left": "58%", "top": "38%", "width": "23%", "height": "28%"}, "isFlagged": True},
        {"_id": "IR-4822", "batchId": "BT-4108", "productId": "PRD-2026-102", "findingCode": "IR-4822", "defectType": "Not defective", "severity": "Low", "severityScore": 0.0, "confidence": 98.9, "defectArea": "0.0%", "decision": "Pass", "isFlagged": False},
        {"_id": "IR-4823", "batchId": "BT-4108", "productId": "PRD-2026-103", "findingCode": "IR-4823", "defectType": "Not defective", "severity": "Low", "severityScore": 0.0, "confidence": 97.6, "defectArea": "0.0%", "decision": "Pass", "isFlagged": False},
        {"_id": "IR-4819", "batchId": "BT-4106", "productId": "PRD-2026-104", "findingCode": "IR-4819", "defectType": "Solder bridge", "severity": "Medium", "severityScore": 52.0, "confidence": 91.8, "defectArea": "Connector pad", "decision": "Review queued", "boundingBox": {"left": "39%", "top": "41%", "width": "25%", "height": "20%"}, "isFlagged": True},
        {"_id": "IR-4817", "batchId": "BT-4102", "productId": "PRD-2026-106", "findingCode": "IR-4817", "defectType": "Not defective", "severity": "Low", "severityScore": 0.0, "confidence": 88.6, "defectArea": "0.0%", "decision": "Pass", "isFlagged": False}
    ]

    await get_findings_col().insert_many(initial_findings)

    print("[FastAPI Seed] Successfully seeded MongoDB with initial inspection data!")
