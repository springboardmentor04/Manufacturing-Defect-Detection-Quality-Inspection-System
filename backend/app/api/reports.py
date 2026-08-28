from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import csv
import os
import uuid
from app.database.session import get_db
from app.models.all_models import Report, User
from app.schemas.all_schemas import ReportSchema, ReportGenerateSchema
from app.api.deps import get_current_active_user
from app.core.config import settings
from app.services.quality_analytics import calculate_quality_analytics

router = APIRouter()

@router.get("/", response_model=List[ReportSchema])
def get_recent_reports(limit: int = 20, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return db.query(Report).order_by(Report.created_at.desc()).limit(limit).all()

@router.post("/generate", response_model=ReportSchema)
def generate_report(req: ReportGenerateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Generate a CSV report from persisted inspection and assessment records."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"quality_report_{uuid.uuid4().hex[:8]}.csv"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    metrics = calculate_quality_analytics(db, req.date_range)

    with open(filepath, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["VisionInspect AI Production Quality Report"])
        writer.writerow(["Generated at", metrics["generated_at"]])
        writer.writerow(["Period", metrics["period"]])
        writer.writerow([])
        writer.writerow(["Metric", "Value"])
        for label, value in (
            ("Inspection count", metrics["total_inspections"]),
            ("Pass count", metrics["passed_inspections"]),
            ("Fail count", metrics["failed_inspections"]),
            ("Defect count", metrics["total_defects"]),
            ("Pass rate", f'{metrics["pass_rate"]}%'),
            ("Fail rate", f'{metrics["fail_rate"]}%'),
            ("Defect rate", f'{metrics["defect_rate"]}%'),
            ("Average severity", metrics["average_severity"]),
            ("Average confidence", f'{metrics["average_confidence"]}%'),
        ):
            writer.writerow([label, value])
        writer.writerow([])
        writer.writerow(["Defect category", "Count"])
        writer.writerows([[item["name"], item["value"]] for item in metrics["defects_by_category"]])
        writer.writerow([])
        writer.writerow(["Severity", "Count"])
        writer.writerows([[item["name"], item["value"]] for item in metrics["defects_by_severity"]])
        writer.writerow([])
        writer.writerow(["Major quality issues"])
        writer.writerows([[item] for item in metrics["major_quality_issues"] or ["No major quality issues identified."]])
        writer.writerow([])
        writer.writerow(["Recommended quality actions"])
        writer.writerows([[item] for item in metrics["recommended_actions"]])
        
    db_report = Report(
        report_type=req.report_type,
        date_range=req.date_range,
        generated_by=current_user.id,
        file_path=f"uploads/{filename}"
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    return db_report
