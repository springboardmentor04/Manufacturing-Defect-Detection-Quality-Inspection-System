import os
import cv2
import numpy as np
import yaml
from pathlib import Path

base_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai/ai-model/yolo")
dataset_dir = base_dir / "dataset"
data_yaml = dataset_dir / "data.yaml"
out_dir = base_dir / "visual_verification"

def visualize():
    os.makedirs(out_dir, exist_ok=True)
    
    with open(data_yaml, "r") as f:
        data = yaml.safe_load(f)
    classes = data.get("names", {})
    
    # We want to verify these specific categories
    target_cats = ["carpet", "cable", "bottle", "capsule"]
    
    for split in ["train", "val", "test"]:
        img_dir = dataset_dir / "images" / split
        lbl_dir = dataset_dir / "labels" / split
        if not img_dir.exists(): continue
        
        for img_path in img_dir.glob("*.png"):
            # Check if this image belongs to our targets
            name = img_path.name
            is_target = any(name.startswith(cat + "_") for cat in target_cats)
            if not is_target:
                continue
                
            is_good = "_good_" in name
            
            # Check if we already generated enough samples for this category/goodness
            cat_prefix = name.split("_")[0]
            existing = list(out_dir.glob(f"{cat_prefix}_{'good' if is_good else 'defect'}*.png"))
            if len(existing) >= 3:
                continue
                
            # Read image
            img = cv2.imread(str(img_path))
            if img is None: continue
            h, w = img.shape[:2]
            
            # Read label
            lbl_path = lbl_dir / f"{img_path.stem}.txt"
            if lbl_path.exists():
                with open(lbl_path, "r") as f:
                    lines = f.readlines()
                    
                for line in lines:
                    parts = line.strip().split()
                    if len(parts) < 7: continue
                    
                    cls_id = int(parts[0])
                    cls_name = classes.get(cls_id, str(cls_id))
                    
                    coords = [float(p) for p in parts[1:]]
                    pts = []
                    for i in range(0, len(coords), 2):
                        px = int(coords[i] * w)
                        py = int(coords[i+1] * h)
                        pts.append([px, py])
                        
                    pts = np.array(pts, np.int32)
                    pts = pts.reshape((-1, 1, 2))
                    
                    # Draw polygon
                    cv2.polylines(img, [pts], True, (0, 0, 255), 2)
                    
                    # Draw transparent fill
                    overlay = img.copy()
                    cv2.fillPoly(overlay, [pts], (0, 0, 255))
                    cv2.addWeighted(overlay, 0.4, img, 0.6, 0, img)
                    
                    # Add label text
                    x, y, w_box, h_box = cv2.boundingRect(pts)
                    cv2.putText(img, cls_name, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                    
            out_name = f"{cat_prefix}_{'good' if is_good else 'defect'}_{img_path.stem}.png"
            cv2.imwrite(str(out_dir / out_name), img)
            print(f"Saved visualization: {out_name}")

if __name__ == "__main__":
    visualize()
