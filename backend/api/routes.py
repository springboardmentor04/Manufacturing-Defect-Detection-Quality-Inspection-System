from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks
from pydantic import BaseModel
import shutil
import os
from pathlib import Path

from model.train import train_patchcore
from model.predictor import PatchCorePredictor
from model.evaluate import evaluate_patchcore

router = APIRouter(prefix="/api/v1/ml", tags=["Machine Learning"])

# Global state for predictor to avoid loading on every request
predictor_instance = None

def get_predictor() -> PatchCorePredictor:
    global predictor_instance
    if predictor_instance is None:
        try:
            # Assuming checkpoints are in backend/model/checkpoints
            predictor_instance = PatchCorePredictor(checkpoint_dir="model/checkpoints", category="bottle")
        except FileNotFoundError as e:
            raise HTTPException(status_code=503, detail=f"Model not trained or checkpoint missing: {str(e)}")
    return predictor_instance

class TrainRequest(BaseModel):
    dataset_path: str = "data/mvtec/bottle"
    category: str = "bottle"

@router.post("/train")
async def train_model(request: TrainRequest, background_tasks: BackgroundTasks):
    """
    Endpoint to trigger PatchCore training (building the memory bank).
    Runs in the background.
    """
    def train_task():
        try:
            train_patchcore(
                dataset_path=request.dataset_path,
                checkpoint_dir="model/checkpoints",
                category=request.category
            )
            # Reset predictor to force reload on next prediction
            global predictor_instance
            predictor_instance = None
        except Exception as e:
            print(f"Training failed: {e}")

    background_tasks.add_task(train_task)
    return {"status": "Training started in background", "category": request.category}

@router.post("/predict")
async def predict_image(file: UploadFile = File(...)):
    """
    Endpoint to predict anomaly on an uploaded image.
    """
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
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if temp_file_path.exists():
            os.remove(temp_file_path)

class EvaluateRequest(BaseModel):
    dataset_path: str = "data/mvtec/bottle"
    category: str = "bottle"

@router.post("/evaluate")
async def evaluate_model(request: EvaluateRequest):
    """
    Endpoint to evaluate the model on the test dataset.
    """
    try:
        metrics = evaluate_patchcore(
            dataset_path=request.dataset_path,
            checkpoint_dir="model/checkpoints",
            category=request.category
        )
        return {"status": "success", "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/model-info")
async def get_model_info():
    """
    Endpoint to get info about the currently loaded model.
    """
    try:
        predictor = get_predictor()
        return {
            "status": "loaded",
            "category": predictor.category,
            "config": predictor.config
        }
    except HTTPException:
        return {"status": "not_loaded", "message": "Model not trained yet."}
