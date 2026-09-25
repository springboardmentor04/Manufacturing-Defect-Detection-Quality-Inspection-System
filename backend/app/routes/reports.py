from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..dependencies import current_user
from ..models import Inspection
from ..services.report_service import build_report

router=APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/{inspection_id}")
def report(inspection_id:int, db:Session=Depends(get_db), user=Depends(current_user)):
    ins=db.get(Inspection, inspection_id)
    if not ins: raise HTTPException(404,"Inspection not found")
    pdf=build_report(ins)
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition":f'attachment; filename="inspection-{ins.inspection_uuid}.pdf"'})
