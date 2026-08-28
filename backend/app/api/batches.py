from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.all_models import ProductionBatch
from app.schemas.all_schemas import BatchCreate, BatchResponse
from app.api.deps import get_current_active_user
from app.models.all_models import User

router = APIRouter()

@router.post("/", response_model=BatchResponse)
def create_batch(batch: BatchCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_batch = ProductionBatch(batch_number=batch.batch_number, product_id=batch.product_id)
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch

@router.get("/", response_model=List[BatchResponse])
def get_batches(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return db.query(ProductionBatch).offset(skip).limit(limit).all()

@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    batch = db.query(ProductionBatch).filter(ProductionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch
