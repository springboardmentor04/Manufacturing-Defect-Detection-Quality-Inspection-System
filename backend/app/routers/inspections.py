import os
import cv2
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, Image, Inspection, Defect
from app.schemas import (
    InspectionDetail,
    InspectionDefectsResponse,
    DefectDetail,
    ImageDetail,
    BatchAnalysisRequest,
    BatchAnalysisSummary,
)
from app.auth import get_current_user, require_role
from app.services.image_processing import generate_image_quality_report
from app.services.defect_detection import run_inference
from app.services.severity_scoring import calculate_severity
from app.services.quality_control import make_pass_fail_decision

router = APIRouter(prefix="/inspections", tags=["inspections"])

def resolve_abs_filepath(relative_path: str) -> str:
    """Helper to convert relative DB filepath ('uploads/xyz.jpg') to absolute path."""
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    return os.path.join(backend_dir, relative_path)

def analyze_single_inspection(inspection: Inspection, db: Session) -> InspectionDefectsResponse:
    """Core helper function to run full analysis pipeline on an inspection record."""
    image = db.query(Image).filter(Image.id == inspection.image_id).first()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image for inspection #{inspection.id} not found"
        )

    abs_path = resolve_abs_filepath(image.filepath)
    if not os.path.exists(abs_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image file does not exist on server filesystem: {image.filepath}"
        )

    # 1. Image Quality Assessment
    quality_report = generate_image_quality_report(abs_path)

    # Determine image dimensions for accurate severity calculation
    img_w, img_h = 640, 640
    if quality_report and "resolution" in quality_report:
        img_w = quality_report["resolution"].get("width", 640)
        img_h = quality_report["resolution"].get("height", 640)
    else:
        orig = cv2.imread(abs_path)
        if orig is not None:
            img_h, img_w = orig.shape[:2]

    # 2. YOLO Defect Detection Inference
    try:
        detections = run_inference(abs_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Defect detection inference failed: {str(e)}"
        )

    # 3. Clean previous defects for this inspection (if re-analyzed)
    db.query(Defect).filter(Defect.inspection_id == inspection.id).delete()

    # 4. Calculate Severity Scoring & Save defect records
    new_defects = []
    for det in detections:
        # Calculate severity scores according to weighted formula
        sev_metrics = calculate_severity(det, image_width=img_w, image_height=img_h)
        
        defect_obj = Defect(
            inspection_id=inspection.id,
            defect_type=det["defect_type"],
            confidence_score=det["confidence_score"],
            bbox_x=det["bbox_x"],
            bbox_y=det["bbox_y"],
            bbox_width=det["bbox_width"],
            bbox_height=det["bbox_height"],
            size_score=sev_metrics["size_score"],
            location_score=sev_metrics["location_score"],
            type_score=sev_metrics["type_score"],
            severity_score=sev_metrics["severity_score"],
            severity_level=sev_metrics["severity_level"]
        )
        db.add(defect_obj)
        new_defects.append(defect_obj)

    # 5. Update inspection and image statuses
    inspection.status = "completed"
    inspection.defect_count = len(detections)
    image.status = "processed"

    db.commit()
    db.refresh(inspection)

    # 6. Execute automated Quality Control Pass/Fail Decision
    make_pass_fail_decision(inspection.id, db)
    db.refresh(inspection)

    # Prepare response objects
    defect_details = [
        DefectDetail(
            id=d.id,
            inspection_id=d.inspection_id,
            defect_type=d.defect_type,
            confidence_score=d.confidence_score,
            bbox_x=d.bbox_x,
            bbox_y=d.bbox_y,
            bbox_width=d.bbox_width,
            bbox_height=d.bbox_height,
            size_score=d.size_score,
            location_score=d.location_score,
            type_score=d.type_score,
            severity_score=d.severity_score,
            severity_level=d.severity_level,
            detected_at=d.detected_at
        ) for d in new_defects
    ]

    image_detail = ImageDetail(
        id=image.id,
        uploaded_by=image.uploaded_by,
        uploader_username=image.uploader.username if image.uploader else None,
        filename=image.filename,
        filepath=image.filepath,
        upload_source=image.upload_source,
        status=image.status,
        uploaded_at=image.uploaded_at,
        inspection_id=inspection.id,
        inspection_status=inspection.status,
        defect_count=inspection.defect_count,
        decision=inspection.decision
    )

    return InspectionDefectsResponse(
        inspection_id=inspection.id,
        status=inspection.status,
        defect_count=inspection.defect_count,
        decision=inspection.decision,
        decided_at=inspection.decided_at,
        image=image_detail,
        defects=defect_details,
        quality_report=quality_report
    )

