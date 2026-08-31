import os
import sys
import json
import random
import shutil
import cv2
import numpy as np
from PIL import Image

# Directories
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
SOURCE_DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset")
YOLO_DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset_yolo")

# Random seed for reproducible 70/15/15 stratified split
RANDOM_SEED = 42
random.seed(RANDOM_SEED)

TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

def run_conversion():
    print(f"[YOLO CONVERSION] Reading source MVTec AD dataset from: {SOURCE_DATASET_DIR}")
    print(f"[YOLO CONVERSION] Target YOLO dataset directory: {YOLO_DATASET_DIR}")

    if not os.path.exists(SOURCE_DATASET_DIR):
        print(f"ERROR: Source dataset path not found: {SOURCE_DATASET_DIR}")
        return

    # 1. Discover all 15 Categories & 73 Defect Sub-Classes
    categories = sorted([d for d in os.listdir(SOURCE_DATASET_DIR) if os.path.isdir(os.path.join(SOURCE_DATASET_DIR, d))])
    
    class_mapping = {}
    class_names = []
    class_id_counter = 0

    category_defect_map = {}

    for cat in categories:
        cat_dir = os.path.join(SOURCE_DATASET_DIR, cat)
        test_dir = os.path.join(cat_dir, "test")
        
        category_defect_map[cat] = {
            "good_train": [],
            "good_test": [],
            "defects": {}
        }

        # Train good images
        train_good_dir = os.path.join(cat_dir, "train", "good")
        if os.path.exists(train_good_dir):
            train_good_files = [f for f in os.listdir(train_good_dir) if not f.startswith(".") and f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            category_defect_map[cat]["good_train"] = [os.path.join(train_good_dir, f) for f in train_good_files]

        # Test good & defect subdirs
        if os.path.exists(test_dir):
            subdirs = sorted([d for d in os.listdir(test_dir) if os.path.isdir(os.path.join(test_dir, d))])
            for sub in subdirs:
                sub_path = os.path.join(test_dir, sub)
                sub_files = sorted([f for f in os.listdir(sub_path) if not f.startswith(".") and f.lower().endswith(('.png', '.jpg', '.jpeg'))])
                
                if sub == "good":
                    category_defect_map[cat]["good_test"] = [os.path.join(sub_path, f) for f in sub_files]
                else:
                    # Unique class name: e.g. bottle_broken_large
                    full_class_name = f"{cat}_{sub}"
                    if full_class_name not in class_mapping:
                        class_mapping[full_class_name] = class_id_counter
                        class_names.append(full_class_name)
                        class_id_counter += 1
                    
                    category_defect_map[cat]["defects"][sub] = {
                        "class_id": class_mapping[full_class_name],
                        "class_name": full_class_name,
                        "images": [os.path.join(sub_path, f) for f in sub_files]
                    }

    print(f"[YOLO CONVERSION] Discovered {len(categories)} categories and {len(class_mapping)} defect classes.")

    # 2. Reset / Create YOLO dataset directory structure
    if os.path.exists(YOLO_DATASET_DIR):
        shutil.rmtree(YOLO_DATASET_DIR)

    splits = ["train", "val", "test"]
    for s in splits:
        os.makedirs(os.path.join(YOLO_DATASET_DIR, "images", s), exist_ok=True)
        os.makedirs(os.path.join(YOLO_DATASET_DIR, "labels", s), exist_ok=True)
    
    vis_dir = os.path.join(YOLO_DATASET_DIR, "visualizations")
    os.makedirs(vis_dir, exist_ok=True)

    # Metrics Tracking
    split_counts = {
        "train": {"images": 0, "good": 0, "defective": 0, "boxes": 0},
        "val": {"images": 0, "good": 0, "defective": 0, "boxes": 0},
        "test": {"images": 0, "good": 0, "defective": 0, "boxes": 0}
    }
    
    class_stats = {cls_name: {"images": 0, "boxes": 0, "train": 0, "val": 0, "test": 0} for cls_name in class_names}
    
    total_images_processed = 0
    total_boxes_generated = 0
    empty_masks_count = 0
    verification_errors = []
    converted_samples_for_vis = []

    # 3. Process Defective Annotated Images (70% Train, 15% Val, 15% Test per Class)
    print("\n[YOLO CONVERSION] Converting defective masks to YOLO bounding boxes...")

    for cat in categories:
        cat_dir = os.path.join(SOURCE_DATASET_DIR, cat)
        gt_root = os.path.join(cat_dir, "ground_truth")

        for defect_sub, def_data in category_defect_map[cat]["defects"].items():
            cls_id = def_data["class_id"]
            cls_name = def_data["class_name"]
            img_paths = def_data["images"]

            # Shuffle deterministically
            img_paths_shuffled = list(img_paths)
            random.shuffle(img_paths_shuffled)

            n_total = len(img_paths_shuffled)
            n_train = int(n_total * TRAIN_RATIO)
            n_val = int(n_total * VAL_RATIO)
            
            # Ensure at least 1 image in train/val if small
            if n_train == 0 and n_total > 0:
                n_train = max(1, n_total - 2)
            if n_val == 0 and (n_total - n_train) > 1:
                n_val = 1

            for idx, img_path in enumerate(img_paths_shuffled):
                if idx < n_train:
                    split_name = "train"
                elif idx < n_train + n_val:
                    split_name = "val"
                else:
                    split_name = "test"

                filename = os.path.basename(img_path)
                stem = os.path.splitext(filename)[0]

                # Find corresponding mask
                def_gt_dir = os.path.join(gt_root, defect_sub)
                possible_masks = [f"{stem}_mask.png", f"{stem}_mask.PNG", f"{stem}.png", f"{stem}.PNG"]
                mask_path = None
                for pmn in possible_masks:
                    cand = os.path.join(def_gt_dir, pmn)
                    if os.path.exists(cand):
                        mask_path = cand
                        break

                if not mask_path:
                    verification_errors.append(f"Missing mask for image: {img_path}")
                    continue

                # Read image dimensions
                with Image.open(img_path) as img:
                    img_w, img_h = img.size

                # Read mask and extract connected components
                mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
                if mask is None:
                    verification_errors.append(f"Failed to read mask image: {mask_path}")
                    continue

                # Binarize mask
                _, binary_mask = cv2.threshold(mask, 1, 255, cv2.THRESH_BINARY)
                
                # Find connected components
                num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary_mask, connectivity=8)

                boxes = []
                for label_idx in range(1, num_labels):  # Skip background (0)
                    area = stats[label_idx, cv2.CC_STAT_AREA]
                    if area < 5:  # Filter noise (< 5 pixels)
                        continue

                    x_min = stats[label_idx, cv2.CC_STAT_LEFT]
                    y_min = stats[label_idx, cv2.CC_STAT_TOP]
                    box_w = stats[label_idx, cv2.CC_STAT_WIDTH]
                    box_h = stats[label_idx, cv2.CC_STAT_HEIGHT]

                    # Normalize YOLO format: x_center, y_center, width, height (0.0 to 1.0)
                    x_center = min(max((x_min + box_w / 2.0) / float(img_w), 0.0), 1.0)
                    y_center = min(max((y_min + box_h / 2.0) / float(img_h), 0.0), 1.0)
                    norm_w = min(max(box_w / float(img_w), 0.0001), 1.0)
                    norm_h = min(max(box_h / float(img_h), 0.0001), 1.0)

                    # Validation checks
                    if not (0.0 <= x_center <= 1.0 and 0.0 <= y_center <= 1.0 and norm_w > 0.0 and norm_h > 0.0):
                        verification_errors.append(f"Invalid bbox coordinates in {img_path}: {x_center}, {y_center}, {norm_w}, {norm_h}")

                    boxes.append((cls_id, x_center, y_center, norm_w, norm_h))

                if len(boxes) == 0:
                    empty_masks_count += 1
                    # Handle empty mask: fallback to full image or minimal box if labeled defective
                    x_center, y_center, norm_w, norm_h = 0.5, 0.5, 0.1, 0.1
                    boxes.append((cls_id, x_center, y_center, norm_w, norm_h))

                # Output filename to prevent name collisions
                dest_filename = f"{cat}_{defect_sub}_{filename}"
                dest_stem = os.path.splitext(dest_filename)[0]

                target_img_path = os.path.join(YOLO_DATASET_DIR, "images", split_name, dest_filename)
                target_label_path = os.path.join(YOLO_DATASET_DIR, "labels", split_name, f"{dest_stem}.txt")

                # Copy image
                shutil.copy2(img_path, target_img_path)

                # Write label .txt file
                with open(target_label_path, "w") as lf:
                    for b in boxes:
                        lf.write(f"{b[0]} {b[1]:.6f} {b[2]:.6f} {b[3]:.6f} {b[4]:.6f}\n")

                # Update stats
                total_images_processed += 1
                total_boxes_generated += len(boxes)
                
                split_counts[split_name]["images"] += 1
                split_counts[split_name]["defective"] += 1
                split_counts[split_name]["boxes"] += len(boxes)

                class_stats[cls_name]["images"] += 1
                class_stats[cls_name]["boxes"] += len(boxes)
                class_stats[cls_name][split_name] += 1

                # Save sample for visualization
                if len(converted_samples_for_vis) < 25 and len(boxes) > 0:
                    converted_samples_for_vis.append({
                        "image_path": target_img_path,
                        "class_name": cls_name,
                        "boxes": boxes,
                        "orig_w": img_w,
                        "orig_h": img_h
                    })

    # 4. Process Normal / Good Background Images (70% Train, 15% Val, 15% Test)
    print("[YOLO CONVERSION] Processing normal background images (negative samples for false-positive reduction)...")

    for cat in categories:
        all_good_images = category_defect_map[cat]["good_train"] + category_defect_map[cat]["good_test"]
        random.shuffle(all_good_images)

        n_total_good = len(all_good_images)
        n_train_good = int(n_total_good * TRAIN_RATIO)
        n_val_good = int(n_total_good * VAL_RATIO)

        for idx, img_path in enumerate(all_good_images):
            if idx < n_train_good:
                split_name = "train"
            elif idx < n_train_good + n_val_good:
                split_name = "val"
            else:
                split_name = "test"

            filename = os.path.basename(img_path)
            dest_filename = f"{cat}_good_{filename}"
            dest_stem = os.path.splitext(dest_filename)[0]

            target_img_path = os.path.join(YOLO_DATASET_DIR, "images", split_name, dest_filename)
            target_label_path = os.path.join(YOLO_DATASET_DIR, "labels", split_name, f"{dest_stem}.txt")

            # Copy image
            shutil.copy2(img_path, target_img_path)

            # Write empty label file (YOLO standard for negative background images)
            open(target_label_path, "w").close()

            total_images_processed += 1
            split_counts[split_name]["images"] += 1
            split_counts[split_name]["good"] += 1

    # 5. Generate dataset.yaml
    yaml_content = f"""# VisionInspect AI - MVTec AD YOLO Object Detection Dataset Configuration
path: {YOLO_DATASET_DIR.replace('\\', '/')}
train: images/train
val: images/val
test: images/test

# Number of classes
nc: {len(class_names)}

# Class Names Map
names:
"""
    for idx, cname in enumerate(class_names):
        yaml_content += f"  {idx}: '{cname}'\n"

    with open(os.path.join(YOLO_DATASET_DIR, "dataset.yaml"), "w") as f:
        f.write(yaml_content)

    # 6. Generate class_names.txt
    with open(os.path.join(YOLO_DATASET_DIR, "class_names.txt"), "w") as f:
        for cname in class_names:
            f.write(f"{cname}\n")

    # 7. Generate class_mapping.json
    with open(os.path.join(YOLO_DATASET_DIR, "class_mapping.json"), "w") as f:
        json.dump(class_mapping, f, indent=2)

    # 8. Render Bounding Box Visualizations
    print("[YOLO CONVERSION] Generating visual bounding box verification samples...")
    selected_vis_samples = converted_samples_for_vis[::max(1, len(converted_samples_for_vis) // 12)][:12]

    for idx, sample in enumerate(selected_vis_samples):
        img_p = sample["image_path"]
        cv_img = cv2.imread(img_p)
        if cv_img is None:
            continue

        h, w, _ = cv_img.shape

        for box in sample["boxes"]:
            _, xc, yc, bw, bh = box
            xmin = int((xc - bw / 2.0) * w)
            ymin = int((yc - bh / 2.0) * h)
            xmax = int((xc + bw / 2.0) * w)
            ymax = int((yc + bh / 2.0) * h)

            # Draw green bounding box rectangle
            cv2.rectangle(cv_img, (xmin, ymin), (xmax, ymax), (0, 255, 0), 2)

            # Label text banner
            label_text = sample["class_name"]
            cv2.rectangle(cv_img, (xmin, max(0, ymin - 25)), (xmin + len(label_text) * 11, max(0, ymin)), (0, 255, 0), -1)
            cv2.putText(cv_img, label_text, (xmin + 3, max(15, ymin - 7)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)

        out_vis_filename = f"sample_{idx+1:02d}_{sample['class_name']}.png"
        cv2.imwrite(os.path.join(vis_dir, out_vis_filename), cv_img)

    # 9. Verification & Summary Output
    summary = {
        "dataset_path": YOLO_DATASET_DIR,
        "total_categories": len(categories),
        "total_classes": len(class_names),
        "total_images_processed": total_images_processed,
        "total_boxes_generated": total_boxes_generated,
        "empty_masks_count": empty_masks_count,
        "split_counts": split_counts,
        "class_stats": class_stats,
        "verification_errors": verification_errors
    }

    with open(os.path.join(YOLO_DATASET_DIR, "conversion_summary.json"), "w") as f:
        json.dump(summary, f, indent=2)

    print("\n--- YOLO CONVERSION COMPLETED SUCCESSFULLY ---")
    print(f"Total Images Processed: {total_images_processed}")
    print(f"Total Bounding Boxes: {total_boxes_generated}")
    print(f"Train Split: {split_counts['train']['images']} images ({split_counts['train']['defective']} defective, {split_counts['train']['good']} good)")
    print(f"Val Split:   {split_counts['val']['images']} images ({split_counts['val']['defective']} defective, {split_counts['val']['good']} good)")
    print(f"Test Split:  {split_counts['test']['images']} images ({split_counts['test']['defective']} defective, {split_counts['test']['good']} good)")
    print(f"Verification Errors: {len(verification_errors)}")
    print(f"Visualization Previews Saved: {len(os.listdir(vis_dir))} files in dataset_yolo/visualizations/")

if __name__ == "__main__":
    run_conversion()
