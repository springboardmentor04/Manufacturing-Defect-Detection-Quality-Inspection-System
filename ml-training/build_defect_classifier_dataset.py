"""
build_defect_classifier_dataset.py

Builds a defect-TYPE classification dataset (crack, scratch, contamination,
hole, missing_component, deformation, discoloration, broken) from the raw
MVTec AD dataset, using the ground_truth masks to crop just the defect
region out of each image.

This is SEPARATE from your existing 15-class product-category detector.
It does not touch that model or its training data in any way.

Run this on your local machine (Windows), inside the ml-training venv,
after adjusting SOURCE_DIR / OUTPUT_DIR below if needed.

    cd ml-training
    & ".\venv\Scripts\Activate.ps1"
    python build_defect_classifier_dataset.py
"""

import cv2
import numpy as np
from pathlib import Path
import random
import shutil

# ============================================================
# SETTINGS
# ============================================================

SOURCE_DIR = Path(
    r"C:\Users\veene.LAPTOP-VQNJ8SHT\Downloads\mvtec_anomaly_detection"
)

OUTPUT_DIR = Path(
    r"C:\Users\veene.LAPTOP-VQNJ8SHT\OneDrive\Infosys\intern\visioninspect-ai"
    r"\visioninspect-ai\ml-training\classifier_dataset"
)

# Fraction of images per class that go to val instead of train
VAL_SPLIT = 0.15

# Padding (in pixels) added around each cropped defect bounding box
CROP_PADDING = 15

# Random seed for reproducible train/val split
random.seed(42)

# ============================================================
# UNIFY MVTec's ~70 raw defect subfolder names into a small,
# consistent label set. Anything not listed falls back to the
# raw folder name itself (so nothing is silently dropped).
# ============================================================

DEFECT_LABEL_MAP = {
    # crack
    "crack": "crack",

    # broken / structural damage
    "broken_large": "broken",
    "broken_small": "broken",
    "broken": "broken",
    "broken_teeth": "broken",
    "damaged_case": "broken",

    # scratch
    "scratch": "scratch",
    "scratch_head": "scratch",
    "scratch_neck": "scratch",

    # contamination / dirt / stains
    "contamination": "contamination",
    "metal_contamination": "contamination",
    "oil": "contamination",
    "liquid": "contamination",
    "gray_stroke": "contamination",

    # holes
    "hole": "hole",
    "poke": "hole",
    "poke_insulation": "hole",

    # missing component
    "missing_cable": "missing_component",
    "missing_wire": "missing_component",

    # deformation / bending / misalignment
    "bent": "deformation",
    "bent_wire": "deformation",
    "bent_lead": "deformation",
    "flip": "deformation",
    "fold": "deformation",
    "misplaced": "deformation",
    "squeeze": "deformation",
    "squeezed_teeth": "deformation",
    "manipulated_front": "deformation",
    "cut_lead": "deformation",
    "cable_swap": "deformation",

    # discoloration
    "color": "discoloration",
    "faulty_imprint": "discoloration",
    "print": "discoloration",

    # cuts / tears (fabric, insulation, leather etc.)
    "cut": "cut",
    "cut_inner_insulation": "cut",
    "cut_outer_insulation": "cut",
    "split_teeth": "cut",
    "fabric_border": "cut",
    "fabric_interior": "cut",

    # foreign material / glue / thread
    "glue": "foreign_material",
    "glue_strip": "foreign_material",
    "thread": "foreign_material",
    "thread_side": "foreign_material",
    "thread_top": "foreign_material",

    # combined / other
    "combined": "other",
    "rough": "other",
    "pill_type": "other",
    "defective": "other",
}


def unify_label(raw_name: str) -> str:
    return DEFECT_LABEL_MAP.get(raw_name, raw_name)


# ============================================================
# Get bounding box of the defect from its ground-truth mask
# ============================================================

def bbox_from_mask(mask_path: Path):
    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)

    if mask is None:
        return None

    ys, xs = np.where(mask > 0)

    if len(xs) == 0 or len(ys) == 0:
        return None

    x1, x2 = int(xs.min()), int(xs.max())
    y1, y2 = int(ys.min()), int(ys.max())

    return x1, y1, x2, y2


def crop_with_padding(image, bbox, padding):
    h, w = image.shape[:2]
    x1, y1, x2, y2 = bbox

    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(w, x2 + padding)
    y2 = min(h, y2 + padding)

    return image[y1:y2, x1:x2]


# ============================================================
# MAIN
# ============================================================

def main():

    if not SOURCE_DIR.exists():
        raise FileNotFoundError(f"Source dataset not found:\n{SOURCE_DIR}")

    categories = [p for p in SOURCE_DIR.iterdir() if p.is_dir()]
    print(f"Found {len(categories)} categories in raw MVTec dataset.")

    # Collect (image_path, mask_path, unified_label, category) tuples first,
    # so we can do a clean per-class train/val split afterward.
    collected = []

    for category_dir in categories:
        category = category_dir.name
        test_dir = category_dir / "test"
        gt_dir = category_dir / "ground_truth"

        if not test_dir.exists():
            continue

        defect_dirs = [
            d for d in test_dir.iterdir()
            if d.is_dir() and d.name != "good"
        ]

        for defect_dir in defect_dirs:
            raw_label = defect_dir.name
            unified_label = unify_label(raw_label)

            mask_dir = gt_dir / raw_label

            for img_path in defect_dir.glob("*.png"):
                mask_path = mask_dir / f"{img_path.stem}_mask.png"

                if not mask_path.exists():
                    continue

                collected.append((img_path, mask_path, unified_label, category))

    print(f"Collected {len(collected)} defect images across all categories.")

    # Group by unified label for a per-class train/val split
    by_label = {}
    for item in collected:
        by_label.setdefault(item[2], []).append(item)

    print("\nClass distribution:")
    for label, items in sorted(by_label.items()):
        print(f"  {label:20s} {len(items)}")

    # Wipe/recreate output dir
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)

    n_train_total = 0
    n_val_total = 0

    for label, items in by_label.items():
        random.shuffle(items)

        n_val = max(1, int(len(items) * VAL_SPLIT))
        val_items = items[:n_val]
        train_items = items[n_val:]

        for split_name, split_items in [("train", train_items), ("val", val_items)]:
            out_dir = OUTPUT_DIR / split_name / label
            out_dir.mkdir(parents=True, exist_ok=True)

            for img_path, mask_path, _, category in split_items:
                bbox = bbox_from_mask(mask_path)
                if bbox is None:
                    continue

                image = cv2.imread(str(img_path))
                if image is None:
                    continue

                crop = crop_with_padding(image, bbox, CROP_PADDING)

                if crop.size == 0:
                    continue

                out_name = f"{category}_{img_path.stem}.png"
                cv2.imwrite(str(out_dir / out_name), crop)

                if split_name == "train":
                    n_train_total += 1
                else:
                    n_val_total += 1

    print("\nDone.")
    print(f"Train images: {n_train_total}")
    print(f"Val images:   {n_val_total}")
    print(f"Output dir:   {OUTPUT_DIR}")


if __name__ == "__main__":
    main()