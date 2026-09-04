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

from app.models.all_models import Inspection, ProductionBatch, Detection, DefectAssessment, SeverityScore, QualityDecision, QualityAssessment
from sqlalchemy.orm import joinedload
from app.services.quality_analytics import period_start

@router.post("/generate", response_model=ReportSchema)
def generate_report(req: ReportGenerateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Generate a CSV report from persisted inspection and assessment records."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"quality_report_{uuid.uuid4().hex[:8]}.csv"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    metrics = calculate_quality_analytics(db, req.date_range)
    _, start_time = period_start(req.date_range)

    # Fetch individual inspections within the period
    inspections = (
        db.query(Inspection)
        .options(
            joinedload(Inspection.detections).joinedload(Detection.assessment),
            joinedload(Inspection.quality_decision),
            joinedload(Inspection.quality_assessment),
            joinedload(Inspection.severity_score),
            joinedload(Inspection.images),
            joinedload(Inspection.batch).joinedload(ProductionBatch.product),
        )
        .filter(Inspection.created_at >= start_time)
        .order_by(Inspection.created_at.desc())
        .all()
    )

    with open(filepath, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["VISIONINSPECT AI — PRODUCTION QUALITY & INSPECTION REPORT"])
        writer.writerow(["Generated At", metrics["generated_at"]])
        writer.writerow(["Report Type", req.report_type])
        writer.writerow(["Reporting Period", metrics["period"]])
        writer.writerow([])
        writer.writerow(["=== EXECUTIVE QUALITY SUMMARY ==="])
        writer.writerow(["Metric", "Value"])
        for label, value in (
            ("Total Inspections", metrics["total_inspections"]),
            ("PASS Count", metrics["passed_inspections"]),
            ("FAIL Count", metrics["failed_inspections"]),
            ("REVIEW Count", metrics["review_inspections"]),
            ("REWORK Count", metrics["rework_inspections"]),
            ("Total Defects Detected", metrics["total_defects"]),
            ("PASS Rate", f'{metrics["pass_rate"]}%'),
            ("FAIL Rate", f'{metrics["fail_rate"]}%'),
            ("REVIEW Rate", f'{metrics["review_rate"]}%'),
            ("REWORK Rate", f'{metrics["rework_rate"]}%'),
            ("Defect Rate", f'{metrics["defect_rate"]}%'),
            ("Average Severity Score", metrics["average_severity"]),
            ("Average Detection Confidence", f'{metrics["average_confidence"]}%'),
            ("Trend Direction", metrics["trend_direction"].capitalize()),
        ):
            writer.writerow([label, value])
        writer.writerow([])
        writer.writerow(["=== DEFECT CATEGORY BREAKDOWN ==="])
        writer.writerow(["Defect Category", "Count"])
        writer.writerows([[item["name"], item["value"]] for item in metrics["defects_by_category"]])
        writer.writerow([])
        writer.writerow(["=== SEVERITY DISTRIBUTION ==="])
        writer.writerow(["Severity Level", "Count"])
        writer.writerows([[item["name"], item["value"]] for item in metrics["defects_by_severity"]])
        writer.writerow([])
        writer.writerow(["=== QUALITY ISSUES & RECOMMENDED ACTIONS ==="])
        writer.writerow(["Major Quality Issues"])
        writer.writerows([[item] for item in metrics["major_quality_issues"] or ["No major quality issues identified."]])
        writer.writerow([])
        writer.writerow(["Recommended Quality Actions"])
        writer.writerows([[item] for item in metrics["recommended_actions"]])
        writer.writerow([])
        writer.writerow(["=== ITEMIZED INSPECTION LOGS ==="])
        writer.writerow([
            "Inspection ID", "Date / Time (UTC)", "Product", "Batch",
            "Image Path", "Defect Type", "Confidence (%)", "Severity Score",
            "Severity Level", "AI Decision", "Human Decision", "Final Quality Decision",
            "Defect Count", "Processing Time (ms)", "Recommended Action"
        ])

        for insp in inspections:
            product_name = insp.batch.product.name if insp.batch and insp.batch.product else (f"Product {insp.batch.product_id}" if insp.batch else "Unassigned")
            batch_num = insp.batch.batch_number if insp.batch else "N/A"
            raw_img = next((img.file_path for img in insp.images if img.image_type == "raw"), (insp.images[0].file_path if insp.images else "N/A"))
            primary_defect = insp.detections[0] if insp.detections else None
            defect_type_str = primary_defect.defect_display_name if primary_defect and primary_defect.defect_display_name else (primary_defect.defect_type if primary_defect else "None")
            conf_str = f"{primary_defect.confidence:.1f}%" if primary_defect else "100.0%"
            sev_score = insp.severity_score.total_score if insp.severity_score else 0.0
            sev_level = insp.severity_score.level if insp.severity_score else "LOW"
            ai_dec = insp.quality_decision.ai_decision if insp.quality_decision else (insp.quality_assessment.overall_result if insp.quality_assessment else "PASS")
            human_dec = insp.quality_decision.human_decision if insp.quality_decision and insp.quality_decision.human_decision else "None"
            final_dec = insp.quality_decision.final_decision if insp.quality_decision else (insp.quality_assessment.overall_result if insp.quality_assessment else "PASS")
            action = insp.quality_assessment.recommended_action if insp.quality_assessment else "Product meets acceptance criteria."

            writer.writerow([
                insp.id,
                insp.created_at.strftime("%Y-%m-%d %H:%M:%S") if insp.created_at else "",
                product_name,
                batch_num,
                raw_img,
                defect_type_str,
                conf_str,
                f"{sev_score:.1f}",
                sev_level,
                ai_dec,
                human_dec,
                final_dec,
                len(insp.detections),
                f"{insp.processing_time_ms:.1f}",
                action,
            ])
        
    rel_file_path = os.path.relpath(filepath, start=os.getcwd()).replace("\\", "/") if os.path.isabs(filepath) else filepath.replace("\\", "/")
    db_report = Report(
        report_type=req.report_type,
        date_range=req.date_range,
        generated_by=current_user.id,
        file_path=rel_file_path
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    return db_report
