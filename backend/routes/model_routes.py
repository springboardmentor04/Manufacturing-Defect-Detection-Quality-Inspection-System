from fastapi import APIRouter, HTTPException
from services.model_training_data import MODEL_TRAINING_TELEMETRY, MODEL_EPOCH_HISTORY
from services.image_processing import get_preprocessing_specs

router = APIRouter(prefix="/api/model", tags=["YOLO Model Training & Metrics"])

@router.get("/metrics")
async def get_model_metrics():
    """
    Returns full YOLOv8 model training telemetry, 100-epoch progress history,
    hyperparameters, hardware benchmarks, and confusion matrix evaluation data.
    """
    return {
        "status": "success",
        "telemetry": MODEL_TRAINING_TELEMETRY,
        "epochHistory": MODEL_EPOCH_HISTORY
    }

@router.get("/preprocessing-pipeline")
async def get_pipeline():
    """
    Returns OpenCV image preprocessing specifications and filtering steps.
    """
    return {
        "status": "success",
        "specs": get_preprocessing_specs()
    }
