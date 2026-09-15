import os
import torch
from pathlib import Path

class Config:
    PROJECT_NAME = "VisionInspect AI"
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    
    # Paths
    BASE_DIR = Path(__file__).resolve().parents[2]
    DATASET_PATH = BASE_DIR / "dataset" / "mvtec_ad"
    WEIGHTS_PATH = BASE_DIR / "weights"
    LOGS_PATH = BASE_DIR / "logs"
    
    # Model parameters
    IMAGE_SIZE = (256, 256)
    BATCH_SIZE = 32
    MODEL_NAME = "efficientad"
    BACKBONE = "resnet18"
    FEATURE_DIM = 256
    EMBEDDING_SIZE = 512
    INPUT_SIZE = (256, 256)
    MODEL_VERSION = "1.0.0"
    
    # Production AI Configuration
    MULTI_MODEL_FORMAT = "model_{category}.pth"
    DEFAULT_MODEL = "production_model.pth" # Fallback
    MODEL_AUTHOR = "VisionInspect AI Team"
    MODEL_CREATED_DATE = "2026-08-06"
    INFERENCE_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    CONFIDENCE_THRESHOLD = 0.85
    USE_REAL_AI = False
    
    # Training parameters
    EPOCHS = 100
    LEARNING_RATE = 1e-4
    WEIGHT_DECAY = 1e-5
    CHECKPOINT_INTERVAL = 10
    SAVE_BEST_ONLY = True
    
    # Categories
    SUPPORTED_CATEGORIES = [
        "bottle", "cable", "capsule", "carpet", "grid",
        "hazelnut", "leather", "metal_nut", "pill", "screw",
        "tile", "toothbrush", "transistor", "wood", "zipper"
    ]
    
    # Device setup
    @property
    def DEVICE(self):
        return "cuda" if torch.cuda.is_available() else "cpu"

config = Config()
