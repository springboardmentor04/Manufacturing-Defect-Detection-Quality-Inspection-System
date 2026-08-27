from ultralytics import YOLO

model = YOLO(r"C:\Users\veene.LAPTOP-VQNJ8SHT\runs\detect\runs\multiclass_defect_detector_v3-3\weights\best.pt")

model.train(
    data=r"C:\Users\veene.LAPTOP-VQNJ8SHT\OneDrive\Infosys\intern\visioninspect-ai\visioninspect-ai\ml-training\multiclass_defect_dataset\data.yaml",
    epochs=30,
    imgsz=416,
    batch=16,
    device="cpu",
    patience=15,
    optimizer="AdamW",
    cls_pw=1.0,
    lr0=0.0005,
    cache=True,
    project="runs",
    name="multiclass_defect_detector_v4",
)