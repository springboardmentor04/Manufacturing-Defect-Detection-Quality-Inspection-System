from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.inspection import Inspection


router = APIRouter(
    prefix="/qe",
    tags=["Quality Engineer Dashboard"]
)


@router.get("/dashboard")
def get_qe_dashboard(
    db: Session = Depends(get_db),
):

    total = db.query(Inspection).count()

    passed = (
        db.query(Inspection)
        .filter(func.lower(Inspection.status) == "pass")
        .count()
    )

    failed = (
        db.query(Inspection)
        .filter(func.lower(Inspection.status) == "fail")
        .count()
    )

    pass_rate = (
        round((passed / total) * 100, 2)
        if total
        else 0
    )

    fail_rate = (
        round((failed / total) * 100, 2)
        if total
        else 0
    )

    avg_confidence = (
        db.query(func.avg(Inspection.confidence))
        .scalar()
    )

    avg_confidence = avg_confidence or 0

    if avg_confidence <= 1:
        avg_confidence *= 100

    avg_confidence = round(avg_confidence, 2)

    return {
        "total_inspections": total,
        "passed": passed,
        "failed": failed,
        "pass_rate": pass_rate,
        "fail_rate": fail_rate,
        "average_confidence": avg_confidence,
    }