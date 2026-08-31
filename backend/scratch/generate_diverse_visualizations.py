import os
import cv2
import json

YOLO_DATASET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../dataset_yolo"))
VIS_DIR = os.path.join(YOLO_DATASET_DIR, "visualizations")
os.makedirs(VIS_DIR, exist_ok=True)

# Load class mapping
with open(os.path.join(YOLO_DATASET_DIR, "class_mapping.json")) as f:
    class_mapping = json.load(f)

inv_class_mapping = {v: k for k, v in class_mapping.items()}

# Pick 12 samples from different categories
categories_to_sample = [
    "bottle_broken_large",
    "cable_bent_wire",
    "capsule_crack",
    "carpet_hole",
    "grid_bent",
    "hazelnut_crack",
    "leather_cut",
    "metal_nut_scratch",
    "pill_contamination",
    "screw_scratch_head",
    "tile_gray_stroke",
    "zipper_broken_teeth"
]

images_dir = os.path.join(YOLO_DATASET_DIR, "images", "train")
labels_dir = os.path.join(YOLO_DATASET_DIR, "labels", "train")

# Clean existing vis dir
for f in os.listdir(VIS_DIR):
    os.remove(os.path.join(VIS_DIR, f))

created_count = 0

for cname in categories_to_sample:
    # Find matching image
    matching_files = [f for f in os.listdir(images_dir) if f.startswith(cname)]
    if not matching_files:
        # Fallback search val/test
        for s in ["val", "test"]:
            s_img_dir = os.path.join(YOLO_DATASET_DIR, "images", s)
            s_lbl_dir = os.path.join(YOLO_DATASET_DIR, "labels", s)
            matching_files = [f for f in os.listdir(s_img_dir) if f.startswith(cname)]
            if matching_files:
                images_dir = s_img_dir
                labels_dir = s_lbl_dir
                break

    if not matching_files:
        continue

    sample_img_name = matching_files[0]
    sample_img_path = os.path.join(images_dir, sample_img_name)
    sample_lbl_path = os.path.join(labels_dir, os.path.splitext(sample_img_name)[0] + ".txt")

    if not os.path.exists(sample_lbl_path):
        continue

    cv_img = cv2.imread(sample_img_path)
    if cv_img is None:
        continue

    h, w, _ = cv_img.shape

    with open(sample_lbl_path) as lf:
        lines = [line.strip() for line in lf if line.strip()]

    for line in lines:
        parts = line.split()
        cid = int(parts[0])
        xc, yc, bw, bh = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])

        xmin = int((xc - bw / 2.0) * w)
        ymin = int((yc - bh / 2.0) * h)
        xmax = int((xc + bw / 2.0) * w)
        ymax = int((yc + bh / 2.0) * h)

        cls_text = inv_class_mapping.get(cid, cname)

        # Draw green box
        cv2.rectangle(cv_img, (xmin, ymin), (xmax, ymax), (0, 255, 0), 2)

        # Label banner
        banner_w = len(cls_text) * 10 + 10
        cv2.rectangle(cv_img, (xmin, max(0, ymin - 25)), (xmin + banner_w, max(0, ymin)), (0, 255, 0), -1)
        cv2.putText(cv_img, cls_text, (xmin + 3, max(16, ymin - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

    out_path = os.path.join(VIS_DIR, f"vis_{created_count+1:02d}_{cname}.png")
    cv2.imwrite(out_path, cv_img)
    created_count += 1

print(f"Generated {created_count} diverse bounding box visualizations in {VIS_DIR}")
