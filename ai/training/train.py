from pathlib import Path
from ultralytics import YOLO

# ==========================================
# VisionInspect AI
# YOLOv8 Training Script
# ==========================================

DATA_YAML = Path("ai/yolo_dataset/data.yaml")

if not DATA_YAML.exists():
    raise FileNotFoundError(
        f"Dataset file not found: {DATA_YAML}"
    )

print("=" * 60)
print("VisionInspect AI")
print("YOLOv8 Training")
print("=" * 60)

# Load pretrained YOLOv8 Nano model
model = YOLO("yolov8n.pt")

# Start training
model.train(
    data=str(DATA_YAML),
    epochs=50,
    imgsz=640,
    batch=8,
    workers=2,
    project="ai/training",
    name="visioninspect",
    exist_ok=True,
)

print("\n✅ Training Completed!")