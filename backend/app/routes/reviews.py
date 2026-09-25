from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import require_role
from ..models import Inspection, QualityReview, AuditLog, Role, ReviewStatus
from ..schemas import ReviewRequest

router=APIRouter(prefix="/api/reviews", tags=["Reviews"])

@router.post("/{inspection_id}")
def review(inspection_id:int, payload:ReviewRequest, db:Session=Depends(get_db),
           user=Depends(require_role(Role.QUALITY_ENGINEER))):
    ins=db.get(Inspection, inspection_id)
    if not ins: raise HTTPException(404,"Inspection not found")
    if ins.review: raise HTTPException(409,"This inspection has already been reviewed")
    r=QualityReview(inspection_id=ins.id, reviewer_id=user.id, original_decision=ins.decision,
                    final_decision=payload.final_decision, comments=payload.comments)
    ins.review_status=ReviewStatus.REVIEWED
    db.add(r); db.add(AuditLog(user_id=user.id, action="MANUAL_REVIEW", resource_type="INSPECTION", resource_id=str(ins.id)))
    db.commit()
    return {"message":"Human review saved","original_decision":ins.decision.value,"final_decision":payload.final_decision.value}
