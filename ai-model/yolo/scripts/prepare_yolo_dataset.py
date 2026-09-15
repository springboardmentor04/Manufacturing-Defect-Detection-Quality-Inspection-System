import os
import sys
import json
import cv2
import numpy as np
import shutil
import random
from pathlib import Path
from tqdm import tqdm

base_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai")
dataset_dir = base_dir / "dataset" / "mvtec_ad"
yolo_dir = base_dir / "ai-model" / "yolo" / "dataset"
taxonomy_file = base_dir / "ai-model" / "yolo" / "taxonomy.json"

def create_dirs():
    if yolo_dir.exists():
        shutil.rmtree(yolo_dir)
        
    for split in ["train", "val", "test"]:
        os.makedirs(yolo_dir / "images" / split, exist_ok=True)
        os.makedirs(yolo_dir / "labels" / split, exist_ok=True)

def process_mask(mask_path, img_width, img_height, class_id):
    """Convert a mask image to YOLO segmentation polygons."""
    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
    if mask is None:
        return []
        
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    yolo_polygons = []
    for contour in contours:
        # Filter small contours
        if cv2.contourArea(contour) < 10:
            continue
            
        # YOLO requires flattened normalized coordinates: x1 y1 x2 y2 ...
        polygon = contour.flatten().tolist()
        if len(polygon) < 6: # Need at least 3 points
            continue
            
        normalized = []
        for i in range(0, len(polygon), 2):
            x = polygon[i] / img_width
            y = polygon[i+1] / img_height
            # Clip between 0 and 1
            x = max(0.0, min(1.0, x))
            y = max(0.0, min(1.0, y))
            normalized.extend([f"{x:.6f}", f"{y:.6f}"])
            
        yolo_polygons.append(f"{class_id} " + " ".join(normalized))
        
    return yolo_polygons

def main():
    print("Preparing YOLO Dataset...")
    
    with open(taxonomy_file, "r") as f:
        taxonomy = json.load(f)
        
    classes = taxonomy["classes"]
    class_to_id = {cls: idx for idx, cls in enumerate(classes)}
    
    create_dirs()
    
    samples = [] # List of tuples: (src_img_path, mask_path, class_id, is_good, unique_name)
    
    for cat in dataset_dir.iterdir():
        if not cat.is_dir(): continue
        
        # Process train/good
        train_good_dir = cat / "train" / "good"
        if train_good_dir.exists():
            for img_path in train_good_dir.glob("*.png"):
                unique_name = f"{cat.name}_train_good_{img_path.name}"
                samples.append((img_path, None, -1, True, unique_name))
                
        # Process test/good
        test_good_dir = cat / "test" / "good"
        if test_good_dir.exists():
            for img_path in test_good_dir.glob("*.png"):
                unique_name = f"{cat.name}_test_good_{img_path.name}"
                samples.append((img_path, None, -1, True, unique_name))
                
        # Process test/defects
        test_dir = cat / "test"
        if test_dir.exists():
            for subtype in test_dir.iterdir():
                if subtype.is_dir() and subtype.name != "good":
                    class_name = subtype.name
                    if class_name not in class_to_id:
                        print(f"WARNING: Unknown class {class_name}")
                        continue
                        
                    class_id = class_to_id[class_name]
                    mask_dir = cat / "ground_truth" / class_name
                    
                    for img_path in subtype.glob("*.png"):
                        mask_name = f"{img_path.stem}_mask{img_path.suffix}"
                        mask_path = mask_dir / mask_name
                        unique_name = f"{cat.name}_{class_name}_{img_path.name}"
                        
                        if mask_path.exists():
                            samples.append((img_path, mask_path, class_id, False, unique_name))
                        else:
                            print(f"WARNING: Missing mask for {img_path}")
                            
    print(f"Total samples collected: {len(samples)}")
    
    # Stratified split: group by class_id
    from collections import defaultdict
    samples_by_class = defaultdict(list)
    for s in samples:
        # Group by class_id. For Good images, class_id is -1.
        samples_by_class[s[2]].append(s)
        
    train_samples = []
    val_samples = []
    test_samples = []
    
    for cid, items in samples_by_class.items():
        random.seed(42)
        random.shuffle(items)
        
        n = len(items)
        n_train = int(0.8 * n)
        n_val = int(0.1 * n)
        
        train_samples.extend(items[:n_train])
        val_samples.extend(items[n_train:n_train+n_val])
        test_samples.extend(items[n_train+n_val:])
        
    print(f"Split sizes -> Train: {len(train_samples)}, Val: {len(val_samples)}, Test: {len(test_samples)}")
    
    def process_split(split_name, split_samples):
        for src_img, mask_path, class_id, is_good, unique_name in tqdm(split_samples, desc=f"Processing {split_name}"):
            dst_img = yolo_dir / "images" / split_name / unique_name
            dst_label = yolo_dir / "labels" / split_name / f"{Path(unique_name).stem}.txt"
            
            # Copy image
            shutil.copy2(src_img, dst_img)
            
            # Process label
            if is_good or mask_path is None:
                # Empty file for negative sample
                open(dst_label, 'w').close()
            else:
                img = cv2.imread(str(src_img))
                h, w = img.shape[:2]
                polygons = process_mask(mask_path, w, h, class_id)
                with open(dst_label, "w") as f:
                    for poly in polygons:
                        f.write(poly + "\n")
                        
    process_split("train", train_samples)
    process_split("val", val_samples)
    process_split("test", test_samples)
    
    # Generate data.yaml
    yaml_content = f"""path: {str(yolo_dir.absolute())}
train: images/train
val: images/val
test: images/test

nc: {len(classes)}
names:
"""
    for i, cls in enumerate(classes):
        yaml_content += f"  {i}: {cls}\n"
        
    with open(yolo_dir / "data.yaml", "w") as f:
        f.write(yaml_content)
        
    print("Dataset preparation complete!")
    print(f"Saved to: {yolo_dir}")

if __name__ == "__main__":
    main()
