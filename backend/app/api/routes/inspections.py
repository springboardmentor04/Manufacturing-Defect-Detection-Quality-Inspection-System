from __future__ import annotations

from typing import Optional
from uuid import UUID

import os
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, Query, File, UploadFile, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
import random

from app.core.dependencies import get_db, require_role
from app.models.enums import RoleName
from app.models.inspection_image import InspectionImage
from app.schemas.inspection import InspectionDetailResponse, InspectionListResponse, InspectionListItem, InspectionDefect
from app.services.scoring import calculate_severity_score, get_severity_level

try:
    from model.predict import CNNDefectPredictor
except ImportError:
    import sys
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
    from model.predict import CNNDefectPredictor

router = APIRouter(prefix="/inspections", tags=["inspections"])

predictor_instance = None
def get_predictor() -> CNNDefectPredictor:
    global predictor_instance
    if predictor_instance is None:
        try:
            base_dir = Path(__file__).parent.parent.parent.parent
            checkpoint_path = base_dir / "model" / "checkpoints" / "best_model.pth"
            predictor_instance = CNNDefectPredictor(checkpoint_path=str(checkpoint_path))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error loading model: {str(e)}")
    return predictor_instance

@router.post("/predict")
async def predict_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _current_user=Depends(require_role([RoleName.admin, RoleName.quality_engineer, RoleName.factory_supervisor])),
):
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")

    predictor = get_predictor()
    
    # Save uploaded file temporarily
    temp_dir = Path("temp_uploads")
    temp_dir.mkdir(exist_ok=True)
    temp_file_path = temp_dir / file.filename
    
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Run prediction
        result = predictor.predict(str(temp_file_path))
        prediction = result.get("prediction", "Unknown")
        confidence = result.get("confidence", 0.0)
        
        is_good = (prediction == "good")
        
        # Save to DB so it appears in reports
        from app.models.enums import InspectionImageSource, InspectionImageStatus
        
        new_image = InspectionImage(
            filename=file.filename,
            storage_path="temporary_prediction",
            source=InspectionImageSource.manual_upload,
            category=prediction,
            status=InspectionImageStatus.processed,
            uploaded_by=_current_user.id if _current_user else None
        )
        db.add(new_image)
        db.commit()
        

        if is_good:
            return {
                "prediction": prediction,
                "confidence": confidence,
                "severityLevel": "Low",
                "calculatedScore": 0,
                "defectType": "None",
                "sizeScore": 0,
                "locationScore": 0,
                "defectTypeScore": 0,
                "status": "Pass",
            }
        else:
            return {
                "prediction": prediction,
                "confidence": confidence,
                "severityLevel": "High",
                "calculatedScore": 85,
                "defectType": prediction.capitalize(),
                "sizeScore": 85,
                "locationScore": 85,
                "defectTypeScore": 85,
                "status": "Flagged",
            }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Corrupted or invalid image: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal prediction error: {str(e)}")
    finally:
        if temp_file_path.exists():
            os.remove(temp_file_path)


@router.get("/{image_id}", response_model=InspectionDetailResponse)
def get_inspection_detail(
    image_id: UUID,
    db: Session = Depends(get_db),
    _current_user=Depends(require_role([RoleName.admin, RoleName.quality_engineer, RoleName.factory_supervisor])),
) -> InspectionDetailResponse:
    image = db.scalar(select(InspectionImage).where(InspectionImage.id == image_id))
    if image is None:
        raise LookupError("Inspection not found")

    mock_size = 85.0
    mock_location = 90.0
    mock_type = 95.0
    mock_confidence = 92.0
    
    calc_score = calculate_severity_score(mock_size, mock_location, mock_type, mock_confidence)
    calc_level = get_severity_level(calc_score)

    return InspectionDetailResponse(
        id=image.id,
        filename=image.filename,
        category=image.category,
        status=image.status.value,
        decision="Reject Product and Trigger Quality Inspection Workflow" if calc_level == "Critical" else "Review",
        severity_score=calc_score,
        severity_level=calc_level,
        defects=[
            InspectionDefect(
                defect_type="Surface Crack",
                location="Functional Component Area",
                size_score=mock_size,
                confidence=mock_confidence,
                severity_breakdown={"size": mock_size, "location": mock_location, "type": mock_type, "confidence": mock_confidence},
            )
        ],
        timestamp=image.uploaded_at,
        inspector=None,
    )


@router.get("/", response_model=InspectionListResponse)
def list_inspections(
    status: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _current_user=Depends(require_role([RoleName.admin, RoleName.quality_engineer, RoleName.factory_supervisor])),
) -> InspectionListResponse:
    query = select(InspectionImage)
    if status is not None:
        query = query.where(InspectionImage.status == status)
    if category is not None:
        query = query.where(InspectionImage.category == category)

    total = db.scalar(select(__import__('sqlalchemy').func.count()).select_from(InspectionImage)) or 0
    rows = db.scalars(query.order_by(InspectionImage.uploaded_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    items = [
        InspectionListItem(
            id=image.id,
            filename=image.filename,
            category=image.category,
            status=image.status.value,
            decision="pending",
            severity_score=None,
            uploaded_at=image.uploaded_at,
            uploaded_by=image.uploaded_by,
        )
        for image in rows
    ]
    return InspectionListResponse(items=items, total=total, page=page, page_size=page_size)
