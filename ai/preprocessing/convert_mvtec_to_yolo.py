from pathlib import Path
import cv2

from utils import (
    mask_to_bbox,
    save_label,
    copy_image,
)

# ==========================================
# VisionInspect AI
# Phase 6.1
# Convert MVTec AD Dataset to YOLO Format
# Store Real Class Names
# ==========================================

MVTEC_ROOT = Path("ai/dataset/MVTec_AD")

YOLO_IMAGES = Path("ai/yolo_dataset/images/train")
YOLO_LABELS = Path("ai/yolo_dataset/labels/train")

YOLO_IMAGES.mkdir(parents=True, exist_ok=True)
YOLO_LABELS.mkdir(parents=True, exist_ok=True)

print("=" * 70)
print("VisionInspect AI")
print("Automatic Dataset Converter")
print("=" * 70)

# ---------------------------------------------------
# Find all product categories
# ---------------------------------------------------

categories = sorted(
    [
        c for c in MVTEC_ROOT.iterdir()
        if c.is_dir()
    ]
)

class_id = 0
total_images = 0

# ==========================================
# NEW: Store real class names
# ==========================================

class_names = []

# ---------------------------------------------------
# Convert every category
# ---------------------------------------------------

for category in categories:

    print(f"\n📦 Category : {category.name}")

    test_dir = category / "test"
    gt_dir = category / "ground_truth"

    if not test_dir.exists():
        continue

    defect_types = sorted(
        [
            d for d in test_dir.iterdir()
            if d.is_dir() and d.name != "good"
        ]
    )

    # -----------------------------------------
    # Convert every defect
    # -----------------------------------------

    for defect in defect_types:

        print(f"   🔹 Defect : {defect.name}")

        # =====================================
        # NEW: Save readable class name
        # =====================================

        class_name = f"{category.name}_{defect.name}"
        class_names.append(class_name)

        image_dir = defect
        mask_dir = gt_dir / defect.name

        if not mask_dir.exists():
            continue

        converted = 0

        for image_path in sorted(image_dir.glob("*.png")):

            image_name = image_path.stem

            mask_path = (
                mask_dir /
                f"{image_name}_mask.png"
            )

            if not mask_path.exists():
                continue

            image = cv2.imread(str(image_path))

            mask = cv2.imread(
                str(mask_path),
                cv2.IMREAD_GRAYSCALE,
            )

            bbox = mask_to_bbox(mask)

            if bbox is None:
                continue

            output_image = (
                YOLO_IMAGES /
                f"{category.name}_{defect.name}_{image_name}.png"
            )

            output_label = (
                YOLO_LABELS /
                f"{category.name}_{defect.name}_{image_name}.txt"
            )

            save_label(
                output_label,
                class_id,
                bbox,
                mask.shape,
            )

            copy_image(
                image_path,
                output_image,
            )

            converted += 1
            total_images += 1

        print(f"      ✅ Converted : {converted}")

        class_id += 1

print("\n" + "=" * 70)
print("Dataset Conversion Completed")
print("=" * 70)

print(f"Total Classes : {class_id}")
print(f"Total Images  : {total_images}")

# ==========================================
# NEW: Display all class names
# ==========================================

print("\nGenerated Class Names:\n")

for index, name in enumerate(class_names):
    print(f"{index:02d} -> {name}")

print("=" * 70)