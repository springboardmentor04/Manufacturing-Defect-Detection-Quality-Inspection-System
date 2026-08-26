from ultralytics import YOLO

print("=" * 60)
print("YOLO11n TRAINING FROM SCRATCH")
print("=" * 60)

model = YOLO("yolo11n.yaml")

print("Architecture : YOLO11n")
print("Pretrained   : NO")
print("Training     : FROM SCRATCH")

results = model.train(
    data=r"C:\YOLO_DATASET\metal_nut_small\data.yaml",

    # Training
    epochs=15,
    imgsz=256,
    batch=4,

    # CPU
    device="cpu",
    workers=0,

    # Don't waste time waiting for unnecessary epochs
    patience=5,

    # Optimizer
    optimizer="AdamW",
    lr0=0.001,
    lrf=0.01,
    weight_decay=0.0005,
    warmup_epochs=1,

    # Light augmentation
    hsv_h=0.01,
    hsv_s=0.3,
    hsv_v=0.2,

    degrees=2.0,
    translate=0.05,
    scale=0.15,

    fliplr=0.5,
    flipud=0.0,

    mosaic=0.1,
    mixup=0.0,

    # IMPORTANT
    pretrained=False,

    # CPU/OneDrive: don't cache everything
    cache=False,

    # Output
    project=r"C:\YOLO_TRAINING",
    name="metal_nut_small_scratch",
    exist_ok=True,

    plots=True,
    save=True,
    val=True
)

print("=" * 60)
print("TRAINING COMPLETED")
print("=" * 60)

print(
    r"Best model: C:\YOLO_TRAINING\metal_nut_small_scratch\weights\best.pt"
)