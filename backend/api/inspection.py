from fastapi import APIRouter, File, UploadFile, HTTPException
import shutil
import os
import json
from pathlib import Path

from model.predict import CNNDefectPredictor

router = APIRouter(prefix="/api/v1/inspection", tags=["Inspection"])

# Global state for predictor to avoid loading on every request
predictor_instance = None

def get_predictor() -> CNNDefectPredictor:
    global predictor_instance
    if predictor_instance is None:
        try:
            checkpoint_path = "model/checkpoints/best_model.pth"
            predictor_instance = CNNDefectPredictor(checkpoint_path=checkpoint_path)
        except FileNotFoundError as e:
            raise HTTPException(status_code=503, detail=f"Model not available. Please train it first. ({str(e)})")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error loading model: {str(e)}")
    return predictor_instance

@router.post("/predict")
async def predict_image(file: UploadFile = File(...)):
    """
    Endpoint to predict anomaly on an uploaded image using the Custom CNN model.
    """
    if not file:
        raise HTTPException(status_code=400, detail="Missing file")
        
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
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Corrupted or invalid image: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal prediction error: {str(e)}")
    finally:
        # Cleanup
        if temp_file_path.exists():
            os.remove(temp_file_path)

@router.get("/model-info")
async def get_model_info():
    """
    Endpoint to get info about the currently loaded Custom CNN model.
    Reads from the checkpoint and the evaluation_results.json.
    """
    try:
        predictor = get_predictor()
        config = predictor.config
        
        info = {
            "model_name": "Custom CNN",
            "model_version": "1.0",
            "category": config.get("category", "unknown"),
            "image_size": config.get("image_size", 224),
            "epochs_trained": config.get("trained_epochs", "unknown")
        }
        
        # Try to load evaluation metrics
        eval_path = Path("outputs/evaluation_results.json")
        if eval_path.exists():
            with open(eval_path, "r") as f:
                metrics = json.load(f)
                info["accuracy"] = metrics.get("accuracy")
                info["precision"] = metrics.get("precision")
                info["recall"] = metrics.get("recall")
                info["f1_score"] = metrics.get("f1_score")
        
        return info
        
    except HTTPException as e:
        return {"status": "not_loaded", "message": str(e.detail)}
