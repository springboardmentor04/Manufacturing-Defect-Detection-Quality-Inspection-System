import csv
import io
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models import User, Inspection, Defect, Image
from app.schemas import QualitySummaryResponse
from app.auth import require_role

router = APIRouter(prefix="/reports", tags=["reports"])

def parse_date_range(start_date: Optional[str], end_date: Optional[str]):
    """Helper to parse ISO or YYYY-MM-DD date strings with a default 30-day window."""
    now = datetime.utcnow()
    default_start = now - timedelta(days=30)
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            except Exception:
                start_dt = default_start
    else:
        start_dt = default_start

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00")).replace(tzinfo=None)
            # If date only is passed without time, set to end of day
            if len(end_date.strip()) == 10:
                end_dt = end_dt.replace(hour=23, minute=59, second=59)
        except Exception:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            except Exception:
                end_dt = now
    else:
        end_dt = now

    return start_dt, end_dt

def compute_quality_summary(db: Session, start_dt: datetime, end_dt: datetime):
    """Core calculation for quality inspection summary report."""
    # Query inspections in date range
    inspections = db.query(Inspection).filter(
        Inspection.created_at >= start_dt,
        Inspection.created_at <= end_dt
    ).all()

    total_inspections = len(inspections)
    total_passed = sum(1 for i in inspections if i.decision == "pass" or (i.status == "completed" and (i.defect_count or 0) == 0))
    total_failed = sum(1 for i in inspections if i.decision == "fail" or (i.defect_count or 0) > 0)
    
    # In case pending inspections haven't been analyzed yet
    if total_inspections > 0:
        pass_rate_percent = round((total_passed / float(total_inspections)) * 100.0, 2)
    else:
        pass_rate_percent = 100.0

    inspection_ids = [i.id for i in inspections]
    
    if inspection_ids:
        # Defect stats in range
        defects = db.query(Defect).filter(Defect.inspection_id.in_(inspection_ids)).all()
        total_defects_found = len(defects)
        
        # Most common defect type
        type_counts = {}
        severity_scores = []
        for d in defects:
            dtype = d.defect_type or "unknown"
            type_counts[dtype] = type_counts.get(dtype, 0) + 1
            if d.severity_score is not None:
                severity_scores.append(d.severity_score)
                
        if type_counts:
            most_common_defect_type = max(type_counts.items(), key=lambda x: x[1])[0]
        else:
            most_common_defect_type = "None"
            
        if severity_scores:
            avg_severity_score = round(sum(severity_scores) / float(len(severity_scores)), 2)
        else:
            avg_severity_score = 0.0
    else:
        total_defects_found = 0
        most_common_defect_type = "None"
        avg_severity_score = 0.0

    return {
        "total_inspections": total_inspections,
        "total_passed": total_passed,
        "total_failed": total_failed,
        "pass_rate_percent": pass_rate_percent,
        "total_defects_found": total_defects_found,
        "most_common_defect_type": most_common_defect_type,
        "avg_severity_score": avg_severity_score,
        "inspections": inspections
    }

@router.get("/quality-summary", response_model=QualitySummaryResponse)
def get_quality_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(require_role("quality_engineer", "factory_supervisor")),
    db: Session = Depends(get_db)
):
    """
    GET /reports/quality-summary
    Returns aggregate manufacturing quality metrics over a date range.
    Accessible to both quality_engineer and factory_supervisor.
    """
    start_dt, end_dt = parse_date_range(start_date, end_date)
    summary = compute_quality_summary(db, start_dt, end_dt)
    
    return QualitySummaryResponse(
        total_inspections=summary["total_inspections"],
        total_passed=summary["total_passed"],
        total_failed=summary["total_failed"],
        pass_rate_percent=summary["pass_rate_percent"],
        total_defects_found=summary["total_defects_found"],
        most_common_defect_type=summary["most_common_defect_type"],
        avg_severity_score=summary["avg_severity_score"]
    )

@router.get("/quality-summary/export")
def export_quality_summary_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(require_role("quality_engineer", "factory_supervisor")),
    db: Session = Depends(get_db)
):
    """
    GET /reports/quality-summary/export
    Streams downloadable CSV report containing aggregate quality metrics and inspection logs.
    Accessible to both quality_engineer and factory_supervisor.
    """
    start_dt, end_dt = parse_date_range(start_date, end_date)
    summary = compute_quality_summary(db, start_dt, end_dt)
    
    csv_buffer = io.StringIO()
    writer = csv.writer(csv_buffer)

    # 1. Header Information
    writer.writerow(["VISIONINSPECT AI - MANUFACTURING QUALITY REPORT"])
    writer.writerow(["Generated At (UTC)", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow(["Report Date Range", f"{start_dt.strftime('%Y-%m-%d')} to {end_dt.strftime('%Y-%m-%d')}"])
    writer.writerow(["Requested By", current_user.username])
    writer.writerow(["Role", current_user.role.role_name if current_user.role else "N/A"])
    writer.writerow([])

    # 2. Key Performance Indicators Summary Table
    writer.writerow(["QUALITY CONTROL SUMMARY METRICS"])
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Total Inspections", summary["total_inspections"]])
    writer.writerow(["Total Passed", summary["total_passed"]])
    writer.writerow(["Total Failed", summary["total_failed"]])
    writer.writerow(["Pass Rate (%)", f"{summary['pass_rate_percent']}%"])
    writer.writerow(["Total Defects Found", summary["total_defects_found"]])
    writer.writerow(["Most Common Defect Type", summary["most_common_defect_type"]])
    writer.writerow(["Average Defect Severity Score", summary["avg_severity_score"]])
    writer.writerow([])

    # 3. Itemized Inspection Log
    writer.writerow(["INSPECTION DETAILS LOG"])
    writer.writerow([
        "Inspection ID",
        "Image Filename",
        "Created Date (UTC)",
        "Status",
        "Decision",
        "Defects Detected",
        "Decided At (UTC)"
    ])

    for insp in summary["inspections"]:
        filename = insp.image.filename if insp.image else "N/A"
        decided_str = insp.decided_at.strftime("%Y-%m-%d %H:%M:%S") if insp.decided_at else "N/A"
        created_str = insp.created_at.strftime("%Y-%m-%d %H:%M:%S") if insp.created_at else "N/A"
        writer.writerow([
            insp.id,
            filename,
            created_str,
            insp.status,
            insp.decision or "pending",
            insp.defect_count or 0,
            decided_str
        ])

    csv_buffer.seek(0)
    filename = f"quality_summary_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
