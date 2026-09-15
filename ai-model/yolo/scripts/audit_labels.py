import os
import json
import cv2
import numpy as np
from pathlib import Path
import random

def audit_labels():
    base_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai/ai-model/yolo")
    images_dir = base_dir / "dataset" / "images" / "train"
    labels_dir = base_dir / "dataset" / "labels" / "train"
    out_dir = base_dir / "scripts" / "audit_results"
    out_dir.mkdir(exist_ok=True)
    
    with open(base_dir / "taxonomy.json", 'r') as f:
        taxonomy = json.load(f)
    
    class_names = {i: name for i, name in enumerate(taxonomy["classes"])}
    
    categories = [
        "carpet", "cable", "bottle", "capsule", "pill", "metal_nut", "wood", "leather"
    ]
    
    all_images = list(images_dir.glob("*.png"))
    random.shuffle(all_images)
    
    selected_images = {}
    for cat in categories:
        selected_images[f"good_{cat}"] = None
        selected_images[f"defect_{cat}"] = None
        
    for img_path in all_images:
        name = img_path.name
        
        cat = name.split('_')[0]
        if cat not in categories:
            continue
            
        lbl_path = labels_dir / f"{img_path.stem}.txt"
        is_good = not lbl_path.exists() or lbl_path.stat().st_size == 0
        
        key = f"good_{cat}" if is_good else f"defect_{cat}"
        if selected_images[key] is None:
            selected_images[key] = (img_path, lbl_path)
            
        if all(v is not None for v in selected_images.values()):
            break
            
    for key, paths in selected_images.items():
        if paths is None:
            continue
            
        img_path, lbl_path = paths
        img = cv2.imread(str(img_path))
        if img is None:
            continue
            
        h, w = img.shape[:2]
        overlay = img.copy()
        
        if lbl_path.exists() and lbl_path.stat().st_size > 0:
            with open(lbl_path, 'r') as f:
                for line in f.readlines():
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        cls_id = int(parts[0])
                        cls_name = class_names.get(cls_id, str(cls_id))
                        coords = [float(x) for x in parts[1:]]
                        pts = []
                        for i in range(0, len(coords), 2):
                            pts.append([int(coords[i] * w), int(coords[i+1] * h)])
                        pts = np.array(pts, np.int32).reshape((-1, 1, 2))
                        
                        color = (0, 0, 255)
                        cv2.fillPoly(overlay, [pts], color)
                        cv2.putText(overlay, cls_name, (pts[0][0][0], pts[0][0][1] - 10), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                                    
        alpha = 0.5
        img = cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0)
        
        status = "GOOD" if key.startswith("good") else "DEFECT"
        cv2.putText(img, f"{status} - {key}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        out_path = out_dir / f"{key}.png"
        cv2.imwrite(str(out_path), img)
        print(f"Saved {out_path}")

if __name__ == '__main__':
    audit_labels()
