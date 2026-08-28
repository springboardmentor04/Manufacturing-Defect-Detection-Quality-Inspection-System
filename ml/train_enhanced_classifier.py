import os
import sys
import yaml
from pathlib import Path
from ultralytics import YOLO

PROJECT_ROOT = Path("C:/Users/ramya/OneDrive/Desktop/project/VISionAi")
data_dir = PROJECT_ROOT / "datasets/classifier_dataset"
output_dir = PROJECT_ROOT / "ml/models/defect_classifier_v2"
output_dir.mkdir(parents=True, exist_ok=True)

print("="*100, flush=True)
print("TRAINING ENHANCED 73-CLASS DEFECT CLASSIFIER (yolov8n-cls)", flush=True)
print("="*100, flush=True)

model = YOLO("yolov8n-cls.pt")
results = model.train(
    data=str(data_dir),
    epochs=20,
    imgsz=224,
    batch=32,
    workers=4,
    project=str(output_dir),
    name="weights",
    exist_ok=True,
    patience=8,
    save=True,
    verbose=True,
    plots=True
)

print("\nClassifier training completed.", flush=True)
