from ultralytics import YOLO
import torch
import os

print("=" * 70)
print("VISIONINSPECT AI - YOLO FROM SCRATCH TRAINING")
print("=" * 70)

# Check device
print("PyTorch version:", torch.__version__)
print("CUDA available:", torch.cuda.is_available())
print("Device: CPU")

# ---------------------------------------------------------
# DATASET
# ---------------------------------------------------------
DATA = r"C:\Users\veene.LAPTOP-VQNJ8SHT\OneDrive\Infosys\intern\visioninspect-ai\visioninspect-ai\ml-training\mvtec_yolo_1200\data.yaml"

# ---------------------------------------------------------
# YOLO11n FROM SCRATCH
# ---------------------------------------------------------
# IMPORTANT:
# .yaml = architecture only
# pretrained=False = no pretrained weights
model = YOLO("yolo11n.yaml")

print("\nModel: YOLO11n")
print("Training: FROM SCRATCH")
print("Pretrained: False")
print("Dataset: MVTec 15 classes")
print("Training images: 1050")
print("Validation images: 859")

# ---------------------------------------------------------
# TRAINING
# ---------------------------------------------------------
results = model.train(
    data=DATA,

    # Training duration
    epochs=50,

    # Smaller image = faster CPU training
    imgsz=256,

    # CPU-friendly batch
    batch=8,

    # CPU
    device="cpu",
    workers=0,

    # Do NOT use pretrained weights
    pretrained=False,

    # Optimizer
    optimizer="AdamW",
    lr0=0.001,
    lrf=0.01,
    weight_decay=0.0005,
    warmup_epochs=1,

    # Augmentation
    hsv_h=0.01,
    hsv_s=0.3,
    hsv_v=0.2,
    degrees=2.0,
    translate=0.05,
    scale=0.15,
    fliplr=0.5,
    flipud=0.0,

    # Keep CPU training faster
    mosaic=0.1,
    mixup=0.0,

    # No image caching
    cache=False,

    # Validation
    val=True,

    # Save best model
    save=True,
    save_period=5,

    # Generate plots
    plots=True,

    # Output directory
    project=r"C:\Users\veene.LAPTOP-VQNJ8SHT\OneDrive\Infosys\intern\visioninspect-ai\visioninspect-ai\ml-training\runs",
    name="mvtec_yolo_1050_scratch",
    exist_ok=True
)

print("\n" + "=" * 70)
print("TRAINING COMPLETED")
print("=" * 70)

print("\nBest model should be located at:")
print(
    r"C:\Users\veene.LAPTOP-VQNJ8SHT\OneDrive\Infosys\intern\visioninspect-ai\visioninspect-ai\ml-training\runs\mvtec_yolo_1050_scratch\weights\best.pt"
)

print("\nTraining complete!")