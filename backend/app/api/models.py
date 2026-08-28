from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.all_models import ModelVersion, User
from app.schemas.all_schemas import ModelVersionSchema
from app.api.deps import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[ModelVersionSchema])
def get_models(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Create a dummy model if none exists
    if db.query(ModelVersion).count() == 0:
        import datetime
        m = ModelVersion(
            name="YOLOv8-Base",
            version="1.0.0",
            dataset="MVTec-AD",
            precision=0.98,
            recall=0.97,
            f1_score=0.975,
            map_score=0.99,
            model_path="../ml/models/best.pt",
            status="active"
        )
        db.add(m)
        db.commit()

    return db.query(ModelVersion).all()

@router.post("/{model_id}/activate")
def activate_model(model_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
        
    # Deactivate all others
    db.query(ModelVersion).filter(ModelVersion.id != model_id).update({"status": "archived"})
    
    # Activate selected
    model.status = "active"
    db.commit()
    
    return {"message": "Model activated successfully", "model_id": model_id}
