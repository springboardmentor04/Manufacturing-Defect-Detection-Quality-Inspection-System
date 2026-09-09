from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.models.enums import RoleName
from app.models.inspection_image import InspectionImage
from app.schemas.dashboard import DashboardSummary


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    _current_user=Depends(require_role([RoleName.admin, RoleName.quality_engineer, RoleName.factory_supervisor])),
) -> DashboardSummary:
    total_images = db.scalar(select(func.count()).select_from(InspectionImage)) or 0

    status_rows = db.execute(
        select(InspectionImage.status, func.count()).group_by(InspectionImage.status)
    ).all()
    category_rows = db.execute(
        select(func.coalesce(InspectionImage.category, "uncategorized"), func.count())
        .group_by(func.coalesce(InspectionImage.category, "uncategorized"))
        .order_by(func.coalesce(InspectionImage.category, "uncategorized"))
    ).all()
    source_rows = db.execute(
        select(InspectionImage.source, func.count()).group_by(InspectionImage.source)
    ).all()

    return DashboardSummary(
        total_images=total_images,
        counts_by_status={status.value: count for status, count in status_rows},
        counts_by_category={category: count for category, count in category_rows},
        counts_by_source={source.value: count for source, count in source_rows},
    )
