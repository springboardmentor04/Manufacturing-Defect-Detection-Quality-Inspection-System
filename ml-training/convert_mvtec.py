from pathlib import Path
import shutil
import random
import cv2

# ============================================================
# PATHS
# ============================================================

# Your extracted MVTec dataset
MVTEC_ROOT = Path(
    r"C:\Users\veene.LAPTOP-VQNJ8SHT\Downloads\mvtec_anomaly_detection"
)

# YOLO dataset inside your current ml-training project
OUTPUT_ROOT = Path("mvtec_yolo")

TRAIN_IMAGES = OUTPUT_ROOT / "images" / "train"
VAL_IMAGES = OUTPUT_ROOT / "images" / "val"
TRAIN_LABELS = OUTPUT_ROOT / "labels" / "train"
VAL_LABELS = OUTPUT_ROOT / "labels" / "val"

# Reproducible split
random.seed(42)

# ============================================================
# MVTec CATEGORIES
# ============================================================

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

# Each MVTec category becomes a YOLO class
CLASS_NAMES = CATEGORIES
CLASS_ID = {name: i for i, name in enumerate(CLASS_NAMES)}

# ============================================================
# CREATE DIRECTORIES
# ============================================================

for folder in [
    TRAIN_IMAGES,
    VAL_IMAGES,
    TRAIN_LABELS,
    VAL_LABELS,
]:
    folder.mkdir(parents=True, exist_ok=True)

# ============================================================
# CHECK DATASET
# ============================================================

if not MVTEC_ROOT.exists():
    raise FileNotFoundError(
        f"MVTec dataset not found:\n{MVTEC_ROOT}"
    )

print("=" * 60)
print("MVTec AD → YOLO CONVERSION")
print("=" * 60)
print(f"MVTec source : {MVTEC_ROOT}")
print(f"YOLO output  : {OUTPUT_ROOT.resolve()}")
print("=" * 60)

# ============================================================
# COUNTERS
# ============================================================

total_images = 0
total_defective = 0
total_good = 0
total_labels = 0

# ============================================================
# PROCESS EACH CATEGORY
# ============================================================

for category in CATEGORIES:

    category_root = MVTEC_ROOT / category

    if not category_root.exists():
        print(f"\nWARNING: Missing category: {category}")
        continue

    print(f"\nProcessing: {category}")

    class_id = CLASS_ID[category]

    # --------------------------------------------------------
    # 1. GOOD TRAINING IMAGES
    # --------------------------------------------------------

    good_train_dir = category_root / "train" / "good"

    good_images = []

    if good_train_dir.exists():
        good_images = sorted(
            list(good_train_dir.glob("*.png")) +
            list(good_train_dir.glob("*.jpg"))
        )

    # --------------------------------------------------------
    # 2. DEFECTIVE TEST IMAGES
    # --------------------------------------------------------

    test_dir = category_root / "test"

    defective_images = []

    if test_dir.exists():

        for defect_type in sorted(test_dir.iterdir()):

            if not defect_type.is_dir():
                continue

            if defect_type.name == "good":
                continue

            images = (
                list(defect_type.glob("*.png")) +
                list(defect_type.glob("*.jpg"))
            )

            for image_path in images:
                defective_images.append(
                    (image_path, defect_type.name)
                )

    # --------------------------------------------------------
    # COMBINE DATA
    # --------------------------------------------------------

    samples = []

    # Good images
    for image_path in good_images:
        samples.append(
            (image_path, None)
        )

    # Defective images
    for image_path, defect_type in defective_images:
        samples.append(
            (image_path, defect_type)
        )

    random.shuffle(samples)

    if not samples:
        print(f"  No images found for {category}")
        continue

    # --------------------------------------------------------
    # SPLIT 80/20
    # --------------------------------------------------------

    split_index = int(len(samples) * 0.8)

    train_samples = samples[:split_index]
    val_samples = samples[split_index:]

    print(f"  Total images : {len(samples)}")
    print(f"  Train        : {len(train_samples)}")
    print(f"  Validation   : {len(val_samples)}")

    # ========================================================
    # FUNCTION TO PROCESS IMAGE
    # ========================================================

    def process_sample(image_path, defect_type, split):

        global total_images
        global total_defective
        global total_good
        global total_labels

        if split == "train":
            image_output = TRAIN_IMAGES
            label_output = TRAIN_LABELS
        else:
            image_output = VAL_IMAGES
            label_output = VAL_LABELS

        # Make unique filename
        new_name = f"{category}_{image_path.stem}.png"

        destination_image = image_output / new_name
        destination_label = (
            label_output /
            f"{category}_{image_path.stem}.txt"
        )

        # ----------------------------------------------------
        # COPY IMAGE
        # ----------------------------------------------------

        # If the file already exists, replace it safely.
        if destination_image.exists():
            destination_image.unlink()

        shutil.copyfile(
            image_path,
            destination_image
        )

        total_images += 1

        # ----------------------------------------------------
        # GOOD IMAGE
        # ----------------------------------------------------

        if defect_type is None:

            destination_label.write_text("")

            total_good += 1

            return

        # ----------------------------------------------------
        # DEFECTIVE IMAGE
        # ----------------------------------------------------

        total_defective += 1

        mask_path = (
            category_root
            / "ground_truth"
            / defect_type
            / f"{image_path.stem}_mask.png"
        )

        if not mask_path.exists():

            print(
                f"  WARNING: Mask missing: {mask_path}"
            )

            destination_label.write_text("")

            return

        # ----------------------------------------------------
        # READ MASK
        # ----------------------------------------------------

        mask = cv2.imread(
            str(mask_path),
            cv2.IMREAD_GRAYSCALE
        )

        if mask is None:
            print(
                f"  WARNING: Could not read mask: {mask_path}"
            )

            destination_label.write_text("")

            return

        # ----------------------------------------------------
        # FIND DEFECT CONTOURS
        # ----------------------------------------------------

        _, binary = cv2.threshold(
            mask,
            127,
            255,
            cv2.THRESH_BINARY
        )

        contours, _ = cv2.findContours(
            binary,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )

        height, width = mask.shape

        labels = []

        for contour in contours:

            x, y, w, h = cv2.boundingRect(contour)

            # Ignore extremely tiny regions
            if w < 2 or h < 2:
                continue

            # YOLO format
            x_center = (x + w / 2) / width
            y_center = (y + h / 2) / height

            box_width = w / width
            box_height = h / height

            labels.append(
                f"{class_id} "
                f"{x_center:.6f} "
                f"{y_center:.6f} "
                f"{box_width:.6f} "
                f"{box_height:.6f}"
            )

        # ----------------------------------------------------
        # SAVE LABEL
        # ----------------------------------------------------

        destination_label.write_text(
            "\n".join(labels)
        )

        if labels:
            total_labels += len(labels)


    # ========================================================
    # PROCESS TRAIN
    # ========================================================

    for image_path, defect_type in train_samples:

        process_sample(
            image_path,
            defect_type,
            "train"
        )

    # ========================================================
    # PROCESS VALIDATION
    # ========================================================

    for image_path, defect_type in val_samples:

        process_sample(
            image_path,
            defect_type,
            "val"
        )


# ============================================================
# CREATE data.yaml
# ============================================================

yaml_path = OUTPUT_ROOT / "data.yaml"

yaml_lines = [
    f"path: {OUTPUT_ROOT.resolve().as_posix()}",
    "train: images/train",
    "val: images/val",
    "",
    f"nc: {len(CLASS_NAMES)}",
    "names:",
]

for index, name in enumerate(CLASS_NAMES):

    yaml_lines.append(
        f"  {index}: {name}"
    )

yaml_path.write_text(
    "\n".join(yaml_lines),
    encoding="utf-8"
)

# ============================================================
# FINAL SUMMARY
# ============================================================

print("\n")
print("=" * 60)
print("CONVERSION COMPLETED")
print("=" * 60)

print(f"Total images       : {total_images}")
print(f"Good images        : {total_good}")
print(f"Defective images   : {total_defective}")
print(f"YOLO boxes created : {total_labels}")

print("\nYOLO dataset:")
print(OUTPUT_ROOT.resolve())

print("\ndata.yaml:")
print(yaml_path.resolve())

print("\nClasses:")
for i, name in enumerate(CLASS_NAMES):
    print(f"  {i}: {name}")

print("=" * 60)