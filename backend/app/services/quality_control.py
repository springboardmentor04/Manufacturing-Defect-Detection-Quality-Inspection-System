from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import Inspection, Defect

def make_pass_fail_decision(inspection_id: int, db: Session) -> str:
    """
    Evaluates automated Pass/Fail Quality Control decision for an inspection.
    
    Zero-Defect Quality Control Rule:
    - If defect_count > 0 or any defect records exist -> decision = 'fail'
    - If zero defects detected (defect_count == 0) -> decision = 'pass'
    
    Updates inspection.decision and inspection.decided_at in the database.
    """
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection with ID {inspection_id} not found"
        )

    # Count defects associated with this inspection
    defect_count = db.query(Defect).filter(Defect.inspection_id == inspection_id).count()
    
    if defect_count > 0 or (inspection.defect_count and inspection.defect_count > 0):
        decision = "fail"
    else:
        decision = "pass"

    inspection.decision = decision
    inspection.decided_at = datetime.utcnow()
    
    db.commit()
    db.refresh(inspection)
    return decision