@router.get("", response_model=List[InspectionDetail])
def list_inspections(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all inspections with their current status and quality decision.
    """
    query = db.query(Inspection).join(Image, Inspection.image_id == Image.id)
    
    if status_filter:
        query = query.filter(Inspection.status == status_filter)
        
    query = query.order_by(desc(Inspection.created_at))
    inspections = query.all()
    
    results = []
    for insp in inspections:
        results.append(InspectionDetail(
            id=insp.id,
            image_id=insp.image_id,
            filename=insp.image.filename if insp.image else None,
            filepath=insp.image.filepath if insp.image else None,
            status=insp.status,
            defect_count=insp.defect_count or 0,
            decision=insp.decision or "pending",
            decided_at=insp.decided_at,
            created_at=insp.created_at
        ))
        
    return results

@router.post("/analyze-batch", response_model=BatchAnalysisSummary)
def analyze_batch(
    payload: Optional[BatchAnalysisRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    POST /inspections/analyze-batch
    Runs analysis on a list of inspection_ids, or on all queued inspections if none provided.
    """
    if payload and payload.inspection_ids:
        inspections = db.query(Inspection).filter(Inspection.id.in_(payload.inspection_ids)).all()
    else:
        inspections = db.query(Inspection).filter(Inspection.status == "queued").all()

    total_processed = 0
    total_defects_found = 0
    results = []

    for insp in inspections:
        try:
            res = analyze_single_inspection(insp, db)
            total_processed += 1
            total_defects_found += res.defect_count
            results.append(res)
        except Exception:
            # Continue processing next inspections in batch even if one fails
            continue

    return BatchAnalysisSummary(
        total_processed=total_processed,
        total_defects_found=total_defects_found,
        results=results
    )

@router.post("/{inspection_id}/analyze", response_model=InspectionDefectsResponse)
def analyze_inspection(
    inspection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    POST /inspections/{inspection_id}/analyze
    Runs preprocessing + YOLO defect detection, computes severity scores, stores defects, 
    and executes QC pass/fail decision.
    """
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection with ID {inspection_id} not found"
        )

    return analyze_single_inspection(inspection, db)

@router.post("/{inspection_id}/reinspect", response_model=InspectionDefectsResponse)
def reinspect_inspection(
    inspection_id: int,
    current_user: User = Depends(require_role("quality_engineer")),
    db: Session = Depends(get_db)
):
    """
    POST /inspections/{inspection_id}/reinspect
    RESTRICTED to quality_engineer role only (403 for factory_supervisor).
    Resets inspection status to 'queued', clears existing defects, and re-runs the full analysis pipeline.
    """
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection with ID {inspection_id} not found"
        )

    # 1. Reset state
    inspection.status = "queued"
    inspection.defect_count = 0
    inspection.decision = "pending"
    inspection.decided_at = None
    
    # 2. Clear previous defect records
    db.query(Defect).filter(Defect.inspection_id == inspection_id).delete()
    db.commit()
    db.refresh(inspection)

    # 3. Re-run complete analysis pipeline
    return analyze_single_inspection(inspection, db)

@router.get("/{inspection_id}/defects", response_model=InspectionDefectsResponse)
def get_inspection_defects(
    inspection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GET /inspections/{inspection_id}/defects
    Returns image details, associated defect records with severity scores, QC decision, and quality report.
    """
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection with ID {inspection_id} not found"
        )

    image = db.query(Image).filter(Image.id == inspection.image_id).first()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Associated image for inspection #{inspection_id} not found"
        )

    defects = db.query(Defect).filter(Defect.inspection_id == inspection_id).order_by(desc(Defect.confidence_score)).all()

    abs_path = resolve_abs_filepath(image.filepath)
    quality_report = generate_image_quality_report(abs_path)

    defect_details = [
        DefectDetail(
            id=d.id,
            inspection_id=d.inspection_id,
            defect_type=d.defect_type,
            confidence_score=d.confidence_score,
            bbox_x=d.bbox_x,
            bbox_y=d.bbox_y,
            bbox_width=d.bbox_width,
            bbox_height=d.bbox_height,
            size_score=d.size_score,
            location_score=d.location_score,
            type_score=d.type_score,
            severity_score=d.severity_score,
            severity_level=d.severity_level,
            detected_at=d.detected_at
        ) for d in defects
    ]

    image_detail = ImageDetail(
        id=image.id,
        uploaded_by=image.uploaded_by,
        uploader_username=image.uploader.username if image.uploader else None,
        filename=image.filename,
        filepath=image.filepath,
        upload_source=image.upload_source,
        status=image.status,
        uploaded_at=image.uploaded_at,
        inspection_id=inspection.id,
        inspection_status=inspection.status,
        defect_count=inspection.defect_count,
        decision=inspection.decision
    )

    return InspectionDefectsResponse(
        inspection_id=inspection.id,
        status=inspection.status,
        defect_count=inspection.defect_count or len(defects),
        decision=inspection.decision or "pending",
        decided_at=inspection.decided_at,
        image=image_detail,
        defects=defect_details,
        quality_report=quality_report
    )
