from pathlib import Path
import shutil
import random
from PIL import Image

# ============================================================
# CONFIGURATION
# ============================================================

SOURCE = Path(r"C:\Users\veene.LAPTOP-VQNJ8SHT\Downloads\mvtec_anomaly_detection")
DEST = Path(r"C:\YOLO_DATASET\mvtec_all")

TRAIN_RATIO = 0.80
RANDOM_SEED = 42

random.seed(RANDOM_SEED)

# ============================================================
# CREATE YOLO DIRECTORIES
# ============================================================

for folder in [
    DEST / "images" / "train",
    DEST / "images" / "val",
    DEST / "labels" / "train",
    DEST / "labels" / "val",
]:
    folder.mkdir(parents=True, exist_ok=True)

print("=" * 60)
print("MVTec → YOLO DATASET CONVERSION")
print("=" * 60)

# ============================================================
# FIND ALL CATEGORIES
# ============================================================

categories = sorted([
    x for x in SOURCE.iterdir()
    if x.is_dir()
])

print(f"\nCategories found: {len(categories)}")

for category in categories:
    print(" -", category.name)

# ============================================================
# COLLECT ALL IMAGES
# ============================================================

samples = []

for category in categories:

    train_good = category / "train" / "good"
    test_dir = category / "test"
    ground_truth = category / "ground_truth"

    # --------------------------------------------------------
    # TRAIN GOOD IMAGES
    # --------------------------------------------------------

    if train_good.exists():

        for image_path in sorted(train_good.glob("*")):

            if image_path.suffix.lower() not in [".png", ".jpg", ".jpeg"]:
                continue

            samples.append({
                "image": image_path,
                "mask": None,
                "category": category.name,
                "defect": False,
            })

    # --------------------------------------------------------
    # TEST IMAGES
    # --------------------------------------------------------

    if test_dir.exists():

        for defect_dir in sorted(test_dir.iterdir()):

            if not defect_dir.is_dir():
                continue

            defect_type = defect_dir.name

            for image_path in sorted(defect_dir.glob("*")):

                if image_path.suffix.lower() not in [
                    ".png", ".jpg", ".jpeg"
                ]:
                    continue

                mask = None

                if defect_type != "good":
                  mask_dir = ground_truth / defect_type

                  # MVTec ground-truth masks use:
                  # image: 000.png
                  # mask : 000_mask.png
                  candidate = mask_dir / f"{image_path.stem}_mask.png"
                  if candidate.exists():
                      mask = candidate
                  else:
                      # Fallback: search for matching mask
                      matches = list(mask_dir.glob(f"{image_path.stem}_mask.*"))
                      if matches:
                        mask = matches[0]
                        for ext in [".png", ".jpg", ".jpeg"]:
                            candidate = mask_dir / (stem + ext)

                            if candidate.exists():
                                mask = candidate
                                break

                samples.append({
                    "image": image_path,
                    "mask": mask,
                    "category": category.name,
                    "defect": defect_type != "good",
                })

# ============================================================
# SHUFFLE DATA
# ============================================================

random.shuffle(samples)

total = len(samples)
train_count = int(total * TRAIN_RATIO)

train_samples = samples[:train_count]
val_samples = samples[train_count:]

print("\n" + "=" * 60)
print("DATASET SPLIT")
print("=" * 60)

print(f"Total images : {total}")
print(f"Train images : {len(train_samples)}")
print(f"Val images   : {len(val_samples)}")

# ============================================================
# FUNCTION TO CREATE YOLO LABEL FROM MASK
# ============================================================

def mask_to_yolo(mask_path, image_path):

    if mask_path is None:
        return ""

    mask = Image.open(mask_path).convert("L")
    image = Image.open(image_path)

    mask_width, mask_height = mask.size
    image_width, image_height = image.size

    # Find non-zero mask pixels
    bbox = mask.getbbox()

    if bbox is None:
        return ""

    left, top, right, bottom = bbox

    # Bounding-box center
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2

    # Bounding-box dimensions
    box_width = right - left
    box_height = bottom - top

    # Normalize for YOLO
    center_x /= image_width
    center_y /= image_height
    box_width /= image_width
    box_height /= image_height

    # Clamp values
    center_x = max(0.0, min(1.0, center_x))
    center_y = max(0.0, min(1.0, center_y))
    box_width = max(0.0, min(1.0, box_width))
    box_height = max(0.0, min(1.0, box_height))

    return (
        f"0 {center_x:.6f} {center_y:.6f} "
        f"{box_width:.6f} {box_height:.6f}\n"
    )


# ============================================================
# COPY DATASET
# ============================================================

def process_samples(samples, split):

    image_dir = DEST / "images" / split
    label_dir = DEST / "labels" / split

    processed = 0
    defects = 0
    good = 0
    missing_masks = 0

    for index, sample in enumerate(samples):

        image_path = sample["image"]
        mask_path = sample["mask"]

        # Unique filename
        new_name = (
            f"{sample['category']}_{index:05d}"
            + image_path.suffix.lower()
        )

        destination_image = image_dir / new_name
        destination_label = label_dir / (
            Path(new_name).stem + ".txt"
        )

        # Copy image
        shutil.copy2(image_path, destination_image)

        # Create label
        label = ""

        if sample["defect"]:

            if mask_path is None:
                missing_masks += 1
            else:
                label = mask_to_yolo(
                    mask_path,
                    image_path
                )

            defects += 1

        else:
            good += 1

        # Every image gets a label file.
        # Good images intentionally have empty labels.
        destination_label.write_text(
            label,
            encoding="utf-8"
        )

        processed += 1

        if processed % 500 == 0:
            print(
                f"{split}: processed {processed}/{len(samples)}"
            )

    return processed, good, defects, missing_masks


# ============================================================
# PROCESS TRAIN
# ============================================================

print("\n" + "=" * 60)
print("PROCESSING TRAIN")
print("=" * 60)

train_result = process_samples(
    train_samples,
    "train"
)

# ============================================================
# PROCESS VALIDATION
# ============================================================

print("\n" + "=" * 60)
print("PROCESSING VALIDATION")
print("=" * 60)

val_result = process_samples(
    val_samples,
    "val"
)

# ============================================================
# CREATE data.yaml
# ============================================================

yaml_content = f"""path: {DEST}

train: images/train
val: images/val

nc: 1
names:
  0: defect
"""

(DEST / "data.yaml").write_text(
    yaml_content,
    encoding="utf-8"
)

# ============================================================
# FINAL SUMMARY
# ============================================================

print("\n" + "=" * 60)
print("CONVERSION COMPLETE")
print("=" * 60)

print(f"Train images : {train_result[0]}")
print(f"Train good   : {train_result[1]}")
print(f"Train defect : {train_result[2]}")

print()

print(f"Val images   : {val_result[0]}")
print(f"Val good     : {val_result[1]}")
print(f"Val defect   : {val_result[2]}")

print()
print(f"Missing masks : {train_result[3] + val_result[3]}")

print()
print("Dataset:")
print(DEST)

print()
print("data.yaml:")
print(DEST / "data.yaml")

print("\nSUCCESS")