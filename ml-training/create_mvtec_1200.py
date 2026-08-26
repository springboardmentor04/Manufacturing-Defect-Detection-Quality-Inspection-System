from pathlib import Path
import shutil
import random
import cv2

# ============================================================
# SETTINGS
# ============================================================

SOURCE = Path(
    r"C:\Users\veene.LAPTOP-VQNJ8SHT\Downloads\mvtec_anomaly_detection"
)

DEST = Path("mvtec_yolo_1200")

TARGET_DEFECT = 450
TARGET_GOOD = 600

random.seed(42)

CLASSES = [
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
    "zipper"
]

CLASS_IDS = {
    name: i for i, name in enumerate(CLASSES)
}

# ============================================================
# CHECK SOURCE
# ============================================================

if not SOURCE.exists():
    raise FileNotFoundError(
        f"MVTec dataset not found:\n{SOURCE}"
    )

print("=" * 70)
print("MVTec -> YOLO 1200 DATASET")
print("=" * 70)

print(f"\nSource: {SOURCE}")
print(f"\nTarget:")
print(f"Defective : {TARGET_DEFECT}")
print(f"Good      : {TARGET_GOOD}")
print(f"Total     : {TARGET_DEFECT + TARGET_GOOD}")

# ============================================================
# REMOVE OLD DATASET
# ============================================================

if DEST.exists():
    print("\nRemoving previous dataset...")
    shutil.rmtree(DEST)

# ============================================================
# CREATE DIRECTORIES
# ============================================================

for folder in [
    DEST / "images" / "train",
    DEST / "labels" / "train",
    DEST / "images" / "val",
    DEST / "labels" / "val"
]:
    folder.mkdir(parents=True, exist_ok=True)

# ============================================================
# COLLECT DATA
# ============================================================

good_images = []
defect_images = []

print("\nScanning MVTec dataset...\n")

for class_name in CLASSES:

    class_dir = SOURCE / class_name

    if not class_dir.exists():
        print(f"WARNING: {class_name} not found")
        continue

    # --------------------------------------------------------
    # GOOD TRAINING IMAGES
    # --------------------------------------------------------

    good_dir = class_dir / "train" / "good"

    good_count = 0
    defect_count = 0

    if good_dir.exists():

        for image in good_dir.glob("*.png"):

            good_images.append({
                "path": image,
                "class": class_name,
                "defect": False,
                "mask": None
            })

            good_count += 1

    # --------------------------------------------------------
    # DEFECTIVE TEST IMAGES
    # --------------------------------------------------------

    test_dir = class_dir / "test"
    ground_truth_dir = class_dir / "ground_truth"

    if test_dir.exists():

        for defect_type_dir in test_dir.iterdir():

            if not defect_type_dir.is_dir():
                continue

            if defect_type_dir.name == "good":
                continue

            defect_type = defect_type_dir.name

            mask_dir = ground_truth_dir / defect_type

            if not mask_dir.exists():
                print(
                    f"WARNING: Mask folder missing: "
                    f"{mask_dir}"
                )
                continue

            for image in defect_type_dir.glob("*.png"):

                # ------------------------------------------------
                # IMPORTANT:
                # MVTec masks normally end with "_mask.png"
                # ------------------------------------------------

                mask = mask_dir / f"{image.stem}_mask.png"

                if not mask.exists():

                    # Try any matching mask
                    possible_masks = list(
                        mask_dir.glob(
                            f"{image.stem}*"
                        )
                    )

                    if possible_masks:
                        mask = possible_masks[0]

                if mask.exists():

                    defect_images.append({
                        "path": image,
                        "class": class_name,
                        "defect": True,
                        "mask": mask
                    })

                    defect_count += 1

    print(
        f"{class_name:12} | "
        f"Good: {good_count:3} | "
        f"Defect: {defect_count:3}"
    )

# ============================================================
# AVAILABLE DATA
# ============================================================

print("\n" + "=" * 70)
print("AVAILABLE DATA")
print("=" * 70)

print(f"Good images available   : {len(good_images)}")
print(f"Defect images available : {len(defect_images)}")

# ============================================================
# TARGET CHECK
# ============================================================

if len(defect_images) < TARGET_DEFECT:

    print(
        f"\nWARNING: Only {len(defect_images)} "
        f"unique defect images are available."
    )

    TARGET_DEFECT = len(defect_images)

if len(good_images) < TARGET_GOOD:

    TARGET_GOOD = len(good_images)

