import os
from pathlib import Path
from ultralytics import YOLO
import torch

def train_full():
    base_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai/ai-model/yolo")
    data_yaml = str(base_dir / "dataset" / "data.yaml")
    
    # Initialize a new YOLOv11n-seg model
    model = YOLO("yolo11n-seg.pt")
    
    device = "0" if torch.cuda.is_available() else "cpu"
    print(f"Starting FULL Training on device: {device}")
    
    # Train the model exactly according to audited config
    results = model.train(
        data=data_yaml,
        epochs=100,
        patience=20,
        imgsz=640,
        batch=4,
        device=device,
        project=str(base_dir / "models"),
        name="full_run",
        exist_ok=True, # Resume or overwrite safely
        verbose=False # Minimizing spam
    )
    print("Full training completed!")

if __name__ == '__main__':
    # Fix for ultralytics multiprocessing on windows
    import multiprocessing
    multiprocessing.freeze_support()
    train_full()
