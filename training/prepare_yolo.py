from pathlib import Path
import cv2
import shutil
import random

# ============================================================
# VisionInspect AI - Unified MVTec -> YOLO Dataset Preparation
# ============================================================

ROOT = Path(__file__).resolve().parents[1]

DATASET_ROOT = ROOT / "dataset" / "archive"
OUT = ROOT / "training" / "yolo_dataset"

random.seed(42)

CATEGORIES = [
    "bottle",
    "cable",
    "capsule",
    "carpet",
    "grid",
    "hazelnut",
    "leather",
    "metal_nut",
    "pill",
    "screw",
    "tile",
    "toothbrush",
    "transistor",
    "wood",
    "zipper",
]

# ------------------------------------------------------------
# Discover all defect classes
# ------------------------------------------------------------

defect_names = set()

for category in CATEGORIES:
    category_root = DATASET_ROOT / category
    test_dir = category_root / "test"

    if not test_dir.exists():
        print(f"WARNING: test directory missing: {test_dir}")
        continue

    for defect_dir in test_dir.iterdir():
        if defect_dir.is_dir() and defect_dir.name != "good":
            defect_names.add(defect_dir.name)

CLASSES = {
    name: index
    for index, name in enumerate(sorted(defect_names))
}

print("=" * 70)
print("VisionInspect AI - Unified YOLO Dataset")
print("=" * 70)
print(f"Categories: {len(CATEGORIES)}")
print(f"Defect classes: {len(CLASSES)}")
print()

for name, class_id in CLASSES.items():
    print(f"{class_id:2d}: {name}")

print("=" * 70)

# ------------------------------------------------------------
# Remove previous generated dataset
# ------------------------------------------------------------

if OUT.exists():
    print("\nRemoving previous YOLO dataset...")
    shutil.rmtree(OUT)

# ------------------------------------------------------------
# Create directories
# ------------------------------------------------------------

for split in ["train", "val"]:
    (OUT / "images" / split).mkdir(parents=True, exist_ok=True)
    (OUT / "labels" / split).mkdir(parents=True, exist_ok=True)

# ------------------------------------------------------------
# Counters
# ------------------------------------------------------------

train_count = 0
val_count = 0
defect_count = 0

# ------------------------------------------------------------
# Process each category
# ------------------------------------------------------------

for category in CATEGORIES:

    category_root = DATASET_ROOT / category

    print(f"\nProcessing: {category}")

    # ========================================================
    # GOOD IMAGES
    # ========================================================

    good_dir = category_root / "train" / "good"

    if good_dir.exists():

        good_images = sorted(good_dir.glob("*.png"))
        random.shuffle(good_images)

        split_index = int(len(good_images) * 0.8)

        train_good = good_images[:split_index]
        val_good = good_images[split_index:]

        for image_path in train_good:

            output_name = f"{category}_good_{image_path.name}"

            shutil.copy2(
                image_path,
                OUT / "images" / "train" / output_name
            )

            label_path = (
                OUT / "labels" / "train" /
                f"{Path(output_name).stem}.txt"
            )

            label_path.write_text("")

            train_count += 1

        for image_path in val_good:

            output_name = f"{category}_good_{image_path.name}"

            shutil.copy2(
                image_path,
                OUT / "images" / "val" / output_name
            )

            label_path = (
                OUT / "labels" / "val" /
                f"{Path(output_name).stem}.txt"
            )

            label_path.write_text("")

            val_count += 1

    # ========================================================
    # DEFECT IMAGES
    # ========================================================

    test_dir = category_root / "test"
    ground_truth_dir = category_root / "ground_truth"

    if not test_dir.exists():
        continue

    for defect_dir in sorted(test_dir.iterdir()):

        if not defect_dir.is_dir():
            continue

        defect_name = defect_dir.name

        if defect_name == "good":
            continue

        if defect_name not in CLASSES:
            continue

        class_id = CLASSES[defect_name]

        image_dir = test_dir / defect_name
        mask_dir = ground_truth_dir / defect_name

        images = sorted(image_dir.glob("*.png"))

        for image_path in images:

            mask_path = mask_dir / f"{image_path.stem}_mask.png"

            if not mask_path.exists():
                print(f"WARNING: missing mask: {mask_path}")
                continue

            mask = cv2.imread(
                str(mask_path),
                cv2.IMREAD_GRAYSCALE
            )

            image = cv2.imread(str(image_path))

            if mask is None or image is None:
                continue

            # ------------------------------------------------
            # Convert mask to binary
            # ------------------------------------------------

            _, binary = cv2.threshold(
                mask,
                1,
                255,
                cv2.THRESH_BINARY
            )

            contours, _ = cv2.findContours(
                binary,
                cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_SIMPLE
            )

            if not contours:
                continue

            # ------------------------------------------------
            # Combine defect regions into one bounding box
            # ------------------------------------------------

            boxes = [
                cv2.boundingRect(contour)
                for contour in contours
            ]

            x_min = min(x for x, y, w, h in boxes)
            y_min = min(y for x, y, w, h in boxes)

            x_max = max(
                x + w
                for x, y, w, h in boxes
            )

            y_max = max(
                y + h
                for x, y, w, h in boxes
            )

            height, width = image.shape[:2]

            # ------------------------------------------------
            # YOLO normalized bounding box
            # ------------------------------------------------

            x_center = ((x_min + x_max) / 2) / width
            y_center = ((y_min + y_max) / 2) / height

            box_width = (x_max - x_min) / width
            box_height = (y_max - y_min) / height

            label = (
                f"{class_id} "
                f"{x_center:.6f} "
                f"{y_center:.6f} "
                f"{box_width:.6f} "
                f"{box_height:.6f}"
            )

            # ------------------------------------------------
            # 80/20 split
            # ------------------------------------------------

            if random.random() < 0.8:
                split = "train"
                train_count += 1
            else:
                split = "val"
                val_count += 1

            output_name = (
                f"{category}_{defect_name}_{image_path.name}"
            )

            output_image = (
                OUT / "images" / split / output_name
            )

            output_label = (
                OUT / "labels" / split /
                f"{Path(output_name).stem}.txt"
            )

            shutil.copy2(
                image_path,
                output_image
            )

            output_label.write_text(
                label + "\n"
            )

            defect_count += 1

# ------------------------------------------------------------
# Create data.yaml
# ------------------------------------------------------------

names_yaml = "\n".join(
    f"  {class_id}: {name}"
    for name, class_id in CLASSES.items()
)

yaml_content = f"""path: {OUT.as_posix()}
train: images/train
val: images/val

names:
{names_yaml}
"""

(OUT / "data.yaml").write_text(
    yaml_content,
    encoding="utf-8"
)

# ------------------------------------------------------------
# Final summary
# ------------------------------------------------------------

print("\n")
print("=" * 70)
print("UNIFIED YOLO DATASET CREATED")
print("=" * 70)

print(f"Categories processed : {len(CATEGORIES)}")
print(f"Defect classes       : {len(CLASSES)}")
print(f"Training images      : {train_count}")
print(f"Validation images    : {val_count}")
print(f"Defect images        : {defect_count}")

print()
print("Dataset:")
print(OUT)

print()
print("Config:")
print(OUT / "data.yaml")

print("=" * 70)