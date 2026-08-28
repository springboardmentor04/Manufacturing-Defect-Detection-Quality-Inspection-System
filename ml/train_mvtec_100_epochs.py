import os
import sys
import yaml
import json
from pathlib import Path
from ultralytics import YOLO

PROJECT_ROOT = Path("c:/Users/ramya/OneDrive/Desktop/project/VISionAi")
data_yaml = PROJECT_ROOT / "datasets/yolo_dataset/data.yaml"
output_dir = PROJECT_ROOT / "ml/models/mvtec_100_epochs"
output_dir.mkdir(parents=True, exist_ok=True)

print("="*100, flush=True)
print("STARTING 100-EPOCH RETRAINING OF 73-CLASS MVTEC DEFECT DETECTION MODEL", flush=True)
print(f"Dataset YAML: {data_yaml}")
print(f"Output Directory: {output_dir}")
print(f"Target Epochs: 100 (EXACTLY 100 EPOCHS)")
print("="*100, flush=True)

# 1. Verify data.yaml and 73 classes before starting
with open(data_yaml, "r", encoding="utf-8") as f:
    cfg = yaml.safe_load(f)

nc = cfg.get("nc", 0)
names = cfg.get("names", {})
print(f"Verified nc: {nc}")
print(f"Verified names count: {len(names)}")
assert nc == 73, f"Expected 73 classes, found {nc}"
assert len(names) == 73, f"Expected 73 names, found {len(names)}"

# 2. Train YOLO model with exactly 100 epochs
model = YOLO("yolov8n.pt")
results = model.train(
    data=str(data_yaml),
    epochs=100,
    imgsz=320,
    batch=32,
    workers=4,
    project=str(output_dir),
    name="weights",
    exist_ok=True,
    patience=25,
    save=True,
    verbose=True,
    plots=True
)

print("\n" + "="*100, flush=True)
print("100-EPOCH TRAINING COMPLETE. PROCEEDING TO VALIDATION...", flush=True)
print("="*100, flush=True)
