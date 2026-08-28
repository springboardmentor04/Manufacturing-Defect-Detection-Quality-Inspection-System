from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.user import User
from models.inspection import Inspection, Defect, InspectionStatus
from schemas.inspection import AnalyticsSummaryResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns aggregated quality metrics: total inspections, pass rate, 
    defect breakdown by category, and average severity score.
    """
    # Total count
    total_inspections = db.query(Inspection).filter(Inspection.user_id == current_user.id).count()

    if total_inspections == 0:
        return {
            "total_inspections": 0,
            "pass_rate_percentage": 100.0,
            "defect_breakdown": {},
            "average_severity": 0.0,
            "recent_inspections": []
        }

    # Passed count
    passed_count = (
        db.query(Inspection)
        .filter(Inspection.user_id == current_user.id, Inspection.status == InspectionStatus.PASSED)
        .count()
    )
    pass_rate = (passed_count / total_inspections) * 100.0

    # Defect breakdown
    defect_counts = (
        db.query(Defect.defect_type, func.count(Defect.id))
        .join(Inspection, Inspection.id == Defect.inspection_id)
        .filter(Inspection.user_id == current_user.id)
        .group_by(Defect.defect_type)
        .all()
    )
    defect_breakdown = {defect_type: count for defect_type, count in defect_counts}

    # Average severity score
    avg_severity = (
        db.query(func.avg(Inspection.severity_score))
        .filter(Inspection.user_id == current_user.id)
        .scalar()
    ) or 0.0

    # Recent inspections
    recent_inspections = (
        db.query(Inspection)
        .filter(Inspection.user_id == current_user.id)
        .order_by(Inspection.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "total_inspections": total_inspections,
        "pass_rate_percentage": round(pass_rate, 2),
        "defect_breakdown": defect_breakdown,
        "average_severity": round(float(avg_severity), 2),
        "recent_inspections": recent_inspections
    }


@router.get("/confidence-distribution")
def get_confidence_distribution():
    return [
        {"range": "99-100%", "count": 850},
        {"range": "95-98%", "count": 210},
        {"range": "<90%", "count": 20},
    ]


@router.get("/pass-rate-benchmark")
def get_pass_rate_benchmark():
    return [
        {"day": "Mon", "passRate": 95.2, "baseline": 94.8},
        {"day": "Tue", "passRate": 94.6, "baseline": 94.8},
        {"day": "Wed", "passRate": 96.1, "baseline": 94.8},
        {"day": "Thu", "passRate": 95.8, "baseline": 94.8},
        {"day": "Fri", "passRate": 94.2, "baseline": 94.8},
    ]
