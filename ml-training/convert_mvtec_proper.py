from pathlib import Path
import random
import shutil
import cv2

# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

SOURCE = BASE_DIR / "dataset" / "metal_nut"
OUTPUT = Path(r"C:\YOLO_DATASET")

# Reproducible split
random.seed(42)

# YOLO class
CLASS_ID = 0

# Train / validation / test ratios
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15


# ============================================================
# CREATE DIRECTORIES
# ============================================================

for split in ["train", "val", "test"]:
    (OUTPUT / "images" / split).mkdir(parents=True, exist_ok=True)
    (OUTPUT / "labels" / split).mkdir(parents=True, exist_ok=True)


# ============================================================
# CLEAR OLD YOLO DATASET
# ============================================================

print("Clearing old YOLO dataset...")

for split in ["train", "val", "test"]:
    for folder_type in ["images", "labels"]:
        folder = OUTPUT / folder_type / split

        for item in folder.iterdir():
            try:
                if item.is_file():
                    item.chmod(0o666)
                    item.unlink()
                elif item.is_dir():
                    shutil.rmtree(item)
            except PermissionError:
                print(f"Could not delete: {item}")

# ============================================================
# GET GOOD IMAGES
# ============================================================

good_train_dir = SOURCE / "train" / "good"
good_test_dir = SOURCE / "test" / "good"

good_images = []

# Official MVTec training good images
for image in good_train_dir.glob("*.png"):
    good_images.append(image)

# MVTec test good images
for image in good_test_dir.glob("*.png"):
    good_images.append(image)

print(f"Good images found: {len(good_images)}")


# ============================================================
# GET DEFECTIVE IMAGES
# ============================================================

defect_types = ["bent", "color", "flip", "scratch"]

defect_images = []

for defect_type in defect_types:

    image_dir = SOURCE / "test" / defect_type

    if not image_dir.exists():
        print(f"Warning: {image_dir} not found")
        continue

    for image in image_dir.glob("*.png"):

        mask = SOURCE / "ground_truth" / defect_type / f"{image.stem}_mask.png"

        if mask.exists():
            defect_images.append((image, mask, defect_type))
        else:
            print(f"Warning: mask missing for {image}")

print(f"Defective images found: {len(defect_images)}")


# ============================================================
# SPLIT FUNCTION
# ============================================================

def split_items(items):

    items = items.copy()
    random.shuffle(items)

    total = len(items)

    train_end = int(total * TRAIN_RATIO)
    val_end = train_end + int(total * VAL_RATIO)

    train_items = items[:train_end]
    val_items = items[train_end:val_end]
    test_items = items[val_end:]

    return {
        "train": train_items,
        "val": val_items,
        "test": test_items
    }


good_split = split_items(good_images)
defect_split = split_items(defect_images)


# ============================================================
# MASK → YOLO BOUNDING BOX
# ============================================================

def mask_to_yolo_boxes(mask_path):

    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)

    if mask is None:
        return []

    # Convert mask to binary
    _, binary = cv2.threshold(mask, 0, 255, cv2.THRESH_BINARY)

    height, width = binary.shape

    # Find connected defect regions
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        binary,
        connectivity=8
    )

    boxes = []

    # Skip background (label 0)
    for i in range(1, num_labels):

        x = stats[i, cv2.CC_STAT_LEFT]
        y = stats[i, cv2.CC_STAT_TOP]
        w = stats[i, cv2.CC_STAT_WIDTH]
        h = stats[i, cv2.CC_STAT_HEIGHT]
        area = stats[i, cv2.CC_STAT_AREA]

        # Ignore tiny noise
        if area < 10:
            continue

        # Convert to YOLO normalized format
        center_x = (x + w / 2) / width
        center_y = (y + h / 2) / height

        norm_w = w / width
        norm_h = h / height

        boxes.append(
            f"{CLASS_ID} "
            f"{center_x:.6f} "
            f"{center_y:.6f} "
            f"{norm_w:.6f} "
            f"{norm_h:.6f}"
        )

    return boxes


# ============================================================
# COPY GOOD IMAGE
# ============================================================

good_count = 0

for split, images in good_split.items():

    for index, image_path in enumerate(images):

        # Unique filename for every image
        new_name = f"good_{split}_{index}_{image_path.stem}.png"

        destination_image = OUTPUT / "images" / split / new_name
        destination_label = OUTPUT / "labels" / split / f"{Path(new_name).stem}.txt"

        shutil.copy(image_path, destination_image)

        # Empty label = no defect
        destination_label.write_text("")

        good_count += 1


# ============================================================
# COPY DEFECTIVE IMAGE + LABEL
# ============================================================

defect_count = 0
box_count = 0

for split, items in defect_split.items():

    for image_path, mask_path, defect_type in items:

        new_name = f"{defect_type}_{image_path.stem}.png"

        destination_image = OUTPUT / "images" / split / new_name
        destination_label = OUTPUT / "labels" / split / f"{defect_type}_{image_path.stem}.txt"

        shutil.copy2(image_path, destination_image)

        boxes = mask_to_yolo_boxes(mask_path)

        destination_label.write_text("\n".join(boxes))

        defect_count += 1
        box_count += len(boxes)


# ============================================================
# CREATE DATA.YAML
# ============================================================

data_yaml = f"""path: {OUTPUT.as_posix()}
train: images/train
val: images/val
test: images/test

nc: 1
names:
  0: defect
"""

(OUTPUT / "data.yaml").write_text(data_yaml)


# ============================================================
# SUMMARY
# ============================================================

print()
print("=" * 60)
print("YOLO DATASET CREATED")
print("=" * 60)

for split in ["train", "val", "test"]:

    image_count = len(list((OUTPUT / "images" / split).glob("*.png")))
    label_count = len(list((OUTPUT / "labels" / split).glob("*.txt")))

    print(
        f"{split.upper():5} : "
        f"{image_count} images | "
        f"{label_count} labels"
    )

print()
print(f"Good images     : {good_count}")
print(f"Defective images: {defect_count}")
print(f"Bounding boxes  : {box_count}")
print()
print(f"Dataset location: {OUTPUT}")
print("=" * 60)