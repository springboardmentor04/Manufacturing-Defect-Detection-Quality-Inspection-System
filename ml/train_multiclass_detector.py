import os
import sys
import yaml
import torch
from pathlib import Path
from ultralytics import YOLO

PROJECT_ROOT = Path("C:/Users/ramya/OneDrive/Desktop/project/VISionAi")
data_yaml = PROJECT_ROOT / "datasets/yolo_dataset/data.yaml"
output_dir = PROJECT_ROOT / "ml/models/mvtec_defect_model_v2"
output_dir.mkdir(parents=True, exist_ok=True)

print("="*100, flush=True)
print("BENCHMARKING TRAINING SPEED ON 10-CORE CPU", flush=True)
print("="*100, flush=True)

model = YOLO("yolov8n.pt")
results = model.train(
    data=str(data_yaml),
    epochs=15,
    imgsz=480,
    batch=16,
    workers=4,
    project=str(output_dir),
    name="weights",
    exist_ok=True,
    patience=5,
    save=True,
    verbose=True,
    plots=True
)

print("\nBenchmark training complete.", flush=True)
