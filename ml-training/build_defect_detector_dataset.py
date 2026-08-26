"""
build_defect_detector_dataset.py

Builds a YOLO-format OBJECT DETECTION dataset for a single class:
"defect" (class 0). Bounding boxes are derived directly from the
MVTec ground_truth masks, so boxes are tightly fit to the actual
defect region instead of the whole product.

Also includes a sample of 'good' images with NO labels (true
negatives), so the detector learns what a clean surface looks like
too.

This is SEPARATE from your 15-category product detector and from
the defect-type classifier. It produces a new dataset only; no
existing model or dataset is touched.

Output layout (standard YOLO detection format):

    defect_detector_dataset/
        images/train/*.png
        images/val/*.png
        labels/train/*.txt
        labels/val/*.txt
        data.yaml

Run inside ml-training venv:

    python build_defect_detector_dataset.py
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

OUTPUT_DIR = Path("defect_detector_dataset")

VAL_SPLIT = 0.15

# How many 'good' (no-defect) images to include per category,
# as true negatives so the model learns clean surfaces too.
GOOD_IMAGES_PER_CATEGORY = 15

random.seed(42)

# ============================================================
# Get ALL separate defect regions from a mask (not just one
# overall bbox) — some images have multiple disconnected
# defect blobs (e.g. multiple scratches).
# ============================================================

def boxes_from_mask(mask_path: Path):
    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)

    if mask is None:
        return []

    _, binary = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(
        binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    boxes = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w > 2 and h > 2:  # skip tiny noise specks
            boxes.append((x, y, w, h))

    return boxes


def to_yolo_label(box, img_w, img_h):
    x, y, w, h = box
    cx = (x + w / 2) / img_w
    cy = (y + h / 2) / img_h
    nw = w / img_w
    nh = h / img_h
    return f"0 {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}"


# ============================================================
# MAIN
# ============================================================

def main():

    if not SOURCE_DIR.exists():
        raise FileNotFoundError(f"Source dataset not found:\n{SOURCE_DIR}")

    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)

    for split in ["train", "val"]:
        (OUTPUT_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (OUTPUT_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    categories = sorted([p for p in SOURCE_DIR.iterdir() if p.is_dir()])

    # Collect (image_path, label_lines_or_None) pairs
    samples = []

    for category_dir in categories:
        category = category_dir.name
        test_dir = category_dir / "test"
        gt_dir = category_dir / "ground_truth"

        if not test_dir.exists():
            continue

        # ---- defective images: real bounding boxes from masks ----
        defect_dirs = [
            d for d in test_dir.iterdir()
            if d.is_dir() and d.name != "good"
        ]

        for defect_dir in defect_dirs:
            raw_label = defect_dir.name
            mask_dir = gt_dir / raw_label

            for img_path in defect_dir.glob("*.png"):
                mask_path = mask_dir / f"{img_path.stem}_mask.png"

                if not mask_path.exists():
                    continue

                image = cv2.imread(str(img_path))
                if image is None:
                    continue

                h, w = image.shape[:2]
                boxes = boxes_from_mask(mask_path)

                if not boxes:
                    continue

                label_lines = [to_yolo_label(b, w, h) for b in boxes]

                out_name = f"{category}_{raw_label}_{img_path.stem}"
                samples.append((img_path, out_name, label_lines))

        # ---- good images: true negatives, empty label file ----
        good_dir = test_dir / "good"
        if good_dir.exists():
            good_images = list(good_dir.glob("*.png"))
            random.shuffle(good_images)

            for img_path in good_images[:GOOD_IMAGES_PER_CATEGORY]:
                out_name = f"{category}_good_{img_path.stem}"
                samples.append((img_path, out_name, []))  # empty = no defect

    print(f"Collected {len(samples)} total images (defective + good).")

    # ---- split train/val ----
    random.shuffle(samples)
    n_val = max(1, int(len(samples) * VAL_SPLIT))
    val_samples = samples[:n_val]
    train_samples = samples[n_val:]

    def write_split(split_name, split_samples):
        for img_path, out_name, label_lines in split_samples:
            image = cv2.imread(str(img_path))
            if image is None:
                continue

            out_img_path = OUTPUT_DIR / "images" / split_name / f"{out_name}.png"
            out_label_path = OUTPUT_DIR / "labels" / split_name / f"{out_name}.txt"

            cv2.imwrite(str(out_img_path), image)

            with open(out_label_path, "w") as f:
                f.write("\n".join(label_lines))

    write_split("train", train_samples)
    write_split("val", val_samples)

    # ---- write data.yaml ----
    data_yaml_content = f"""path: {OUTPUT_DIR.resolve()}
train: images/train
val: images/val
nc: 1
names:
  0: defect
"""
    with open(OUTPUT_DIR / "data.yaml", "w") as f:
        f.write(data_yaml_content)

    print(f"Train images: {len(train_samples)}")
    print(f"Val images:   {len(val_samples)}")
    print(f"Output dir:   {OUTPUT_DIR.resolve()}")
    print("Done.")


if __name__ == "__main__":
    main()