from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.models.enums import InspectionImageStatus, RoleName
from app.models.inspection_image import InspectionImage
from app.models.product import Product
from app.schemas.report import DefectTrendResponse, QualityReportResponse, QualityReportRow, SupervisorAnalyticsResponse

router = APIRouter(prefix="/reports", tags=["reports"])


import csv
import io
from fastapi.responses import StreamingResponse

@router.get("/quality/export")
def export_quality_reports(
    db: Session = Depends(get_db),
    _current_user=Depends(require_role([RoleName.admin, RoleName.quality_engineer, RoleName.factory_supervisor])),
):
    query = select(InspectionImage).order_by(InspectionImage.uploaded_at.desc())
    images = db.scalars(query).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["ID", "Filename", "Category", "Status", "Uploaded At"])
    
    # Write rows
    for image in images:
        writer.writerow([
            str(image.id),
            image.filename,
            image.category or "N/A",
            image.status.value,
            image.uploaded_at.isoformat() if image.uploaded_at else "N/A"
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=quality_report.csv"}
    )

@router.get("/quality", response_model=QualityReportResponse)
def get_quality_reports(
    from_date: Optional[datetime] = Query(default=None),
    to_date: Optional[datetime] = Query(default=None),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _current_user=Depends(require_role([RoleName.admin, RoleName.quality_engineer, RoleName.factory_supervisor])),
) -> QualityReportResponse:
    query = select(InspectionImage)
    if from_date is not None:
        query = query.where(InspectionImage.uploaded_at >= from_date)
    if to_date is not None:
        query = query.where(InspectionImage.uploaded_at <= to_date)
    if category is not None:
        query = query.where(InspectionImage.category == category)

    rows = [
        QualityReportRow(
            id=str(image.id),
            filename=image.filename,
            category=image.category,
            status=image.status.value,
            decision="pending" if image.status != InspectionImageStatus.processed else "pass",
            severity_score=None,
            uploaded_at=image.uploaded_at.isoformat(),
        )
        for image in db.scalars(query.order_by(InspectionImage.uploaded_at.desc())).all()
    ]
    return QualityReportResponse(rows=rows, total=len(rows))


@router.get("/analytics/defect-trends", response_model=DefectTrendResponse)
def get_defect_trends(
    interval: str = Query(default="day"),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _current_user=Depends(require_role([RoleName.admin, RoleName.factory_supervisor, RoleName.quality_engineer])),
) -> DefectTrendResponse:
    if interval not in {"day", "week", "month"}:
        interval = "day"

    query = select(InspectionImage.uploaded_at, func.count(InspectionImage.id)).group_by(InspectionImage.uploaded_at)
    if category is not None:
        query = query.where(InspectionImage.category == category)
    rows = db.execute(query).all()
    points = [DefectTrendPoint(bucket=row[0].strftime("%Y-%m-%d"), count=row[1]) for row in rows]
    return DefectTrendResponse(points=points)


@router.get("/analytics/supervisor", response_model=SupervisorAnalyticsResponse)
def get_supervisor_analytics(
    db: Session = Depends(get_db),
    _current_user=Depends(require_role([RoleName.admin, RoleName.factory_supervisor])),
) -> SupervisorAnalyticsResponse:
    total_images = db.scalar(select(func.count()).select_from(InspectionImage)) or 0
    processed = db.scalar(select(func.count()).where(InspectionImage.status == InspectionImageStatus.processed)) or 0
    pass_rate = round((processed / total_images) * 100, 2) if total_images else 0.0
    category_rows = db.execute(
        select(InspectionImage.category, func.count())
        .where(InspectionImage.category.isnot(None))
        .group_by(InspectionImage.category)
        .order_by(func.count().desc())
    ).all()
    defect_rate_by_category = {category: round(count / total_images * 100, 2) if total_images else 0.0 for category, count in category_rows}
    average_severity_score = 0.0
    return SupervisorAnalyticsResponse(
        total_images=total_images,
        pass_rate=pass_rate,
        average_severity_score=average_severity_score,
        defect_rate_by_category=defect_rate_by_category,
    )
