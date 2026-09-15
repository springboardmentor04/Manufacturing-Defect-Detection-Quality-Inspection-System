import os
import sys
from pathlib import Path
import json
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms
from PIL import Image

base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

from inference.infer import InferenceEngine
from config.config import config

engine = InferenceEngine()

carpet_good_dir = config.DATASET_PATH / "carpet" / "test" / "good"

for img_path in list(carpet_good_dir.glob("*.png"))[:5]:
    try:
        res = engine.infer(str(img_path), "carpet")
        print(f"{img_path.name}: Predicted {res.prediction} with score {res.anomaly_score}")
    except Exception as e:
        print(f"{img_path.name}: ERROR - {str(e)}")
