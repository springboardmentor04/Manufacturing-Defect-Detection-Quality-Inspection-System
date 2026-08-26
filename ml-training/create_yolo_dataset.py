from pathlib import Path
import cv2
import shutil
import random

# =========================
# PATHS
# =========================

BASE_DIR = Path(__file__).resolve().parent.parent

SOURCE = BASE_DIR / "dataset" / "metal_nut"
OUTPUT = Path(__file__).resolve().parent / "yolo_dataset"

# =========================
# CLEAN OUTPUT
# =========================

if OUTPUT.exists():
    shutil.rmtree(OUTPUT)

for folder in [
    OUTPUT / "images" / "train",
    OUTPUT / "images" / "val",
    OUTPUT / "labels" / "train",
    OUTPUT / "labels" / "val",
]:
    folder.mkdir(parents=True, exist_ok=True)


# =========================
# SETTINGS
# =========================

random.seed(42)

DEFECT_TYPES = ["bent", "color", "flip", "scratch"]


# =========================
# FIND DEFECTIVE IMAGES
# =========================

defective_images = []

for defect_type in DEFECT_TYPES:

    image_dir = SOURCE / "test" / defect_type

    for image_path in sorted(image_dir.glob("*.png")):
        defective_images.append((defect_type, image_path))

print(f"Defective images found: {len(defective_images)}")


# =========================
# FIND GOOD IMAGES
# =========================

good_images = sorted(
    (SOURCE / "train" / "good").glob("*.png")
)

print(f"Good images found: {len(good_images)}")


# =========================
# SPLIT DATA
# =========================

random.shuffle(defective_images)

defect_split = int(len(defective_images) * 0.8)

defect_train = defective_images[:defect_split]
defect_val = defective_images[defect_split:]


random.shuffle(good_images)

good_split = int(len(good_images) * 0.8)

good_train = good_images[:good_split]
good_val = good_images[good_split:]


# =========================
# COPY GOOD IMAGES
# =========================

def copy_good_images(images, split):

    for image_path in images:

        # Unique name
        new_name = f"good_{image_path.stem}.png"

        destination = (
            OUTPUT / "images" / split / new_name
        )

        shutil.copy2(image_path, destination)

        # Empty label = no defect
        label_path = (
            OUTPUT
            / "labels"
            / split
            / f"good_{image_path.stem}.txt"
        )

        label_path.write_text("")


# =========================
# CREATE DEFECT LABEL
# =========================

def create_defect_label(
    image_path,
    defect_type,
    split
):

    # Unique filename
    new_stem = f"{defect_type}_{image_path.stem}"

    image_destination = (
        OUTPUT
        / "images"
        / split
        / f"{new_stem}.png"
    )

    shutil.copy2(
        image_path,
        image_destination
    )

    # =========================
    # FIND MASK
    # =========================

    mask_dir = (
        SOURCE
        / "ground_truth"
        / defect_type
    )

    mask_path = (
        mask_dir
        / f"{image_path.stem}_mask.png"
    )

    if not mask_path.exists():

        print(
            f"WARNING: Mask not found: {mask_path}"
        )

        return

    # =========================
    # READ MASK
    # =========================

    mask = cv2.imread(
        str(mask_path),
        cv2.IMREAD_GRAYSCALE
    )

    if mask is None:

        print(
            f"WARNING: Cannot read mask: {mask_path}"
        )

        return

    # Convert mask to binary
    _, binary = cv2.threshold(
        mask,
        1,
        255,
        cv2.THRESH_BINARY
    )

    # =========================
    # FIND CONTOURS
    # =========================

    contours, _ = cv2.findContours(
        binary,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    # Read original image
    image = cv2.imread(
        str(image_path)
    )

    if image is None:

        print(
            f"WARNING: Cannot read image: {image_path}"
        )

        return

    height, width = image.shape[:2]

    labels = []

    # =========================
    # CONVERT BOX → YOLO
    # =========================

    for contour in contours:

        x, y, w, h = cv2.boundingRect(contour)

        # Ignore tiny noise
        if w < 2 or h < 2:
            continue

        center_x = (
            x + w / 2
        ) / width

        center_y = (
            y + h / 2
        ) / height

        box_width = w / width

        box_height = h / height

        # Class 0 = defect
        labels.append(
            f"0 "
            f"{center_x:.6f} "
            f"{center_y:.6f} "
            f"{box_width:.6f} "
            f"{box_height:.6f}"
        )

    # =========================
    # SAVE LABEL
    # =========================

    label_path = (
        OUTPUT
        / "labels"
        / split
        / f"{new_stem}.txt"
    )

    label_path.write_text(
        "\n".join(labels)
    )

    print(
        f"{split.upper()} | "
        f"{defect_type:8} | "
        f"{image_path.name}"
    )


# =========================
# CREATE TRAINING DATA
# =========================

print("\nCreating training dataset...\n")

copy_good_images(
    good_train,
    "train"
)

for defect_type, image_path in defect_train:

    create_defect_label(
        image_path,
        defect_type,
        "train"
    )


# =========================
# CREATE VALIDATION DATA
# =========================

print("\nCreating validation dataset...\n")

copy_good_images(
    good_val,
    "val"
)

for defect_type, image_path in defect_val:

    create_defect_label(
        image_path,
        defect_type,
        "val"
    )


# =========================
# CREATE data.yaml
# =========================

yaml_content = f"""path: {OUTPUT.as_posix()}
train: images/train
val: images/val

names:
  0: defect
"""

(
    OUTPUT / "data.yaml"
).write_text(
    yaml_content
)


# =========================
# FINAL SUMMARY
# =========================

print("\n====================================")
print("YOLO DATASET CREATED SUCCESSFULLY")
print("====================================")

print(
    f"Training images: "
    f"{len(good_train) + len(defect_train)}"
)

print(
    f"Validation images: "
    f"{len(good_val) + len(defect_val)}"
)

print("Class 0: defect")

print(
    f"Location: {OUTPUT}"
)

print("====================================")