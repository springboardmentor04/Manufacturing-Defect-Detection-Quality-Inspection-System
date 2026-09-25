from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func, case, desc
from ..database import get_db
from ..dependencies import current_user, require_role
from ..models import Inspection, Defect, Decision, Severity, Role

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/dashboard")
def dashboard(db: Session=Depends(get_db), user=Depends(current_user)):
    total=db.scalar(select(func.count(Inspection.id))) or 0
    defects=db.scalar(select(func.coalesce(func.sum(Inspection.defect_count),0))) or 0
    passed=db.scalar(select(func.count()).where(Inspection.decision==Decision.PASS)) or 0
    failed=db.scalar(select(func.count()).where(Inspection.decision==Decision.FAIL)) or 0
    review=db.scalar(select(func.count()).where(Inspection.decision==Decision.MANUAL_REVIEW)) or 0
    critical=db.scalar(select(func.count()).where(Inspection.severity_level==Severity.CRITICAL)) or 0
    high=db.scalar(select(func.count()).where(Inspection.severity_level==Severity.HIGH)) or 0
    avg=float(db.scalar(select(func.coalesce(func.avg(Inspection.processing_time_ms),0)))) 
    return {"total_inspections":total,"total_defects":defects,"defect_rate":round(defects/total*100,2) if total else 0,
            "pass_rate":round(passed/total*100,2) if total else 0,"fail_rate":round(failed/total*100,2) if total else 0,
            "manual_review_rate":round(review/total*100,2) if total else 0,"critical_defects":critical,
            "high_severity_defects":high,"average_inspection_time_ms":round(avg,2)}

@router.get("/defects")
def defect_distribution(db: Session=Depends(get_db), user=Depends(require_role(Role.PRODUCT_MANAGER, Role.QUALITY_ENGINEER))):
    rows=db.execute(select(Defect.defect_type, func.count(Defect.id)).group_by(Defect.defect_type).order_by(desc(func.count(Defect.id)))).all()
    return [{"label":r[0],"value":r[1]} for r in rows]

@router.get("/severity")
def severity_distribution(db: Session=Depends(get_db), user=Depends(require_role(Role.PRODUCT_MANAGER, Role.QUALITY_ENGINEER))):
    rows=db.execute(select(Inspection.severity_level, func.count(Inspection.id)).group_by(Inspection.severity_level)).all()
    return [{"label":r[0].value,"value":r[1]} for r in rows]

@router.get("/quality")
def quality_trend(db: Session=Depends(get_db), user=Depends(require_role(Role.PRODUCT_MANAGER, Role.QUALITY_ENGINEER))):
    rows=db.execute(select(func.date(Inspection.created_at), Inspection.decision, func.count(Inspection.id))
                    .group_by(func.date(Inspection.created_at), Inspection.decision)
                    .order_by(func.date(Inspection.created_at))).all()
    return [{"date":str(r[0]),"decision":r[1].value,"count":r[2]} for r in rows]
