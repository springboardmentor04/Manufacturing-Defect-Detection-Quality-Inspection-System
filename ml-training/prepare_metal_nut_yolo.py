from pathlib import Path
import shutil
import random
import cv2

# ============================================================
# MVTec Metal Nut -> YOLO DATASET
# ============================================================

SRC = Path(r"C:\datasets\mvtec_ad\metal_nut")
DST = Path(r"C:\YOLO_DATASET\metal_nut_yolo")

RANDOM_SEED = 42
VAL_RATIO = 0.20

random.seed(RANDOM_SEED)

IMG_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}

# YOLO class
# 0 = defect
CLASS_ID = 0

DEFECT_CLASSES = [
    "bent",
    "color",
    "flip",
    "scratch",
]


# ============================================================
# CREATE DIRECTORIES
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
# MASK -> YOLO BOUNDING BOX
# ============================================================

def mask_to_yolo(mask_path, image_path):

    image = cv2.imread(str(image_path))

    mask = cv2.imread(
        str(mask_path),
        cv2.IMREAD_GRAYSCALE
    )

    if image is None:
        raise ValueError(
            f"Cannot read image: {image_path}"
        )

    if mask is None:
        raise ValueError(
            f"Cannot read mask: {mask_path}"
        )

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

    return labels


# ============================================================
# ADD IMAGE
# ============================================================

def add_image(
    image_path,
    split,
    labels
):

    image_dst = DST / "images" / split
    label_dst = DST / "labels" / split

    # Add unique filename
    # Example:
    # bent_000.png
    # scratch_010.png

    destination_name = image_path.name

    shutil.copy2(
        image_path,
        image_dst / destination_name
    )

    label_file = (
        label_dst /
        f"{image_path.stem}.txt"
    )

    label_file.write_text(
        "\n".join(labels),
        encoding="utf-8"
    )


# ============================================================
# COLLECT GOOD IMAGES
# ============================================================

def collect_good_images():

    print("\nCollecting GOOD images...")

    good_images = []

    # Training good images
    train_good = SRC / "train" / "good"

    for image in sorted(train_good.iterdir()):

        if image.suffix.lower() in IMG_EXTS:
            good_images.append(image)

    # Test good images
    test_good = SRC / "test" / "good"

    for image in sorted(test_good.iterdir()):

        if image.suffix.lower() in IMG_EXTS:
            good_images.append(image)

    random.shuffle(good_images)

    val_count = int(
        len(good_images) * VAL_RATIO
    )

    val_images = good_images[:val_count]
    train_images = good_images[val_count:]

    # TRAIN
    for image in train_images:

        add_image(
            image,
            "train",
            []
        )

    # VAL
    for image in val_images:

        add_image(
            image,
            "val",
            []
        )

    print(
        f"Good images: {len(good_images)}"
    )

    print(
        f"Good train: {len(train_images)}"
    )

    print(
        f"Good val: {len(val_images)}"
    )


# ============================================================
# COLLECT DEFECTIVE IMAGES
# ============================================================

def collect_defective_images():

    print("\nCollecting DEFECTIVE images...")

    total = 0

    for defect_class in DEFECT_CLASSES:

        image_dir = (
            SRC /
            "test" /
            defect_class
        )

        mask_dir = (
            SRC /
            "ground_truth" /
            defect_class
        )

        images = [
            p for p in sorted(image_dir.iterdir())
            if p.suffix.lower() in IMG_EXTS
        ]

        random.shuffle(images)

        val_count = int(
            len(images) * VAL_RATIO
        )

        val_images = images[:val_count]
        train_images = images[val_count:]

        # ================================================
        # TRAIN DEFECTS
        # ================================================

        for image in train_images:

            mask = (
                mask_dir /
                f"{image.stem}_mask.png"
            )

            if not mask.exists():

                print(
                    f"WARNING: Missing mask: {mask}"
                )

                continue

            labels = mask_to_yolo(
                mask,
                image
            )

            if not labels:

                print(
                    f"WARNING: Empty mask: {mask}"
                )

                continue

            # Add defect class to filename
            new_name = (
                f"{defect_class}_{image.name}"
            )

            temp_image = (
                DST /
                "images" /
                "train" /
                new_name
            )

            shutil.copy2(
                image,
                temp_image
            )

            label_file = (
                DST /
                "labels" /
                "train" /
                f"{Path(new_name).stem}.txt"
            )

            label_file.write_text(
                "\n".join(labels),
                encoding="utf-8"
            )

            total += 1

        # ================================================
        # VALIDATION DEFECTS
        # ================================================

        for image in val_images:

            mask = (
                mask_dir /
                f"{image.stem}_mask.png"
            )

            if not mask.exists():

                print(
                    f"WARNING: Missing mask: {mask}"
                )

                continue

            labels = mask_to_yolo(
                mask,
                image
            )

            if not labels:

                print(
                    f"WARNING: Empty mask: {mask}"
                )

                continue

            new_name = (
                f"{defect_class}_{image.name}"
            )

            temp_image = (
                DST /
                "images" /
                "val" /
                new_name
            )

            shutil.copy2(
                image,
                temp_image
            )

            label_file = (
                DST /
                "labels" /
                "val" /
                f"{Path(new_name).stem}.txt"
            )

            label_file.write_text(
                "\n".join(labels),
                encoding="utf-8"
            )

            total += 1

        print(
            f"{defect_class}: "
            f"{len(images)} images"
        )

    print(
        f"\nTotal defective images processed: {total}"
    )


# ============================================================
# CREATE data.yaml
# ============================================================

def create_yaml():

    yaml_content = """path: C:/YOLO_DATASET/metal_nut_yolo

train: images/train
val: images/val

names:
  0: defect
"""

    (DST / "data.yaml").write_text(
        yaml_content,
        encoding="utf-8"
    )


# ============================================================
# VERIFY DATASET
# ============================================================

def verify_dataset():

    print("\n======================================")
    print("DATASET VERIFICATION")
    print("======================================")

    for split in ["train", "val"]:

        image_dir = (
            DST /
            "images" /
            split
        )

        label_dir = (
            DST /
            "labels" /
            split
        )

        images = [
            p for p in image_dir.iterdir()
            if p.suffix.lower() in IMG_EXTS
        ]

        labels = list(
            label_dir.glob("*.txt")
        )

        print(f"\n{split.upper()}")

        print(
            f"Images : {len(images)}"
        )

        print(
            f"Labels : {len(labels)}"
        )

        # Count positive labels

        positive = 0
        negative = 0

        for label in labels:

            content = label.read_text(
                encoding="utf-8"
            ).strip()

            if content:
                positive += 1
            else:
                negative += 1

        print(
            f"Defective : {positive}"
        )

        print(
            f"Good      : {negative}"
        )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print("=" * 60)
    print("MVTec Metal Nut -> YOLO Dataset")
    print("=" * 60)

    print(
        f"\nSource:\n{SRC}"
    )

    print(
        f"\nDestination:\n{DST}"
    )

    if not SRC.exists():

        raise FileNotFoundError(
            f"Source dataset not found: {SRC}"
        )

    # WARNING if destination already exists

    if DST.exists():

        print(
            "\nWARNING: Destination already exists."
        )

        print(
            "Delete the old dataset before recreating it."
        )

        raise SystemExit(1)

    create_directories()

    collect_good_images()

    collect_defective_images()

    create_yaml()

    verify_dataset()

    print("\n======================================")
    print("DATASET CREATION COMPLETED")
    print("======================================")

    print(
        f"\nYOLO dataset:\n{DST}"
    )

    print(
        f"\ndata.yaml:\n{DST / 'data.yaml'}"
    )