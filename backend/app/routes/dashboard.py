from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import current_user
from ..models import (
    Inspection,
    Defect,
    Decision,
    Severity,
    ReviewStatus,
    Role,
)

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


@router.get("/qe")
def quality_engineer_dashboard(
    db: Session = Depends(get_db),
    user=Depends(current_user)
):
    """
    Quality Engineer Dashboard

    Returns:
    - Today's inspection count
    - Today's passed inspections
    - Today's failed inspections
    - Pending reviews
    - Critical defects
    - Low-confidence inspections
    - Total AI inspections
    - Average inspection processing time
    - Recent inspections
    """

    # ---------------------------------------------------------
    # ROLE CHECK
    # ---------------------------------------------------------

    if user.role != Role.QUALITY_ENGINEER:
        raise HTTPException(
            status_code=403,
            detail="Quality Engineer role required"
        )

    # ---------------------------------------------------------
    # TODAY DATE RANGE
    # ---------------------------------------------------------

    today = datetime.utcnow().date()

    start_of_day = datetime.combine(
        today,
        datetime.min.time()
    )

    start_of_next_day = start_of_day + timedelta(days=1)

    # ---------------------------------------------------------
    # TODAY'S INSPECTIONS
    # ---------------------------------------------------------

    today_inspections = db.scalar(
        select(func.count(Inspection.id))
        .where(
            Inspection.user_id == user.id,
            Inspection.created_at >= start_of_day,
            Inspection.created_at < start_of_next_day
        )
    ) or 0

    # ---------------------------------------------------------
    # TODAY'S PASSED INSPECTIONS
    # ---------------------------------------------------------

    passed = db.scalar(
        select(func.count(Inspection.id))
        .where(
            Inspection.user_id == user.id,
            Inspection.created_at >= start_of_day,
            Inspection.created_at < start_of_next_day,
            Inspection.decision == Decision.PASS
        )
    ) or 0

    # ---------------------------------------------------------
    # TODAY'S FAILED INSPECTIONS
    # ---------------------------------------------------------

    failed = db.scalar(
        select(func.count(Inspection.id))
        .where(
            Inspection.user_id == user.id,
            Inspection.created_at >= start_of_day,
            Inspection.created_at < start_of_next_day,
            Inspection.decision == Decision.FAIL
        )
    ) or 0

    # ---------------------------------------------------------
    # PENDING REVIEWS
    # ---------------------------------------------------------

    pending_reviews = db.scalar(
        select(func.count(Inspection.id))
        .where(
            Inspection.user_id == user.id,
            Inspection.review_status == ReviewStatus.PENDING
        )
    ) or 0

    # ---------------------------------------------------------
    # CRITICAL DEFECTS
    # ---------------------------------------------------------

    critical_defects = db.scalar(
        select(func.count(Defect.id))
        .join(
            Inspection,
            Defect.inspection_id == Inspection.id
        )
        .where(
            Inspection.user_id == user.id,
            Defect.severity_level == Severity.CRITICAL
        )
    ) or 0

    # ---------------------------------------------------------
    # LOW CONFIDENCE INSPECTIONS
    # ---------------------------------------------------------

    low_confidence = db.scalar(
        select(func.count(Inspection.id))
        .where(
            Inspection.user_id == user.id,
            Inspection.highest_confidence < 0.70
        )
    ) or 0

    # ---------------------------------------------------------
    # TOTAL AI INSPECTIONS
    # ---------------------------------------------------------

    ai_inspections = db.scalar(
        select(func.count(Inspection.id))
        .where(
            Inspection.user_id == user.id
        )
    ) or 0

    # ---------------------------------------------------------
    # AVERAGE INSPECTION TIME
    # ---------------------------------------------------------

    avg_processing_time = db.scalar(
        select(func.avg(Inspection.processing_time_ms))
        .where(
            Inspection.user_id == user.id
        )
    )

    if avg_processing_time is None:
        avg_inspection_time = 0
    else:
        avg_inspection_time = round(
            float(avg_processing_time) / 1000,
            2
        )

    # ---------------------------------------------------------
    # RECENT INSPECTIONS
    # ---------------------------------------------------------

    recent = db.scalars(
        select(Inspection)
        .where(
            Inspection.user_id == user.id
        )
        .order_by(
            Inspection.created_at.desc()
        )
        .limit(10)
    ).all()

    recent_inspections = []

    for inspection in recent:

        recent_inspections.append({
            "id": inspection.id,

            "inspection_uuid": inspection.inspection_uuid,

            "decision": (
                inspection.decision.value
                if inspection.decision
                else None
            ),

            "severity": (
                inspection.severity_level.value
                if inspection.severity_level
                else None
            ),

            "severity_score": round(
                float(inspection.severity_score or 0),
                2
            ),

            "confidence": round(
                float(inspection.highest_confidence or 0) * 100,
                2
            ),

            "defect_count": (
                inspection.defect_count or 0
            ),

            "processing_time": round(
                float(
                    inspection.processing_time_ms or 0
                ) / 1000,
                2
            ),

            "review_status": (
                inspection.review_status.value
                if inspection.review_status
                else None
            ),

            "created_at": (
                inspection.created_at.isoformat()
                if inspection.created_at
                else None
            )
        })

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    return {
        "kpis": {
            "today_inspections": today_inspections,
            "passed": passed,
            "failed": failed,
            "pending_reviews": pending_reviews,
            "critical_defects": critical_defects,
            "low_confidence": low_confidence,
            "ai_inspections": ai_inspections,
            "avg_inspection_time": avg_inspection_time
        },

        "recent_inspections": recent_inspections
    }