# ============================================================
# SELECT DATA
# ============================================================

random.shuffle(defect_images)
random.shuffle(good_images)

selected_defects = defect_images[:TARGET_DEFECT]
selected_good = good_images[:TARGET_GOOD]

selected = selected_defects + selected_good

random.shuffle(selected)

print("\n" + "=" * 70)
print("SELECTED DATA")
print("=" * 70)

print(f"Defective selected : {len(selected_defects)}")
print(f"Good selected      : {len(selected_good)}")
print(f"Total selected     : {len(selected)}")

# ============================================================
# MASK -> YOLO BOX
# ============================================================

def mask_to_yolo(mask_path, class_id):

    mask = cv2.imread(
        str(mask_path),
        cv2.IMREAD_GRAYSCALE
    )

    if mask is None:
        return []

    height, width = mask.shape

    # Convert mask to binary
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

    labels = []

    for contour in contours:

        x, y, w, h = cv2.boundingRect(contour)

        if w < 2 or h < 2:
            continue

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

    return labels

# ============================================================
# COPY TRAINING DATA
# ============================================================

print("\n" + "=" * 70)
print("CREATING TRAINING DATA")
print("=" * 70)

good_count = 0
defect_count = 0
skipped = 0

for index, item in enumerate(selected):

    image = item["path"]
    class_name = item["class"]
    class_id = CLASS_IDS[class_name]

    filename = f"{class_name}_{index:05d}.png"

    destination_image = (
        DEST / "images" / "train" / filename
    )

    destination_label = (
        DEST / "labels" / "train" /
        f"{class_name}_{index:05d}.txt"
    )

    # --------------------------------------------------------
    # GOOD
    # --------------------------------------------------------

    if not item["defect"]:

        shutil.copy2(
            image,
            destination_image
        )

        # Empty label = no defect
        destination_label.write_text(
            "",
            encoding="utf-8"
        )

        good_count += 1

    # --------------------------------------------------------
    # DEFECT
    # --------------------------------------------------------

    else:

        labels = mask_to_yolo(
            item["mask"],
            class_id
        )

        if not labels:
            skipped += 1
            continue

        shutil.copy2(
            image,
            destination_image
        )

        destination_label.write_text(
            "\n".join(labels),
            encoding="utf-8"
        )

        defect_count += 1

    if (index + 1) % 100 == 0:

        print(
            f"Processed: "
            f"{index + 1}/{len(selected)}"
        )

# ============================================================
# VALIDATION DATA
# ============================================================

print("\nCopying validation dataset...")

OLD_DATASET = Path("mvtec_yolo")

old_val_images = (
    OLD_DATASET / "images" / "val"
)

old_val_labels = (
    OLD_DATASET / "labels" / "val"
)

val_count = 0

if old_val_images.exists():

    for image in old_val_images.glob("*.png"):

        shutil.copy2(
            image,
            DEST / "images" / "val" / image.name
        )

        label = (
            old_val_labels /
            f"{image.stem}.txt"
        )

        if label.exists():

            shutil.copy2(
                label,
                DEST / "labels" / "val" / label.name
            )

        val_count += 1

# ============================================================
# DATA.YAML
# ============================================================

yaml_text = f"""path: {DEST.resolve().as_posix()}
train: images/train
val: images/val

nc: 15

names:
0: bottle
1: cable
2: capsule
3: carpet
4: grid
5: hazelnut
6: leather
7: metal_nut
8: pill
9: screw
10: tile
11: toothbrush
12: transistor
13: wood
14: zipper
"""

with open(
    DEST / "data.yaml",
    "w",
    encoding="utf-8"
) as f:

    f.write(yaml_text)

# ============================================================
# FINAL
# ============================================================

train_images = list(
    (DEST / "images" / "train").glob("*.png")
)

train_labels = list(
    (DEST / "labels" / "train").glob("*.txt")
)

print("\n" + "=" * 70)
print("FINAL DATASET")
print("=" * 70)

print(f"Good images       : {good_count}")
print(f"Defect images     : {defect_count}")
print(f"Total training    : {len(train_images)}")
print(f"Training labels   : {len(train_labels)}")
print(f"Validation images : {val_count}")
print(f"Skipped defects   : {skipped}")

print("\nDataset:")
print(DEST.resolve())

print("\nData YAML:")
print((DEST / "data.yaml").resolve())

print("\nDONE!")