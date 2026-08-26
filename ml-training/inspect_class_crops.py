"""
Crops labeled defect regions (from YOLO .txt labels) out of your training
images and saves them into per-class folders so you can visually inspect
whether classes like "other" and "crack" are visually consistent.

Usage:
    python inspect_class_crops.py
Then open the "class_crops" folder and look through the images.
"""

import os
import cv2

# ---- CONFIG: update if your paths differ ----
BASE = r"C:\Users\veene.LAPTOP-VQNJ8SHT\OneDrive\Infosys\intern\visioninspect-ai\visioninspect-ai\ml-training\multiclass_defect_dataset"
IMAGES_DIR = os.path.join(BASE, "images", "train")
LABELS_DIR = os.path.join(BASE, "labels", "train")

OUTPUT_DIR = r"class_crops"

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

# Only inspect these classes (set to None to do all)
CLASSES_TO_INSPECT = ["other", "crack", "deformation"]

# Max crops to save per class (keep it manageable to look through)
MAX_CROPS_PER_CLASS = 30
# -----------------------------------------------

def yolo_to_box(x_center, y_center, w, h, img_w, img_h):
    x1 = int((x_center - w / 2) * img_w)
    y1 = int((y_center - h / 2) * img_h)
    x2 = int((x_center + w / 2) * img_w)
    y2 = int((y_center + h / 2) * img_h)
    return max(0, x1), max(0, y1), min(img_w, x2), min(img_h, y2)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    target_classes = CLASSES_TO_INSPECT if CLASSES_TO_INSPECT else list(CLASS_NAMES.values())

    counts = {name: 0 for name in target_classes}

    label_files = [f for f in os.listdir(LABELS_DIR) if f.endswith(".txt")]

    for label_file in label_files:
        if all(counts[c] >= MAX_CROPS_PER_CLASS for c in target_classes):
            break

        img_name = os.path.splitext(label_file)[0]
        img_path = None
        for ext in [".jpg", ".jpeg", ".png", ".bmp"]:
            candidate = os.path.join(IMAGES_DIR, img_name + ext)
            if os.path.isfile(candidate):
                img_path = candidate
                break
        if img_path is None:
            continue

        img = cv2.imread(img_path)
        if img is None:
            continue
        img_h, img_w = img.shape[:2]

        with open(os.path.join(LABELS_DIR, label_file), "r") as f:
            lines = [l.strip() for l in f if l.strip()]

        for idx, line in enumerate(lines):
            parts = line.split()
            cls_id = int(parts[0])
            cls_name = CLASS_NAMES.get(cls_id)
            if cls_name not in target_classes:
                continue
            if counts[cls_name] >= MAX_CROPS_PER_CLASS:
                continue

            x_c, y_c, w, h = map(float, parts[1:5])
            x1, y1, x2, y2 = yolo_to_box(x_c, y_c, w, h, img_w, img_h)
            crop = img[y1:y2, x1:x2]
            if crop.size == 0:
                continue

            class_dir = os.path.join(OUTPUT_DIR, cls_name)
            os.makedirs(class_dir, exist_ok=True)
            out_path = os.path.join(class_dir, f"{img_name}_{idx}.jpg")
            cv2.imwrite(out_path, crop)
            counts[cls_name] += 1

    print("Crops saved:")
    for name, count in counts.items():
        print(f"  {name}: {count} crops -> {os.path.abspath(os.path.join(OUTPUT_DIR, name))}")

if __name__ == "__main__":
    main()