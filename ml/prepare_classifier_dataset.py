import os
import cv2
import json
from pathlib import Path
from tqdm import tqdm

def main():
    project_root = Path(__file__).resolve().parent.parent
    yolo_dir = project_root / "datasets" / "yolo_dataset"
    classifier_dir = project_root / "datasets" / "classifier_dataset"

    if not yolo_dir.exists():
        print(f"YOLO dataset not found at {yolo_dir}")
        return

    mapping_path = yolo_dir / "class_mapping.json"
    if not mapping_path.exists():
        print("class_mapping.json not found")
        return

    with open(mapping_path, "r", encoding="utf-8") as f:
        class_mapping = json.load(f)

    # class_mapping is dict mapping str(class_id) to {"class_name": ..., "category": ..., "defect_type": ...}

    for split in ["train", "val"]:
        img_dir = yolo_dir / "images" / split
        lbl_dir = yolo_dir / "labels" / split
        
        if not img_dir.exists():
            continue
            
        print(f"\nProcessing {split} split...")
        for img_path in tqdm(list(img_dir.iterdir())):
            if img_path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                continue
                
            lbl_path = lbl_dir / f"{img_path.stem}.txt"
            if not lbl_path.exists():
                continue
                
            img = cv2.imread(str(img_path))
            if img is None:
                continue
                
            h, w = img.shape[:2]
            
            with open(lbl_path, "r", encoding="utf-8") as f:
                lines = f.read().strip().splitlines()
                
            for idx, line in enumerate(lines):
                parts = line.strip().split()
                if len(parts) != 5:
                    continue
                    
                class_id = parts[0]
                x_c, y_c, bw, bh = [float(p) for p in parts[1:]]
                
                # Convert YOLO normalized coords back to absolute pixel values
                box_w = bw * w
                box_h = bh * h
                box_x = (x_c * w) - (box_w / 2)
                box_y = (y_c * h) - (box_h / 2)
                
                # Add a small padding margin
                margin = 0.05
                px_margin_w = box_w * margin
                px_margin_h = box_h * margin
                
                x1 = int(max(0, box_x - px_margin_w))
                y1 = int(max(0, box_y - px_margin_h))
                x2 = int(min(w, box_x + box_w + px_margin_w))
                y2 = int(min(h, box_y + box_h + px_margin_h))
                
                if x2 <= x1 or y2 <= y1:
                    continue
                    
                crop = img[y1:y2, x1:x2]
                
                # Determine class name
                if class_id not in class_mapping:
                    continue
                
                class_info = class_mapping[class_id]
                class_name = class_info["class_name"]
                
                out_dir = classifier_dir / split / class_name
                out_dir.mkdir(parents=True, exist_ok=True)
                
                out_filename = f"{img_path.stem}_{idx}{img_path.suffix}"
                out_path = out_dir / out_filename
                
                cv2.imwrite(str(out_path), crop)

    print("\nDataset preparation complete.")
    print(f"Dataset stored at: {classifier_dir}")

if __name__ == "__main__":
    main()
