import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import UploadFile

from app.config import UPLOAD_DIR
from app.db import (
    get_batches_col,
    get_products_col,
    get_images_col,
    get_model_runs_col,
    get_findings_col,
    get_quality_reports_col
)
from app.services.inference_service import run_inference_pipeline

IST = timezone(timedelta(hours=5, minutes=30))

async def get_next_batch_number() -> int:
    batches_col = get_batches_col()
    cursor = batches_col.find({}, {"sortOrder": 1}).sort("sortOrder", -1).limit(1)
    latest = await cursor.to_list(length=1)
    if latest and latest[0].get("sortOrder"):
        return int(latest[0]["sortOrder"]) + 1
    return 4109

async def get_next_finding_number() -> int:
    findings_col = get_findings_col()
    count = await findings_col.count_documents({})
    return 4824 + count

async def create_batch_from_files(files: List[UploadFile], line_name: str = "Line 04") -> Dict[str, Any]:
    if not files:
        raise ValueError("No image files provided for batch creation.")

    batch_num = await get_next_batch_number()
    batch_code = f"BT-{batch_num}"
    
    # IST for naming, UTC standard datetime for MongoDB storage
    now_ist = datetime.now(IST)
    now_utc = datetime.now(timezone.utc)
    
    date_str = now_ist.strftime("%Y%m%d-%H%M")
    line_digits = "".join(filter(str.isdigit, line_name)) or "04"
    line_formatted = f"LINE{int(line_digits):02d}"
    batch_name = f"BATCH-{line_formatted}-{date_str}"

    # Calculate daily product serial number starting from 001
    today_mmdd = now_ist.strftime("%m%d")
    product_prefix = f"PRD-{today_mmdd}-"
    products_col = get_products_col()
    today_count = await products_col.count_documents({"productCode": {"$regex": f"^{product_prefix}"}})

    finding_start_num = await get_next_finding_number()

    products_created = []
    images_created = []
    model_runs_created = []
    findings_created = []

    highest_severity_score = 0
    highest_severity_label = "Low"
    total_confidence = 0.0
    flag_count = 0

    severity_rank = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}

    for idx, file in enumerate(files):
        sequence = idx + 1
        serial_no = today_count + idx + 1
        product_code = f"PRD-{today_mmdd}-{serial_no:03d}"
        product_id = product_code
        unique_tag = uuid.uuid4().hex[:6].upper()
        
        image_id = f"IMG-ORIG-{batch_num}-{sequence}-{unique_tag}"
        run_id = f"RUN-CNN-{batch_num}-{sequence}-{unique_tag}"
        finding_code = f"IR-{finding_start_num + idx}"
        finding_id = f"IR-{finding_start_num + idx}-{unique_tag}"

        # 1. Save uploaded file asset to disk
        file_ext = os.path.splitext(file.filename)[1] or ".png"
        saved_filename = f"{batch_code}_{sequence}_{uuid.uuid4().hex[:6]}{file_ext}"
        saved_filepath = UPLOAD_DIR / saved_filename
        
        contents = await file.read()
        with open(saved_filepath, "wb") as f:
            f.write(contents)
        
        file_size = len(contents)
        image_url = f"/static/uploads/{saved_filename}"

        # 2. Run AI Model Inference on saved image file
        inference_result = run_inference_pipeline(str(saved_filepath))
        conf = inference_result["confidence"]
        total_confidence += conf

        if inference_result["isFlagged"]:
            flag_count += 1

        sev_label = inference_result["severity"]
        if severity_rank.get(sev_label, 1) > severity_rank.get(highest_severity_label, 1):
            highest_severity_label = sev_label
            highest_severity_score = inference_result["severityScore"]

        # 3. Create InspectionImage Document
        image_doc = {
            "_id": image_id,
            "batchId": batch_code,
            "productId": product_id,
            "kind": "original",
            "storageKey": f"uploads/{saved_filename}",
            "url": image_url,
            "originalName": file.filename,
            "mimeType": file.content_type or "image/jpeg",
            "sizeBytes": file_size,
            "gradcamUrl": inference_result.get("gradcamUrl"),
            "segmentationUrl": inference_result.get("segmentationUrl"),
            "createdAt": now_utc,
            "updatedAt": now_utc
        }
        images_created.append(image_doc)

        # 4. Create ModelRun Document
        model_run_doc = {
            "_id": run_id,
            "batchId": batch_code,
            "productId": product_id,
            "inputImageId": image_id,
            "modelType": "resnet18_unet",
            "modelVersion": "v2.1.0",
            "status": "completed",
            "startedAt": now_utc,
            "completedAt": now_utc,
            "overallConfidence": conf,
            "outputImageIds": [],
            "rawOutput": {
                "defectType": inference_result["defectType"],
                "confidence": conf,
                "gradcamUrl": inference_result.get("gradcamUrl"),
                "segmentationUrl": inference_result.get("segmentationUrl")
            },
            "createdAt": now_utc,
            "updatedAt": now_utc
        }
        model_runs_created.append(model_run_doc)

        # 5. Create Finding Document
        finding_doc = {
            "_id": finding_id,
            "batchId": batch_code,
            "productId": product_id,
            "modelRunId": run_id,
            "findingCode": finding_code,
            "defectType": inference_result["defectType"],
            "severity": inference_result["severity"],
            "severityScore": inference_result["severityScore"],
            "confidence": conf,
            "defectArea": inference_result["defectArea"],
            "decision": inference_result["decision"],
            "boundingBox": inference_result["boundingBox"],
            "isFlagged": inference_result["isFlagged"],
            "gradcamUrl": inference_result.get("gradcamUrl"),
            "segmentationUrl": inference_result.get("segmentationUrl"),
            "createdAt": now_utc,
            "updatedAt": now_utc
        }
        findings_created.append(finding_doc)

        # 6. Create Product Document
        product_doc = {
            "_id": product_id,
            "productCode": product_code,
            "batchId": batch_code,
            "sequence": sequence,
            "name": f"Product Component {product_code}",
            "status": "Failed" if inference_result["isFlagged"] else "Passed",
            "confidence": conf,
            "capturedAt": now_utc,
            "primaryImageId": image_id,
            "findingCount": 1,
            "failedFindingCount": 1 if inference_result["isFlagged"] else 0,
            "createdAt": now_utc,
            "updatedAt": now_utc
        }
        products_created.append(product_doc)

    avg_confidence = round(total_confidence / len(files), 1) if files else 95.0
    verdict = "Hold" if flag_count > 0 else "Pass"
    status = "Hold for review" if flag_count > 0 else "Passed"

    # 7. Create InspectionBatch Document
    batch_doc = {
        "_id": batch_code,
        "batchCode": batch_code,
        "name": batch_name,
        "line": line_name,
        "status": status,
        "capturedAt": now_utc,
        "itemCount": len(files),
        "flagCount": flag_count,
        "reviewedCount": 0,
        "reviewRequired": flag_count > 0,
        "verdict": verdict,
        "overallSeverity": highest_severity_label if flag_count > 0 else "Low",
        "overallSeverityScore": highest_severity_score if flag_count > 0 else 0,
        "overallConfidence": avg_confidence,
        "mode": "Detection + segmentation" if flag_count > 0 else "Detection",
        "sortOrder": float(batch_num),
        "failureReason": f"{flag_count} product component(s) flagged for visual inspection review." if flag_count > 0 else None,
        "createdAt": now_utc,
        "updatedAt": now_utc
    }

    # Insert into MongoDB
    await get_batches_col().insert_one(batch_doc)
    if products_created:
        await get_products_col().insert_many(products_created)
    if images_created:
        await get_images_col().insert_many(images_created)
    if model_runs_created:
        await get_model_runs_col().insert_many(model_runs_created)
    if findings_created:
        await get_findings_col().insert_many(findings_created)

    # 8. Save QualityReport Document in MongoDB qualityReports collection
    report_id = f"REP-{batch_code}-{uuid.uuid4().hex[:6].upper()}"
    pass_rate = 0.0 if flag_count == len(files) else (100.0 if flag_count == 0 else round(((len(files) - flag_count) / len(files)) * 100, 1))

    report_doc = {
        "_id": report_id,
        "periodKey": "7D",
        "batchId": batch_code,
        "batchName": batch_name,
        "line": line_name,
        "periodStart": now_utc,
        "periodEnd": now_utc,
        "generatedBy": "usr_qe_admin",
        "metrics": {
            "totalInspections": len(files),
            "totalProducts": len(products_created),
            "totalDefects": flag_count,
            "passRate": pass_rate,
            "topDefect": highest_severity_label if flag_count > 0 else "None",
            "topDefectPct": round((flag_count / len(files)) * 100, 1) if files else 0.0
        },
        "defectMix": [
            {"label": f["defectType"], "value": 100.0, "color": "#ba4a31"} for f in findings_created
        ] if findings_created else [{"label": "Clean Pass", "value": 100.0, "color": "#27837f"}],
        "summary": f"Quality Inspection Report for {batch_name} ({batch_code}) on {line_name}. Result: {verdict} ({status}). Inspected {len(files)} items with {flag_count} defect(s) flagged.",
        "createdAt": now_utc,
        "updatedAt": now_utc
    }
    await get_quality_reports_col().insert_one(report_doc)
    print(f"[FastAPI BatchService] Stored QualityReport document {report_id} in qualityReports collection!")

    print(f"[FastAPI BatchService] Successfully created batch {batch_code} with {len(files)} images and saved to MongoDB!")

    return {
        "batch": batch_doc,
        "products": products_created,
        "findings": findings_created,
        "images": images_created
    }
