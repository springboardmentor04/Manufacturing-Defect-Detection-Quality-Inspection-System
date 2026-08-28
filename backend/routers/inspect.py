import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.user import User
from models.inspection import Inspection, Defect, InspectionReport, InspectionStatus, SeverityLevel
from schemas.inspection import InspectionResponse, ReportResponse
from routers.auth import get_current_user
from services import rule_engine
from utils.report_generator import generate_inspection_pdf_report

router = APIRouter(prefix="/api/v1/inspect", tags=["Inspection & AI"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/analyze", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
async def analyze_product_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be a valid image format (JPEG, PNG).")

    contents = await file.read()
    
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    ai_result = rule_engine.detect_defects(contents)

    status_enum = InspectionStatus(ai_result["status"])
    severity_level_enum = SeverityLevel(ai_result["severity_level"])

    inspection_record = Inspection(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        image_url=f"/uploads/{filename}",
        status=status_enum,
        severity_score=ai_result["severity_score"],
        severity_level=severity_level_enum,
        summary=ai_result["summary"],
        recommendation=ai_result["recommendation"]
    )
    db.add(inspection_record)
    db.flush()

    for defect_item in ai_result["defects"]:
        defect_record = Defect(
            id=str(uuid.uuid4()),
            inspection_id=inspection_record.id,
            defect_type=defect_item["defect_type"],
            size_mm2=defect_item["size_mm2"],
            location_type=defect_item["location_type"],
            confidence=defect_item["confidence"],
            bounding_box=defect_item["bounding_box"]
        )
        db.add(defect_record)

    db.commit()
    db.refresh(inspection_record)

    return {
        "id": inspection_record.id,
        "image_url": inspection_record.image_url,
        "status": inspection_record.status.value if hasattr(inspection_record.status, 'value') else str(inspection_record.status),
        "severity_score": inspection_record.severity_score,
        "severity_level": inspection_record.severity_level.value if hasattr(inspection_record.severity_level, 'value') else str(inspection_record.severity_level),
        "summary": inspection_record.summary,
        "recommendation": inspection_record.recommendation,
        "defects": ai_result["defects"],
        "created_at": inspection_record.created_at,
        "confidence": ai_result.get("confidence", 0.0),
        "engine": ai_result.get("engine", "ml"),
    }


@router.get("/history", response_model=List[InspectionResponse])
def get_inspection_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspections = (
        db.query(Inspection)
        .filter(Inspection.user_id == current_user.id)
        .order_by(Inspection.created_at.desc())
        .limit(limit)
        .all()
    )
    return inspections


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection_details(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection record not found.")
    return inspection


@router.post("/{inspection_id}/report", response_model=ReportResponse)
def generate_report(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection record not found.")

    report = db.query(InspectionReport).filter(InspectionReport.inspection_id == inspection_id).first()
    
    if not report:
        pdf_path = generate_inspection_pdf_report(inspection)
        report = InspectionReport(
            id=str(uuid.uuid4()),
            inspection_id=inspection.id,
            report_pdf_url=pdf_path,
            metrics_summary={
                "severity_score": inspection.severity_score,
                "defect_count": len(inspection.defects)
            }
        )
        db.add(report)
        db.commit()
        db.refresh(report)

    return {
        "inspection_id": inspection.id,
        "generated_at": report.generated_at,
        "metrics_summary": report.metrics_summary,
        "download_url": report.report_pdf_url
    }