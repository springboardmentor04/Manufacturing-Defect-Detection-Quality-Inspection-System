"""
Counts how many label instances (bounding boxes) exist per class
in your train/val label folders. Helps diagnose class imbalance.

Usage:
    python count_class_instances.py
"""

import os
from collections import Counter

# ---- CONFIG: update if your paths differ ----
BASE = r"C:\Users\veene.LAPTOP-VQNJ8SHT\OneDrive\Infosys\intern\visioninspect-ai\visioninspect-ai\ml-training\multiclass_defect_dataset"
LABEL_DIRS = {
    "train": os.path.join(BASE, "labels", "train"),
    "val": os.path.join(BASE, "labels", "val"),
}

CLASS_NAMES = {
    0: "broken",
    1: "contamination",
    2: "crack",
    3: "cut",
    4: "deformation",
    5: "discoloration",
    6: "foreign_material",
    7: "hole",
    8: "missing_component",
    9: "other",
    10: "scratch",
}
# -----------------------------------------------

def count_labels(label_dir):
    counter = Counter()
    if not os.path.isdir(label_dir):
        print(f"WARNING: directory not found: {label_dir}")
        return counter
    for fname in os.listdir(label_dir):
        if not fname.endswith(".txt"):
            continue
        path = os.path.join(label_dir, fname)
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                cls_id = int(line.split()[0])
                counter[cls_id] += 1
    return counter

def main():
    all_counts = {}
    for split, path in LABEL_DIRS.items():
        all_counts[split] = count_labels(path)

    print(f"{'Class':<22}{'Train':>10}{'Val':>10}{'Total':>10}")
    print("-" * 52)
    for cls_id in sorted(CLASS_NAMES.keys()):
        name = CLASS_NAMES[cls_id]
        train_count = all_counts.get("train", {}).get(cls_id, 0)
        val_count = all_counts.get("val", {}).get(cls_id, 0)
        total = train_count + val_count
        print(f"{name:<22}{train_count:>10}{val_count:>10}{total:>10}")

if __name__ == "__main__":
    main()