import os
import shutil
import random
from pathlib import Path
from ultralytics import YOLO

# MVTec AD categories
categories = [
    "bottle", "cable", "capsule", "carpet", "grid",
    "hazelnut", "leather", "metal_nut", "pill", "screw",
    "tile", "toothbrush", "transistor", "wood", "zipper"
]

base_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai")
dataset_dir = base_dir / "dataset" / "mvtec_ad"
yolo_base_dir = base_dir / "ai-model" / "yolo_cls_data"
models_dir = base_dir / "ai-model" / "weights" / "yolo_cls"

os.makedirs(models_dir, exist_ok=True)

def prepare_and_train():
    for category in categories:
        print(f"--- Processing {category} ---")
        cat_test_dir = dataset_dir / category / "test"
        
        if not cat_test_dir.exists():
            print(f"Skipping {category}: No test dir")
            continue
            
        yolo_cat_dir = yolo_base_dir / category
        os.makedirs(yolo_cat_dir / "train", exist_ok=True)
        os.makedirs(yolo_cat_dir / "val", exist_ok=True)
        
        defect_types = [d for d in cat_test_dir.iterdir() if d.is_dir() and d.name != "good"]
        
        if not defect_types:
            print(f"Skipping {category}: No defects found")
            continue
            
        for d in defect_types:
            defect_name = d.name
            images = list(d.glob("*.png"))
            random.shuffle(images)
            
            # 80-20 split
            split_idx = int(len(images) * 0.8)
            train_imgs = images[:split_idx]
            val_imgs = images[split_idx:]
            
            # Copy to YOLO format
            os.makedirs(yolo_cat_dir / "train" / defect_name, exist_ok=True)
            os.makedirs(yolo_cat_dir / "val" / defect_name, exist_ok=True)
            
            for img in train_imgs:
                shutil.copy(img, yolo_cat_dir / "train" / defect_name / img.name)
            for img in val_imgs:
                shutil.copy(img, yolo_cat_dir / "val" / defect_name / img.name)
                
        # Train YOLO model
        print(f"Training YOLO classifier for {category}...")
        model = YOLO("yolov8n-cls.pt")
        model.train(
            data=str(yolo_cat_dir),
            epochs=10,
            imgsz=256,
            batch=16,
            device=0,
            project=str(models_dir),
            name=category,
            exist_ok=True,
            verbose=False
        )

if __name__ == "__main__":
    prepare_and_train()
