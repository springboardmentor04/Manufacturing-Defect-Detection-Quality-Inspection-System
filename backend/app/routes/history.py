from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from ..database import get_db
from ..dependencies import current_user
from ..models import Inspection, Decision, Severity, Role

router = APIRouter(prefix="/api/inspection-history", tags=["History"])

@router.get("")
def history(db: Session=Depends(get_db), user=Depends(current_user),
            search: str|None=None, decision: Decision|None=None, severity: Severity|None=None,
            page: int=Query(1, ge=1), limit: int=Query(20, ge=1, le=100)):
    stmt = select(Inspection).order_by(Inspection.created_at.desc())
    if search:
        stmt = stmt.where(Inspection.inspection_uuid.ilike(f"%{search}%"))
    if decision: stmt=stmt.where(Inspection.decision==decision)
    if severity: stmt=stmt.where(Inspection.severity_level==severity)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.offset((page-1)*limit).limit(limit)).all()
    return {"total":total, "page":page, "limit":limit, "inspections":[{
        "id":i.id, "inspection_uuid":i.inspection_uuid, "decision":i.decision.value,
        "severity_level":i.severity_level.value, "severity_score":i.severity_score,
        "highest_confidence":i.highest_confidence, "defect_count":i.defect_count,
        "processing_time_ms":i.processing_time_ms, "created_at":i.created_at.isoformat(),
    } for i in rows]}
