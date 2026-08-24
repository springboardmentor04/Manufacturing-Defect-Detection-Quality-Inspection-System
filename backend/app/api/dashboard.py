from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.dependencies import require_role
from app.database.database import get_db
from app.models.user import User
from app.models.inspection import Inspection

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


# =====================================================
# Dashboard Home
# =====================================================

@router.get("/")
def dashboard(
    current_user: User = Depends(
        require_role("Factory Supervisor")
    )
):
    return {
        "message": f"Welcome {current_user.full_name}",
        "role": current_user.role
    }


# =====================================================
# Dashboard Analytics
# =====================================================

@router.get("/analytics")
def dashboard_analytics(
    db: Session = Depends(get_db),
):
    total = db.query(Inspection).count()

    passed = (
        db.query(Inspection)
        .filter(Inspection.status == "pass")
        .count()
    )

    failed = (
        db.query(Inspection)
        .filter(Inspection.status == "fail")
        .count()
    )

    pass_rate = (
        round((passed / total) * 100, 2)
        if total else 0
    )

    fail_rate = (
        round((failed / total) * 100, 2)
        if total else 0
    )

    avg_confidence = (
        db.query(func.avg(Inspection.confidence))
        .scalar()
    )

    if avg_confidence is None:
        avg_confidence = 0

    avg_confidence = round(avg_confidence * 100, 2)

    return {
        "total_inspections": total,
        "passed": passed,
        "failed": failed,
        "pass_rate": pass_rate,
        "fail_rate": fail_rate,
        "average_confidence": avg_confidence,
    }
    
from collections import OrderedDict
from sqlalchemy import func

@router.get("/activity")
def get_activity(
    db: Session = Depends(get_db),
):
    days = OrderedDict([
        ("Mon", 0),
        ("Tue", 0),
        ("Wed", 0),
        ("Thu", 0),
        ("Fri", 0),
        ("Sat", 0),
        ("Sun", 0),
    ])

    inspections = db.query(Inspection).all()

    for inspection in inspections:
        day = inspection.created_at.strftime("%a")
        if day in days:
            days[day] += 1

    return [
        {
            "date": day,
            "count": count,
        }
        for day, count in days.items()
    ]
from sqlalchemy import func

@router.get("/defect-distribution")
def defect_distribution(
    db: Session = Depends(get_db),
):

    results = (
        db.query(
            Inspection.defect_type,
            func.count(Inspection.id)
        )
        .group_by(Inspection.defect_type)
        .all()
    )

    data = []

    for defect, count in results:

        data.append({
            "name": defect if defect else "Unknown",
            "value": count
        })

    return data
from collections import defaultdict
from sqlalchemy import func

@router.get("/severity-distribution")
def severity_distribution(
    db: Session = Depends(get_db),
):

    result = (
        db.query(
            Inspection.severity,
            func.count(Inspection.id),
        )
        .group_by(Inspection.severity)
        .all()
    )

    severity_counts = defaultdict(int)

    for severity, count in result:

        key = severity if severity not in [None, "", "None"] else "None"

        severity_counts[key] += count

    return [
        {
            "severity": severity,
            "count": count,
        }
        for severity, count in severity_counts.items()
    ]