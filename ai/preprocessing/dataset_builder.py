from pathlib import Path
import random
import shutil
import yaml

random.seed(42)

YOLO_ROOT = Path("ai/yolo_dataset")

TRAIN_IMAGES = YOLO_ROOT / "images/train"
TRAIN_LABELS = YOLO_ROOT / "labels/train"

VAL_IMAGES = YOLO_ROOT / "images/val"
VAL_LABELS = YOLO_ROOT / "labels/val"

VAL_IMAGES.mkdir(parents=True, exist_ok=True)
VAL_LABELS.mkdir(parents=True, exist_ok=True)

images = sorted(TRAIN_IMAGES.glob("*.png"))

print("=" * 60)
print("VisionInspect AI Dataset Builder")
print("=" * 60)

print(f"\nTotal Images : {len(images)}")

# =====================================
# Split Validation Dataset
# =====================================

val_count = int(len(images) * 0.2)

validation_images = random.sample(images, val_count)

for image_path in validation_images:

    label_path = TRAIN_LABELS / f"{image_path.stem}.txt"

    shutil.move(
        image_path,
        VAL_IMAGES / image_path.name,
    )

    if label_path.exists():
        shutil.move(
            label_path,
            VAL_LABELS / label_path.name,
        )

print(f"Validation Images : {val_count}")
print(f"Training Images   : {len(images)-val_count}")

# =====================================
# Generate Class Names Automatically
# =====================================

class_names = []

for label_file in sorted(TRAIN_LABELS.glob("*.txt")):

    parts = label_file.stem.split("_")

    if len(parts) < 3:
        continue

    # Last part is image number
    # Remaining parts form the class name
    class_name = "_".join(parts[:-1])

    if class_name not in class_names:
        class_names.append(class_name)

class_names.sort()

print("\nDetected Classes:")

for i, name in enumerate(class_names):
    print(f"{i:02d} -> {name}")

# =====================================
# Create data.yaml
# =====================================

yaml_data = {
    "path": str(YOLO_ROOT.resolve()),
    "train": "images/train",
    "val": "images/val",
    "nc": len(class_names),
    "names": class_names,
}

with open(
    YOLO_ROOT / "data.yaml",
    "w",
) as f:

    yaml.dump(
        yaml_data,
        f,
        sort_keys=False,
    )

print("\n✅ data.yaml created successfully")