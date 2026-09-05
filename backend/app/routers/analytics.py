from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, Inspection, Defect
from app.schemas import (
    DefectTrendItem,
    DefectTypeBreakdownItem,
    SeverityDistributionResponse
)
from app.auth import require_role
from app.routers.reports import parse_date_range

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/defect-trends", response_model=List[DefectTrendItem])
def get_defect_trends(
    period: str = Query("daily", pattern="^(daily|weekly)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(require_role("factory_supervisor")),
    db: Session = Depends(get_db)
):
    """
    GET /analytics/defect-trends
    RESTRICTED: factory_supervisor ONLY (403 for quality_engineer).
    Returns time-series metrics grouped by day or week.
    """
    start_dt, end_dt = parse_date_range(start_date, end_date)

    inspections = db.query(Inspection).filter(
        Inspection.created_at >= start_dt,
        Inspection.created_at <= end_dt
    ).order_by(Inspection.created_at.asc()).all()

    # Dictionary to aggregate time periods
    period_buckets = {}

    for insp in inspections:
        if not insp.created_at:
            continue

        if period == "weekly":
            # Group by year and ISO week number: "2026-W34" or "Week of MMM DD"
            year, week, _ = insp.created_at.isocalendar()
            # Calculate Monday of that week for clean label
            mon = insp.created_at - timedelta(days=insp.created_at.weekday())
            key = f"{year}-W{week:02d}"
            label = f"W{week} ({mon.strftime('%b %d')})"
        else:
            # Daily grouping: "YYYY-MM-DD"
            key = insp.created_at.strftime("%Y-%m-%d")
            label = insp.created_at.strftime("%b %d")

        if key not in period_buckets:
            period_buckets[key] = {
                "period_label": label,
                "total_inspections": 0,
                "total_defects": 0,
                "pass_count": 0,
                "fail_count": 0,
                "_sort_key": key
            }

        period_buckets[key]["total_inspections"] += 1
        defects = insp.defect_count or 0
        period_buckets[key]["total_defects"] += defects

        if insp.decision == "pass" or (insp.status == "completed" and defects == 0):
            period_buckets[key]["pass_count"] += 1
        elif insp.decision == "fail" or defects > 0:
            period_buckets[key]["fail_count"] += 1

    # If no data exists in date range, produce at least an empty or default day slot
    if not period_buckets:
        return []

    # Sort sequentially by date key
    sorted_items = sorted(period_buckets.values(), key=lambda x: x["_sort_key"])
    
    return [
        DefectTrendItem(
            period_label=item["period_label"],
            total_inspections=item["total_inspections"],
            total_defects=item["total_defects"],
            pass_count=item["pass_count"],
            fail_count=item["fail_count"]
        ) for item in sorted_items
    ]

@router.get("/defect-type-breakdown", response_model=List[DefectTypeBreakdownItem])
def get_defect_type_breakdown(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(require_role("factory_supervisor")),
    db: Session = Depends(get_db)
):
    """
    GET /analytics/defect-type-breakdown
    RESTRICTED: factory_supervisor ONLY (403 for quality_engineer).
    Returns count and average severity score grouped by defect type, sorted by count desc.
    """
    start_dt, end_dt = parse_date_range(start_date, end_date)

    # Query defects linked to inspections in the selected date range
    defects = db.query(Defect).join(Inspection, Defect.inspection_id == Inspection.id).filter(
        Inspection.created_at >= start_dt,
        Inspection.created_at <= end_dt
    ).all()

    type_aggregates = {}
    for d in defects:
        t = d.defect_type or "Unknown"
        if t not in type_aggregates:
            type_aggregates[t] = {
                "count": 0,
                "severity_sum": 0.0,
                "severity_count": 0
            }
        type_aggregates[t]["count"] += 1
        if d.severity_score is not None:
            type_aggregates[t]["severity_sum"] += d.severity_score
            type_aggregates[t]["severity_count"] += 1

    results = []
    for defect_type, agg in type_aggregates.items():
        avg_sev = round(agg["severity_sum"] / float(agg["severity_count"]), 2) if agg["severity_count"] > 0 else 0.0
        results.append(DefectTypeBreakdownItem(
            defect_type=defect_type,
            count=agg["count"],
            avg_severity_score=avg_sev
        ))

    # Sort by frequency descending
    results.sort(key=lambda x: x.count, reverse=True)
    return results

@router.get("/severity-distribution", response_model=SeverityDistributionResponse)
def get_severity_distribution(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(require_role("factory_supervisor")),
    db: Session = Depends(get_db)
):
    """
    GET /analytics/severity-distribution
    RESTRICTED: factory_supervisor ONLY (403 for quality_engineer).
    Returns total defect counts grouped into Critical, High, Medium, and Low severity bins.
    """
    start_dt, end_dt = parse_date_range(start_date, end_date)

    defects = db.query(Defect).join(Inspection, Defect.inspection_id == Inspection.id).filter(
        Inspection.created_at >= start_dt,
        Inspection.created_at <= end_dt
    ).all()

    critical_count = 0
    high_count = 0
    medium_count = 0
    low_count = 0

    for d in defects:
        level = d.severity_level
        # If level wasn't populated yet, compute from score or fallback
        if not level and d.severity_score is not None:
            if d.severity_score >= 80:
                level = "Critical"
            elif d.severity_score >= 60:
                level = "High"
            elif d.severity_score >= 40:
                level = "Medium"
            else:
                level = "Low"

        if level == "Critical":
            critical_count += 1
        elif level == "High":
            high_count += 1
        elif level == "Medium":
            medium_count += 1
        else:
            low_count += 1

    return SeverityDistributionResponse(
        critical_count=critical_count,
        high_count=high_count,
        medium_count=medium_count,
        low_count=low_count
    )
