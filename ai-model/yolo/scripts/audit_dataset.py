import os
import json
from pathlib import Path
from collections import defaultdict

def audit_dataset():
    base_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai/ai-model/yolo")
    images_dir = base_dir / "dataset" / "images"
    labels_dir = base_dir / "dataset" / "labels"
    
    with open(base_dir / "taxonomy.json", 'r') as f:
        taxonomy = json.load(f)
        
    class_names = {i: name for i, name in enumerate(taxonomy["classes"])}
    
    splits = ["train", "val", "test"]
    stats = {
        "total_images": 0,
        "split_counts": {"train": 0, "val": 0, "test": 0},
        "good_images": 0,
        "defective_images": 0,
        "empty_label_images": 0,
        "missing_labels": 0,
        "corrupted_images": 0,
        "class_counts": defaultdict(int),
        "instances_per_class": defaultdict(int),
        "all_image_names": {"train": set(), "val": set(), "test": set()}
    }
    
    for split in splits:
        img_split_dir = images_dir / split
        lbl_split_dir = labels_dir / split
        
        if not img_split_dir.exists():
            continue
            
        for img_path in img_split_dir.glob("*.png"):
            stats["total_images"] += 1
            stats["split_counts"][split] += 1
            stats["all_image_names"][split].add(img_path.name)
            
            if img_path.stat().st_size == 0:
                stats["corrupted_images"] += 1
                
            lbl_path = lbl_split_dir / f"{img_path.stem}.txt"
            if not lbl_path.exists():
                stats["missing_labels"] += 1
                continue
                
            if lbl_path.stat().st_size == 0:
                stats["empty_label_images"] += 1
                stats["good_images"] += 1
            else:
                stats["defective_images"] += 1
                with open(lbl_path, 'r') as f:
                    lines = f.readlines()
                    classes_in_image = set()
                    for line in lines:
                        parts = line.strip().split()
                        if parts:
                            cls_id = int(parts[0])
                            cls_name = class_names.get(cls_id, f"Unknown-{cls_id}")
                            stats["instances_per_class"][cls_name] += 1
                            classes_in_image.add(cls_name)
                    for cls_name in classes_in_image:
                        stats["class_counts"][cls_name] += 1

    print("============================================================")
    print("1. DATASET AUDIT")
    print("============================================================")
    print(f"Total Images: {stats['total_images']}")
    print(f"Train Images: {stats['split_counts']['train']}")
    print(f"Validation Images: {stats['split_counts']['val']}")
    print(f"Test Images: {stats['split_counts']['test']}")
    print(f"GOOD Images (empty labels): {stats['empty_label_images']}")
    print(f"Defective Images (with annotations): {stats['defective_images']}")
    print(f"Missing Labels: {stats['missing_labels']}")
    print(f"Corrupted Images (0 byte size): {stats['corrupted_images']}")
    
    print("\n============================================================")
    print("2. CLASS DISTRIBUTION")
    print("============================================================")
    print(f"Total Classes in Taxonomy: {len(class_names)}")
    print(f"{'Class Name':<25} | {'Images':<8} | {'Instances':<8}")
    print("-" * 50)
    for cls_name in sorted(class_names.values()):
        print(f"{cls_name:<25} | {stats['class_counts'][cls_name]:<8} | {stats['instances_per_class'][cls_name]:<8}")
        
    print("\n============================================================")
    print("4. TRAIN / VALIDATION / TEST LEAKAGE")
    print("============================================================")
    train_val_leak = len(stats["all_image_names"]["train"].intersection(stats["all_image_names"]["val"]))
    train_test_leak = len(stats["all_image_names"]["train"].intersection(stats["all_image_names"]["test"]))
    val_test_leak = len(stats["all_image_names"]["val"].intersection(stats["all_image_names"]["test"]))
    print(f"Train/Val Leakage: {train_val_leak} duplicates")
    print(f"Train/Test Leakage: {train_test_leak} duplicates")
    print(f"Val/Test Leakage: {val_test_leak} duplicates")
    
if __name__ == '__main__':
    audit_dataset()
