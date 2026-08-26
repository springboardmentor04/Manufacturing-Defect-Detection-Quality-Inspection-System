from ultralytics import YOLO

model = YOLO("yolo11n.yaml")

results = model.train(
    data=r"C:\YOLO_DATASET\metal_nut\data.yaml",

    epochs=30,
    imgsz=320,
    batch=4,

    device="cpu",
    workers=0,

    optimizer="AdamW",
    lr0=0.001,
    lrf=0.01,
    weight_decay=0.0005,
    warmup_epochs=2,

    hsv_h=0.015,
    hsv_s=0.5,
    hsv_v=0.3,

    degrees=5,
    translate=0.1,
    scale=0.2,

    fliplr=0.5,
    flipud=0.0,

    mosaic=0.2,
    mixup=0.0,

    pretrained=False,
    cache=False,

    patience=8,

    project=r"C:\YOLO_TRAINING",
    name="metal_nut_balanced_scratch",
    exist_ok=True,

    plots=True,
    save=True,
    val=True
)