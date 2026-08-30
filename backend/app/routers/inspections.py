"""
Image acquisition + inspection dashboard routes (Milestone 1 scope).

Quality Engineers  -> upload product images, view their own inspections
Factory Supervisors -> view all inspections across the plant, dashboard stats

NOTE: Actual defect detection / classification / severity scoring is
implemented in Milestone 2 & 3. Here, every uploaded image is stored
with status = "pending" so the AI pipeline can pick it up later.
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from bson import ObjectId
from bson.errors import InvalidId
from PIL import Image

from app.database import inspections_collection, users_collection
from app.models.user import UserRole
from app.models.inspection import InspectionStatus
from app.schemas.inspection import (
    InspectionOut,
    InspectionListResponse,
    DashboardStats,
    BreakdownItem,
    QualityReport,
)
from app.utils.dependencies import get_current_user
from app.config import settings
from app.services import image_processing, defect_detection

router = APIRouter(prefix="/api/inspections", tags=["Inspections"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}
MAX_FILE_SIZE_MB = 15


def _ensure_upload_dir():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def _doc_to_out(doc: dict) -> InspectionOut:
    return InspectionOut(
        id=str(doc["_id"]),
        product_name=doc["product_name"],
        batch_number=doc.get("batch_number"),
        image_filename=doc["image_filename"],
        image_url=f"/uploads/{doc['image_filename']}",
        uploaded_by=doc["uploaded_by"],
        uploaded_by_name=doc.get("uploaded_by_name"),
        status=doc["status"],
        quality_report=doc.get("quality_report"),
        anomaly_ratio=doc.get("anomaly_ratio"),
        bounding_boxes=doc.get("bounding_boxes", []),
        heatmap_url=f"/uploads/{doc['heatmap_filename']}" if doc.get("heatmap_filename") else None,
        model_used=doc.get("model_used"),
        confidence_score=doc.get("confidence_score"),
        defect_type=doc.get("defect_type"),
        severity_score=doc.get("severity_score"),
        severity_level=doc.get("severity_level"),
        quality_recommendation=doc.get("quality_recommendation"),
        severity_details=doc.get("severity_details"),
        notes=doc.get("notes"),
        source=doc.get("source", "manual_upload"),
        created_at=doc["created_at"],
    )


def _run_inspection_pipeline(file_path: str, product_name: str) -> dict:
    """
    Milestone 2 pipeline: image quality analysis + defect prediction.
    Returns a dict of fields to merge onto the inspection document. Never
    raises - on any processing error the inspection is left PENDING with
    a note, so a bad frame never breaks the upload flow.
    """
    try:
        quality_report = image_processing.analyze_quality(file_path)
    except Exception as e:
        return {"status": InspectionStatus.PENDING.value, "notes": f"Quality analysis failed: {e}"}

    try:
        prediction = defect_detection.predict_defect(file_path, product_name)
    except Exception as e:
        return {
            "status": InspectionStatus.PENDING.value,
            "quality_report": quality_report,
            "notes": f"Defect detection failed: {e}",
        }

    return {
        "status": prediction["status"],
        "quality_report": quality_report,
        "anomaly_ratio": prediction["anomaly_ratio"],
        "bounding_boxes": prediction["bounding_boxes"],
        "heatmap_filename": prediction["heatmap_filename"],
        "model_used": prediction["model_used"],
        "confidence_score": prediction["confidence_score"],
        "defect_type": prediction["defect_type"],
        "severity_score": prediction.get("severity_score"),
        "severity_level": prediction.get("severity_level"),
        "quality_recommendation": prediction.get("quality_recommendation"),
        "severity_details": prediction.get("severity_details"),
    }


@router.post("/upload", response_model=InspectionOut, status_code=201)
async def upload_product_image(
    product_name: str = Form(...),
    batch_number: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File too large ({size_mb:.1f}MB). Max {MAX_FILE_SIZE_MB}MB")

    # Validate that the file is actually a readable image
    try:
        from io import BytesIO
        img = Image.open(BytesIO(contents))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    _ensure_upload_dir()
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    inspection_doc = {
        "product_name": product_name,
        "batch_number": batch_number,
        "image_filename": unique_filename,
        "uploaded_by": str(current_user["_id"]),
        "uploaded_by_name": current_user["full_name"],
        "status": InspectionStatus.PROCESSING.value,
        "defect_type": None,
        "severity_score": None,
        "severity_level": None,
        "confidence_score": None,
        "notes": notes,
        "source": "manual_upload",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    inspection_doc.update(_run_inspection_pipeline(file_path, product_name))
    if notes and inspection_doc.get("notes") != notes:
        # a pipeline failure note takes priority, but keep the user's note too
        inspection_doc["notes"] = f"{notes} | {inspection_doc['notes']}"

    result = await inspections_collection.insert_one(inspection_doc)
    inspection_doc["_id"] = result.inserted_id

    return _doc_to_out(inspection_doc)


@router.get("", response_model=InspectionListResponse)
async def list_inspections(
    status_filter: Optional[InspectionStatus] = Query(None, alias="status"),
    severity_level: Optional[str] = Query(None),
    defect_type: Optional[str] = Query(None),
    product_name: Optional[str] = Query(None),
    mine_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    query = {}

    # Quality engineers see their own uploads by default;
    # factory supervisors see everything across the plant.
    if current_user["role"] == UserRole.QUALITY_ENGINEER.value or mine_only:
        query["uploaded_by"] = str(current_user["_id"])

    if status_filter:
        query["status"] = status_filter.value
    if severity_level:
        query["severity_level"] = severity_level
    if defect_type:
        query["defect_type"] = defect_type
    if product_name:
        query["product_name"] = {"$regex": product_name, "$options": "i"}

    total = await inspections_collection.count_documents(query)
    cursor = (
        inspections_collection.find(query)
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    items = [_doc_to_out(doc) async for doc in cursor]

    return InspectionListResponse(total=total, items=items)


@router.get("/{inspection_id}", response_model=InspectionOut)
async def get_inspection(inspection_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(inspection_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid inspection id")

    doc = await inspections_collection.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")

    if current_user["role"] == UserRole.QUALITY_ENGINEER.value and doc["uploaded_by"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only view your own inspections")

    return _doc_to_out(doc)


@router.post("/{inspection_id}/reprocess", response_model=InspectionOut)
async def reprocess_inspection(inspection_id: str, current_user: dict = Depends(get_current_user)):
    """
    Re-run the Milestone 2 image quality + defect detection pipeline on
    an existing inspection. Useful for dataset-imported images (loaded
    PENDING in Milestone 1, before a reference model existed) or to
    retry after fixing a failed analysis.
    """
    try:
        oid = ObjectId(inspection_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid inspection id")

    doc = await inspections_collection.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")

    if current_user["role"] == UserRole.QUALITY_ENGINEER.value and doc["uploaded_by"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only reprocess your own inspections")

    file_path = os.path.join(settings.UPLOAD_DIR, doc["image_filename"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Original image file is missing from storage")

    updates = _run_inspection_pipeline(file_path, doc["product_name"])

    # MVTec dataset records already carry a real, ground-truth defect_type
    # (e.g. "broken_large") set by load_mvtec.py - don't let the model's
    # guess clobber that when reprocessing; only apply the model's guess
    # where there's no ground truth to preserve.
    if doc.get("source") == "mvtec_ad_dataset" and doc.get("defect_type"):
        updates["defect_type"] = doc["defect_type"]

    await inspections_collection.update_one({"_id": oid}, {"$set": updates})
    doc.update(updates)
    return _doc_to_out(doc)


@router.get("/{inspection_id}/quality-report", response_model=QualityReport)
async def get_quality_report(inspection_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(inspection_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid inspection id")

    doc = await inspections_collection.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspection not found")

    if current_user["role"] == UserRole.QUALITY_ENGINEER.value and doc["uploaded_by"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only view your own inspections")

    if not doc.get("quality_report"):
        raise HTTPException(status_code=404, detail="No quality report available for this inspection yet")

    return QualityReport(**doc["quality_report"])


@router.get("/dashboard/stats", response_model=DashboardStats)
async def dashboard_stats(current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] == UserRole.QUALITY_ENGINEER.value:
        query["uploaded_by"] = str(current_user["_id"])

    total = await inspections_collection.count_documents(query)
    pending = await inspections_collection.count_documents({**query, "status": InspectionStatus.PENDING.value})
    passed = await inspections_collection.count_documents({**query, "status": InspectionStatus.PASS.value})
    failed = await inspections_collection.count_documents({**query, "status": InspectionStatus.FAIL.value})

    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    inspections_today = await inspections_collection.count_documents(
        {**query, "created_at": {"$gte": today_start}}
    )

    total_users = None
    if current_user["role"] == UserRole.FACTORY_SUPERVISOR.value:
        total_users = await users_collection.count_documents({})

    async def _avg(field: str):
        pipeline = [
            {"$match": {**query, field: {"$ne": None}}},
            {"$group": {"_id": None, "avg": {"$avg": f"${field}"}}},
        ]
        async for doc in inspections_collection.aggregate(pipeline):
            return round(doc["avg"], 3)
        return None

    avg_confidence = await _avg("confidence_score")
    avg_quality_score = await _avg("quality_report.quality_score")
    avg_severity_score = await _avg("severity_score")

    evaluated_total = passed + failed
    pass_rate_pct = round((passed / evaluated_total) * 100, 1) if evaluated_total > 0 else 0.0
    defect_rate_pct = round((failed / evaluated_total) * 100, 1) if evaluated_total > 0 else 0.0

    async def _agg(field: str, extra_match: Optional[dict] = None):
        match = {**query}
        if extra_match:
            match.update(extra_match)
        pipeline = [
            {"$match": match},
            {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        results = []
        async for doc in inspections_collection.aggregate(pipeline):
            label = doc["_id"] if doc["_id"] not in (None, "") else "unknown"
            results.append(BreakdownItem(label=str(label), count=doc["count"]))
        return results

    status_breakdown = await _agg("status")
    category_breakdown = await _agg("product_name")
    defect_breakdown = await _agg("defect_type", {"defect_type": {"$ne": None}})
    severity_breakdown = await _agg("severity_level", {"severity_level": {"$ne": None}})
    source_breakdown = await _agg("source")

    # Time series daily trend for the last 7 days
    pipeline_trend = [
        {"$match": query},
        {
            "$group": {
                "_id": {"$substr": ["$created_at", 0, 10]},
                "total": {"$sum": 1},
                "passed": {"$sum": {"$cond": [{"$eq": ["$status", "pass"]}, 1, 0]}},
                "failed": {"$sum": {"$cond": [{"$eq": ["$status", "fail"]}, 1, 0]}},
                "avg_severity": {"$avg": "$severity_score"},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    recent_trend = []
    async for doc in inspections_collection.aggregate(pipeline_trend):
        recent_trend.append(
            {
                "date": doc["_id"] or "Unknown",
                "total": doc["total"],
                "passed": doc["passed"],
                "failed": doc["failed"],
                "avg_severity": round(doc["avg_severity"] or 0.0, 1),
            }
        )

    return DashboardStats(
        total_inspections=total,
        pending=pending,
        passed=passed,
        failed=failed,
        total_users=total_users,
        inspections_today=inspections_today,
        avg_confidence=avg_confidence,
        avg_quality_score=avg_quality_score,
        avg_severity_score=avg_severity_score,
        pass_rate_pct=pass_rate_pct,
        defect_rate_pct=defect_rate_pct,
        status_breakdown=status_breakdown,
        category_breakdown=category_breakdown,
        defect_breakdown=defect_breakdown,
        severity_breakdown=severity_breakdown,
        source_breakdown=source_breakdown,
        recent_trend=recent_trend,
    )