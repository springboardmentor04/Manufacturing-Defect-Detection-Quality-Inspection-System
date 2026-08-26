from ultralytics import YOLO
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent / "saved_models" / "best.pt"

print("Loading VisionInspect AI model...")
print(f"Model path: {MODEL_PATH}")

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

model = YOLO(str(MODEL_PATH))

print("VisionInspect AI model loaded successfully!")