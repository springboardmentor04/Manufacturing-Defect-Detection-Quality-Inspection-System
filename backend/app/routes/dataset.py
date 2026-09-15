from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from app.services.dataset import DatasetService
import os

router = APIRouter()

# Resolve path relative to backend root
# Assuming backend is visioninspect-ai/backend and dataset is visioninspect-ai/dataset/mvtec_ad
DATASET_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "dataset", "mvtec_ad")

def get_dataset_service() -> DatasetService:
    return DatasetService(dataset_path=DATASET_PATH)

@router.get("/overview", response_model=Dict[str, Any])
async def get_dataset_overview(service: DatasetService = Depends(get_dataset_service)):
    """Get high-level statistics and overview of the dataset."""
    return service.get_overview()

@router.get("/categories", response_model=List[Dict[str, Any]])
async def get_dataset_categories(service: DatasetService = Depends(get_dataset_service)):
    """Get detailed information for each available category."""
    return service.scan_categories()

@router.get("/health", response_model=Dict[str, Any])
async def get_dataset_health(service: DatasetService = Depends(get_dataset_service)):
    """Get validation and health report of the dataset structure."""
    return service.get_health_report()
