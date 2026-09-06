from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database.database import get_db
from app.models.user import User
from app.models.inspection import Inspection


router = APIRouter(
    prefix="/qe",
    tags=["Quality Engineer Dashboard"]
)


@router.get("/dashboard")
def get_qe_dashboard(
    current_user: User = Depends(
        require_role("quality_engineer")
    ),
    db: Session = Depends(get_db),
):

    # ==========================================
    # Total Inspections
    # ==========================================

    total = db.query(Inspection).count()

    # ==========================================
    # Passed Inspections
    # ==========================================

    passed = (
        db.query(Inspection)
        .filter(
            func.lower(Inspection.status) == "pass"
        )
        .count()
    )

    # ==========================================
    # Failed Inspections
    # ==========================================

    failed = (
        db.query(Inspection)
        .filter(
            func.lower(Inspection.status) == "fail"
        )
        .count()
    )

    # ==========================================
    # Pending Inspections
    # ==========================================

    pending = (
        db.query(Inspection)
        .filter(
            func.lower(Inspection.status) == "pending"
        )
        .count()
    )

    # ==========================================
    # Pass Rate
    # ==========================================

    pass_rate = (
        round((passed / total) * 100, 2)
        if total
        else 0
    )

    # ==========================================
    # Fail Rate
    # ==========================================

    fail_rate = (
        round((failed / total) * 100, 2)
        if total
        else 0
    )

    # ==========================================
    # Pending Rate
    # ==========================================

    pending_rate = (
        round((pending / total) * 100, 2)
        if total
        else 0
    )

    # ==========================================
    # Average AI Confidence
    # ==========================================

    avg_confidence = (
        db.query(
            func.avg(Inspection.confidence)
        )
        .scalar()
    )

    avg_confidence = avg_confidence or 0

    if avg_confidence <= 1:
        avg_confidence *= 100

    avg_confidence = round(
        avg_confidence,
        2
    )

    # ==========================================
    # Response
    # ==========================================

    return {
        "total_inspections": total,

        "passed": passed,

        "failed": failed,

        "pending": pending,

        "pass_rate": pass_rate,

        "fail_rate": fail_rate,

        "pending_rate": pending_rate,

        "average_confidence":
            avg_confidence,
    }