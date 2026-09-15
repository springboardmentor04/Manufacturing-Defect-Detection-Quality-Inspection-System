import sys
from pathlib import Path
import torch

base_dir = Path(r"c:\Users\ASUS\Desktop\AI infosys\visioninspect-ai\ai-model")
sys.path.append(str(base_dir))

from inference.infer import InferenceEngine

engine = InferenceEngine()

uploads = [
    r"c:\Users\ASUS\Desktop\AI infosys\visioninspect-ai\backend\uploads\21fba768-d826-4c9e-975d-a63d6dec2937.png",
    r"c:\Users\ASUS\Desktop\AI infosys\visioninspect-ai\backend\uploads\0ea08435-3f7f-4269-b14c-781edabf3a86.png"
]

for img_path in uploads:
    try:
        res = engine.infer(img_path, "carpet")
        print(f"{Path(img_path).name}: Prediction={res.prediction}, Score={res.anomaly_score}, Status={res.status}")
    except Exception as e:
        print(f"Exception: {e}")
