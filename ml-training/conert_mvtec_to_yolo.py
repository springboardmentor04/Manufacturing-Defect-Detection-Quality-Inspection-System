from pathlib import Path
import shutil
import cv2

# ============================================================
# MVTec Metal Nut -> YOLO Dataset Conversion
# ============================================================

# Your actual MVTec dataset
SRC = Path(r"..\dataset\metal_nut")

# YOLO dataset will be created here
DST = Path(r"C:\YOLO_DATASET\metal_nut")

CLASS_ID = 0  # 0 = defect

IMG_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}

DEFECT_CLASSES = [
    "bent",
    "color",
    "flip",
    "scratch"
]


# ============================================================
# Convert segmentation mask -> YOLO bounding box
# ============================================================

def convert_mask_to_yolo(mask_path, image_path, label_path):

    image = cv2.imread(str(image_path))
    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)

    if image is None:
        raise ValueError(f"Cannot read image: {image_path}")

    if mask is None:
        raise ValueError(f"Cannot read mask: {mask_path}")

    h, w = image.shape[:2]

    # Binary mask
    _, binary = cv2.threshold(
        mask,
        127,
        255,
        cv2.THRESH_BINARY
    )

    # Find defect regions
    contours, _ = cv2.findContours(
        binary,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    labels = []

    for contour in contours:

        x, y, bw, bh = cv2.boundingRect(contour)

        if bw <= 0 or bh <= 0:
            continue

        # YOLO normalized coordinates
        x_center = (x + bw / 2) / w
        y_center = (y + bh / 2) / h

        width = bw / w
        height = bh / h

        labels.append(
            f"{CLASS_ID} "
            f"{x_center:.6f} "
            f"{y_center:.6f} "
            f"{width:.6f} "
            f"{height:.6f}"
        )

    if not labels:
        raise ValueError(
            f"No defect found in mask: {mask_path}"
        )

    label_path.write_text(
        "\n".join(labels),
        encoding="utf-8"
    )


# ============================================================
# Create directories
# ============================================================

def create_directories():

    for split in ["train", "val"]:

        (DST / "images" / split).mkdir(
            parents=True,
            exist_ok=True
        )

        (DST / "labels" / split).mkdir(
            parents=True,
            exist_ok=True
        )


# ============================================================
# Copy training GOOD images
# ============================================================

def copy_good_training_images():

    print("\n===== COPYING TRAINING IMAGES =====")

    train_src = SRC / "train" / "good"

    train_img_dst = DST / "images" / "train"
    train_label_dst = DST / "labels" / "train"

    count = 0

    for image_path in sorted(train_src.iterdir()):

        if image_path.suffix.lower() not in IMG_EXTS:
            continue

        shutil.copy2(
            image_path,
            train_img_dst / image_path.name
        )

        # Empty label = background / no defect
        (
            train_label_dst /
            f"{image_path.stem}.txt"
        ).write_text(
            "",
            encoding="utf-8"
        )

        count += 1

    print(f"Training good images copied: {count}")


# ============================================================
# Convert TEST images to validation dataset
# ============================================================

def convert_test_dataset():

    print("\n===== CONVERTING VALIDATION DATA =====")

    test_src = SRC / "test"
    gt_src = SRC / "ground_truth"

    val_img_dst = DST / "images" / "val"
    val_label_dst = DST / "labels" / "val"

    total_good = 0
    total_defective = 0

    # --------------------------------------------------------
    # GOOD images
    # --------------------------------------------------------

    good_dir = test_src / "good"

    for image_path in sorted(good_dir.iterdir()):

        if image_path.suffix.lower() not in IMG_EXTS:
            continue

        shutil.copy2(
            image_path,
            val_img_dst / image_path.name
        )

        (
            val_label_dst /
            f"{image_path.stem}.txt"
        ).write_text(
            "",
            encoding="utf-8"
        )

        total_good += 1

    print(f"Good validation images: {total_good}")

    # --------------------------------------------------------
    # DEFECTIVE images
    # --------------------------------------------------------

    for defect_class in DEFECT_CLASSES:

        image_dir = test_src / defect_class
        mask_dir = gt_src / defect_class

        if not image_dir.exists():
            print(
                f"WARNING: Missing directory: {image_dir}"
            )
            continue

        print(f"\nProcessing: {defect_class}")

        for image_path in sorted(image_dir.iterdir()):

            if image_path.suffix.lower() not in IMG_EXTS:
                continue

            mask_path = (
                mask_dir /
                f"{image_path.stem}_mask.png"
            )

            if not mask_path.exists():
                raise FileNotFoundError(
                    f"Missing mask:\n{mask_path}"
                )

            shutil.copy2(
                image_path,
                val_img_dst / image_path.name
            )

            label_path = (
                val_label_dst /
                f"{image_path.stem}.txt"
            )

            convert_mask_to_yolo(
                mask_path,
                image_path,
                label_path
            )

            total_defective += 1

    print(
        f"\nDefective validation images: "
        f"{total_defective}"
    )

    return total_good, total_defective


# ============================================================
# Verify YOLO dataset
# ============================================================

def verify_dataset():

    print("\n========================================")
    print("        DATASET VERIFICATION")
    print("========================================")

    errors = []

    for split in ["train", "val"]:

        image_dir = DST / "images" / split
        label_dir = DST / "labels" / split

        images = [
            p for p in image_dir.iterdir()
            if p.suffix.lower() in IMG_EXTS
        ]

        labels = list(label_dir.glob("*.txt"))

        image_stems = {
            p.stem for p in images
        }

        label_stems = {
            p.stem for p in labels
        }

        missing_labels = image_stems - label_stems
        orphan_labels = label_stems - image_stems

        print(f"\n{split.upper()}")
        print(f"Images: {len(images)}")
        print(f"Labels: {len(labels)}")
        print(
            f"Missing labels: "
            f"{len(missing_labels)}"
        )
        print(
            f"Orphan labels: "
            f"{len(orphan_labels)}"
        )

        if missing_labels:
            for name in missing_labels:
                errors.append(
                    f"{split}: missing label {name}"
                )

        if orphan_labels:
            for name in orphan_labels:
                errors.append(
                    f"{split}: orphan label {name}"
                )

        # Check label values
        for label_path in labels:

            lines = [
                line.strip()
                for line in label_path.read_text(
                    encoding="utf-8"
                ).splitlines()
                if line.strip()
            ]

            for line_no, line in enumerate(
                lines,
                start=1
            ):

                parts = line.split()

                if len(parts) != 5:

                    errors.append(
                        f"{label_path.name}: "
                        f"expected 5 values"
                    )

                    continue

                try:

                    class_id = int(parts[0])

                    values = [
                        float(x)
                        for x in parts[1:]
                    ]

                except ValueError:

                    errors.append(
                        f"{label_path.name}: "
                        f"non-numeric value"
                    )

                    continue

                if class_id != CLASS_ID:

                    errors.append(
                        f"{label_path.name}: "
                        f"wrong class ID"
                    )

                for value in values:

                    if not 0.0 <= value <= 1.0:

                        errors.append(
                            f"{label_path.name}: "
                            f"value outside 0-1"
                        )

    print("\n========================================")

    if errors:

        print(
            f"FAILED: {len(errors)} errors"
        )

        for error in errors[:20]:
            print("ERROR:", error)

        return False

    print("SUCCESS!")
    print("All images have valid YOLO labels.")

    return True


# ============================================================
# Create data.yaml
# ============================================================

def create_yaml():

    yaml_content = f"""path: {DST}

train: images/train
val: images/val

nc: 1

names:
  0: defect
"""

    yaml_path = DST / "data.yaml"

    yaml_path.write_text(
        yaml_content,
        encoding="utf-8"
    )

    print("\nCreated:")
    print(yaml_path)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print("=" * 60)
    print("MVTec METAL NUT -> YOLO DATASET")
    print("=" * 60)

    print("\nSource:")
    print(SRC.resolve())

    print("\nDestination:")
    print(DST)

    if not SRC.exists():

        raise FileNotFoundError(
            f"\nMVTec dataset not found:\n{SRC.resolve()}"
        )

    # Create folders
    create_directories()

    # Copy good training images
    copy_good_training_images()

    # Convert test images + masks
    convert_test_dataset()

    # Verify
    success = verify_dataset()

    if not success:
        raise SystemExit(
            "\nDataset verification failed."
        )

    # Create YAML
    create_yaml()

    print("\n" + "=" * 60)
    print("YOLO DATASET CREATION COMPLETED")
    print("=" * 60)

    print("\nDataset location:")
    print(DST)

    print("\nYAML:")
    print(DST / "data.yaml")