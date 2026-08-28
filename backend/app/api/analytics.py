from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_active_user
from app.database.session import get_db
from app.models.all_models import Inspection, ProductionBatch, User
from app.schemas.all_schemas import AnalyticsOverview, DashboardSummary
from app.services.quality_analytics import calculate_quality_analytics

router = APIRouter()


def _summary_payload(db: Session, period: str):
    metrics = calculate_quality_analytics(db, period)
    inspections = (
        db.query(Inspection)
        .options(joinedload(Inspection.detections), joinedload(Inspection.quality_decision), joinedload(Inspection.severity_score), joinedload(Inspection.batch).joinedload(ProductionBatch.product))
        .order_by(Inspection.created_at.desc())
        .limit(10)
        .all()
    )
    recent = []
    for inspection in inspections:
        if inspection.quality_decision and inspection.quality_decision.final_decision:
            decision = "PASS" if inspection.quality_decision.final_decision.upper() == "PASS" else "FAIL"
        elif not inspection.detections:
            decision = "PASS"
        else:
            decision = "FAIL"
        recent.append({
            "id": inspection.id,
            "product_name": inspection.batch.product.name if inspection.batch and inspection.batch.product else "Unassigned product",
            "batch_number": inspection.batch.batch_number if inspection.batch else None,
            "decision": decision,
            "defect_count": len(inspection.detections),
            "confidence": max((float(item.confidence or 0) for item in inspection.detections), default=0.0),
            "quality_score": max(0.0, 100.0 - float(inspection.severity_score.total_score or 0.0)) if inspection.severity_score else 100.0,
            "created_at": inspection.created_at,
        })
    product_ids = {item.batch.product_id for item in inspections if item.batch}
    return {
        **metrics,
        "total_products_inspected": len(product_ids),
        "total_detected_defects": metrics["total_defects"],
        "fail_rate": round(metrics["failed_inspections"] / metrics["total_inspections"] * 100, 2) if metrics["total_inspections"] else 0.0,
        "quality_rate": metrics["pass_rate"],
        "defect_types": metrics["defects_by_category"],
        "severity_distribution": metrics["defects_by_severity"],
        "recent_inspections": recent,
    }


@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(period: str = Query("LAST_7_DAYS"), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    metrics = calculate_quality_analytics(db, period)
    return {
        "total_inspections": metrics["total_inspections"], "total_defects": metrics["total_defects"],
        "defect_rate": metrics["defect_rate"], "pass_rate": metrics["pass_rate"],
        "fail_rate": metrics["fail_rate"], "reject_rate": 0.0, "average_severity": metrics["average_severity"],
        "critical_defects": metrics["critical_defects"], "passed_inspections": metrics["passed_inspections"],
        "failed_inspections": metrics["failed_inspections"], "rejected_inspections": 0,
        "average_confidence": metrics["average_confidence"],
    }


@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard_summary(period: str = Query("LAST_7_DAYS"), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return _summary_payload(db, period)


@router.get("/summary")
def get_quality_summary(period: str = Query("LAST_7_DAYS"), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return _summary_payload(db, period)


@router.get("/trends")
def get_quality_trends(period: str = Query("LAST_7_DAYS"), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    metrics = calculate_quality_analytics(db, period)
    return {"period": metrics["period"], "trend_direction": metrics["trend_direction"], "trends": metrics["trends"], "recommended_actions": metrics["recommended_actions"]}


@router.get("/quality-report")
def get_quality_report_data(period: str = Query("LAST_7_DAYS"), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return calculate_quality_analytics(db, period)
