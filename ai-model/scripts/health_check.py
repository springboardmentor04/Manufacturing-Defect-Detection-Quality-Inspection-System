import sys
import torch
import torchvision
import cv2
from pathlib import Path

# Add the parent directory to the path so we can import our modules
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
sys.path.append(str(parent_dir))

from config.config import config
from dataset.manager import DatasetManager
from utils.logger import logger

def run_health_check():
    print("="*50)
    print(" VisionInspect AI - Health Check Report")
    print("="*50)
    
    # Environment Status
    print(f"Environment Status : {config.ENVIRONMENT.capitalize()}")
    
    # Python Version
    print(f"Python Version     : {sys.version.split(' ')[0]}")
    
    # PyTorch Version
    print(f"PyTorch Version    : {torch.__version__}")
    
    # Torchvision Version
    print(f"Torchvision Version: {torchvision.__version__}")
    
    # OpenCV Version
    print(f"OpenCV Version     : {cv2.__version__}")
    
    # Device setup
    cuda_avail = torch.cuda.is_available()
    print(f"CUDA Available     : {'Yes' if cuda_avail else 'No'}")
    print(f"Current Device     : {config.DEVICE}")
    
    # Dataset Checks
    ds_manager = DatasetManager()
    validation_report = ds_manager.validate_dataset()
    
    print(f"Dataset Found      : {'Yes' if validation_report['dataset_exists'] else 'No'}")
    print(f"Total Categories   : {len(ds_manager.get_categories())}")
    
    if validation_report["is_valid"]:
        print("Dataset Validation : PASSED")
    else:
        print("Dataset Validation : FAILED (check logs for details)")
        
    print("-" * 50)
    
    # AI Model Checks
    from model_registry import ModelRegistry
    import os
    
    registry = ModelRegistry()
    model_path = registry.get_production_model_path()
    found = model_path.exists()
    
    print(f"Production Model Found: {'Yes' if found else 'No'}")
    
    metadata = registry.get_model_metadata()
    version = metadata.get("Version", config.MODEL_VERSION) if metadata else config.MODEL_VERSION
    print(f"Model Version         : {version}")
    
    size_mb = os.path.getsize(model_path) / (1024 * 1024) if found else 0
    print(f"Model Size            : {size_mb:.2f} MB")
    
    device = getattr(config, 'INFERENCE_DEVICE', 'cpu').upper()
    print(f"Device                : {device}")
    
    print(f"Inference Ready       : {'Yes' if found else 'No'}")
        
    print("="*50)

if __name__ == "__main__":
    logger.info("Running AI health check script")
    run_health_check()
