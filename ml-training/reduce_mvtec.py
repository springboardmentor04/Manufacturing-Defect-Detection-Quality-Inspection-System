from pathlib import Path
import shutil
import random

SOURCE = Path("mvtec_yolo")
DEST = Path("mvtec_yolo_1200")

TARGET_TOTAL = 1200

random.seed(42)

classes = [
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

# -------------------------------------------------------
# CLEAN OLD DATASET
# -------------------------------------------------------

if DEST.exists():
    shutil.rmtree(DEST)

# -------------------------------------------------------
# CREATE DIRECTORIES
# -------------------------------------------------------

for folder in [
    DEST / "images" / "train",
    DEST / "images" / "val",
    DEST / "labels" / "train",
    DEST / "labels" / "val"
]:
    folder.mkdir(parents=True, exist_ok=True)

source_images = SOURCE / "images" / "train"
source_labels = SOURCE / "labels" / "train"

all_good = []
all_defect = []

print("=" * 65)
print("MVTec 1200 IMAGE DATASET CREATION")
print("=" * 65)

# -------------------------------------------------------
# COLLECT GOOD + DEFECT IMAGES
# -------------------------------------------------------

for cls in classes:

    images = list(source_images.glob(f"{cls}_*.png"))

    good = []
    defect = []

    for image in images:

        label = source_labels / f"{image.stem}.txt"

        if label.exists() and label.stat().st_size > 0:
            defect.append(image)
        else:
            good.append(image)

    print(
        f"{cls:12} | "
        f"Good: {len(good):3} | "
        f"Defect: {len(defect):3}"
    )

    all_good.extend(good)
    all_defect.extend(defect)

print("\nTotal good images   :", len(all_good))
print("Total defect images :", len(all_defect))

# -------------------------------------------------------
# KEEP ALL DEFECT IMAGES
# -------------------------------------------------------

random.shuffle(all_defect)

selected_defect = all_defect

# -------------------------------------------------------
# SELECT GOOD IMAGES
# -------------------------------------------------------

needed_good = TARGET_TOTAL - len(selected_defect)

random.shuffle(all_good)

selected_good = all_good[:needed_good]

selected = selected_good + selected_defect

print("\nSelected:")
print("Good images   :", len(selected_good))
print("Defect images :", len(selected_defect))
print("Total         :", len(selected))

# -------------------------------------------------------
# COPY TRAINING DATA
# -------------------------------------------------------

for image in selected:

    shutil.copy2(
        image,
        DEST / "images" / "train" / image.name
    )

    label = source_labels / f"{image.stem}.txt"

    if label.exists():
        shutil.copy2(
            label,
            DEST / "labels" / "train" / label.name
        )

# -------------------------------------------------------
# COPY ALL VALIDATION DATA
# -------------------------------------------------------

val_images = SOURCE / "images" / "val"
val_labels = SOURCE / "labels" / "val"

val_count = 0

for image in val_images.glob("*.png"):

    shutil.copy2(
        image,
        DEST / "images" / "val" / image.name
    )

    label = val_labels / f"{image.stem}.txt"

    if label.exists():
        shutil.copy2(
            label,
            DEST / "labels" / "val" / label.name
        )

    val_count += 1

# -------------------------------------------------------
# DATA.YAML
# -------------------------------------------------------

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

with open(DEST / "data.yaml", "w") as f:
    f.write(yaml_text)

print("\n" + "=" * 65)
print("DATASET READY")
print("=" * 65)

print("Training images :", len(selected))
print("Validation      :", val_count)
print("Dataset         :", DEST.resolve())