import os
import cv2
import json
import yaml
import numpy as np
import pandas as pd
from pathlib import Path
from ultralytics import YOLO

dataset_dir = Path("ai-model/yolo/dataset")
labels_dir = dataset_dir / "labels"
images_dir = dataset_dir / "images"

# 1. Dataset Analysis (Phase 2)
def analyze_dataset():
    stats = {}
    for split in ['train', 'val']:
        for label_file in (labels_dir / split).glob("*.txt"):
            with open(label_file, "r") as f:
                lines = f.readlines()
                for line in lines:
                    parts = line.strip().split()
                    if len(parts) > 0:
                        class_id = int(parts[0])
                        coords = np.array(parts[1:], dtype=float).reshape(-1, 2)
                        
                        # Calculate polygon area (normalized)
                        x = coords[:, 0]
                        y = coords[:, 1]
                        area = 0.5 * np.abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))
                        
                        if class_id not in stats:
                            stats[class_id] = {'train_imgs': set(), 'val_imgs': set(), 'instances': 0, 'areas': []}
                        
                        stats[class_id][f'{split}_imgs'].add(label_file.name)
                        stats[class_id]['instances'] += 1
                        stats[class_id]['areas'].append(area)
                        
    # Load taxonomy mapping
    with open("ai-model/yolo/taxonomy.json", "r") as f:
        taxonomy = json.load(f)
    
    id_to_name = {i: name for i, name in enumerate(taxonomy["classes"])}
    
    print("\n--- PHASE 2: TRAINING DATA ANALYSIS ---")
    print(f"{'Class':<25} | {'Train Imgs':<10} | {'Val Imgs':<10} | {'Instances':<10} | {'Avg Area':<10} | {'Min Area':<10} | {'Max Area':<10}")
    print("-" * 95)
    for cid in sorted(stats.keys()):
        class_name = id_to_name.get(cid, str(cid))
        train_count = len(stats[cid]['train_imgs'])
        val_count = len(stats[cid]['val_imgs'])
        instances = stats[cid]['instances']
        areas = stats[cid]['areas']
        avg_a = np.mean(areas) * 100
        min_a = np.min(areas) * 100
        max_a = np.max(areas) * 100
        print(f"{class_name:<25} | {train_count:<10} | {val_count:<10} | {instances:<10} | {avg_a:<10.4f}% | {min_a:<10.4f}% | {max_a:<10.4f}%")
        
    return stats, id_to_name

# 2. Image Resolution Analysis (Phase 4)
def analyze_resolution(stats, id_to_name):
    print("\n--- PHASE 4: IMAGE RESOLUTION ANALYSIS ---")
    critical_classes = ['capsule', 'screw', 'grid', 'pill', 'transistor', 'toothbrush', 'carpet']
    
    print(f"{'Class':<25} | {'Avg Px @640':<15} | {'Min Px @640':<15} | {'Avg Px @800':<15} | {'Avg Px @1024':<15}")
    print("-" * 95)
    
    for cid, data in stats.items():
        name = id_to_name.get(cid, "")
        is_critical = any(c in name for c in critical_classes)
        
        if is_critical or np.mean(data['areas']) < 0.005: # very small defects
            avg_area_norm = np.mean(data['areas'])
            min_area_norm = np.min(data['areas'])
            
            px_640 = avg_area_norm * (640 * 640)
            min_px_640 = min_area_norm * (640 * 640)
            px_800 = avg_area_norm * (800 * 800)
            px_1024 = avg_area_norm * (1024 * 1024)
            print(f"{name:<25} | {px_640:<15.1f} | {min_px_640:<15.1f} | {px_800:<15.1f} | {px_1024:<15.1f}")

if __name__ == "__main__":
    stats, id_to_name = analyze_dataset()
    analyze_resolution(stats, id_to_name)
