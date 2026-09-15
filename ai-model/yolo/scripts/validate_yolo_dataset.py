import os
import cv2
import yaml
from pathlib import Path

base_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai/ai-model/yolo")
dataset_dir = base_dir / "dataset"
data_yaml = dataset_dir / "data.yaml"

def validate_dataset():
    if not data_yaml.exists():
        print(f"ERROR: {data_yaml} not found.")
        return
        
    with open(data_yaml, "r") as f:
        data = yaml.safe_load(f)
        
    num_classes = data.get("nc", 0)
    print(f"Loaded data.yaml with {num_classes} classes.")
    
    stats = {
        "total_images": 0,
        "total_good": 0,
        "total_defective": 0,
        "total_labels": 0,
        "invalid_coords": 0,
        "invalid_classes": 0,
        "missing_labels": 0,
        "broken_images": 0
    }
    
    for split in ["train", "val", "test"]:
        img_dir = dataset_dir / "images" / split
        lbl_dir = dataset_dir / "labels" / split
        
        if not img_dir.exists(): continue
        
        for img_path in img_dir.glob("*.png"):
            stats["total_images"] += 1
            
            # Check if image is broken by checking file size
            if img_path.stat().st_size == 0:
                stats["broken_images"] += 1
                print(f"ERROR: Broken/Empty image {img_path}")
                continue
                
            lbl_path = lbl_dir / f"{img_path.stem}.txt"
            if not lbl_path.exists():
                stats["missing_labels"] += 1
                print(f"ERROR: Missing label file for {img_path}")
                continue
                
            with open(lbl_path, "r") as f:
                lines = f.readlines()
                
            if len(lines) == 0:
                stats["total_good"] += 1 # Empty file means good image
            else:
                stats["total_defective"] += 1
                stats["total_labels"] += len(lines)
                
                for i, line in enumerate(lines):
                    parts = line.strip().split()
                    if len(parts) < 7: # class_id + at least 3 points (x,y)
                        print(f"ERROR: Invalid polygon in {lbl_path}, line {i}")
                        continue
                        
                    cls_id = int(parts[0])
                    if cls_id < 0 or cls_id >= num_classes:
                        stats["invalid_classes"] += 1
                        print(f"ERROR: Invalid class ID {cls_id} in {lbl_path}")
                        
                    coords = [float(p) for p in parts[1:]]
                    for c in coords:
                        if c < 0.0 or c > 1.0:
                            stats["invalid_coords"] += 1
                            print(f"ERROR: Out of bounds coordinate {c} in {lbl_path}")
                            break
                            
    print("\n==========================================")
    print("YOLO Dataset Validation Statistics")
    print("==========================================")
    for k, v in stats.items():
        print(f"{k}: {v}")
        
    print("\nValidation Result: ", end="")
    errors = stats["invalid_coords"] + stats["invalid_classes"] + stats["missing_labels"] + stats["broken_images"]
    if errors > 0:
        print(f"FAILED ({errors} errors found)")
    else:
        print("PASSED (All labels and coordinates are valid)")

if __name__ == "__main__":
    validate_dataset()
