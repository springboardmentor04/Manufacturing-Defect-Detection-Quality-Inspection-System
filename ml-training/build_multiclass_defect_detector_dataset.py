"""
build_multiclass_defect_detector_dataset.py

Builds a YOLO-format OBJECT DETECTION dataset with MULTIPLE defect
classes (crack, scratch, hole, etc. — the same unified label set
used for the classifier), with bounding boxes derived directly from
the MVTec ground_truth masks.

This single model both LOCATES and CLASSIFIES the defect in one
pass — replacing the two-stage detector+classifier pipeline with
one multi-class detector.

Also includes a sample of 'good' images with NO labels (true
negatives), so the detector learns clean surfaces too.

Output layout (standard YOLO detection format):

    multiclass_defect_dataset/
        images/train/*.png
        images/val/*.png
        labels/train/*.txt
        labels/val/*.txt
        data.yaml

Run inside ml-training venv:

    python build_multiclass_defect_detector_dataset.py
"""

import cv2
from pathlib import Path
import random
import shutil

# ============================================================
# SETTINGS
# ============================================================

SOURCE_DIR = Path(
    r"C:\Users\veene.LAPTOP-VQNJ8SHT\Downloads\mvtec_anomaly_detection"
)

OUTPUT_DIR = Path("multiclass_defect_dataset")

VAL_SPLIT = 0.15

GOOD_IMAGES_PER_CATEGORY = 15

random.seed(42)

# ============================================================
# Same unified label mapping used for the classifier —
# keeps both models consistent with each other.
# ============================================================

DEFECT_LABEL_MAP = {
    "crack": "crack",
    "broken_large": "broken", "broken_small": "broken", "broken": "broken",
    "broken_teeth": "broken", "damaged_case": "broken",
    "scratch": "scratch", "scratch_head": "scratch", "scratch_neck": "scratch",
    "contamination": "contamination", "metal_contamination": "contamination",
    "oil": "contamination", "liquid": "contamination", "gray_stroke": "contamination",
    "hole": "hole", "poke": "hole", "poke_insulation": "hole",
    "missing_cable": "missing_component", "missing_wire": "missing_component",
    "bent": "deformation", "bent_wire": "deformation", "bent_lead": "deformation",
    "flip": "deformation", "fold": "deformation", "misplaced": "deformation",
    "squeeze": "deformation", "squeezed_teeth": "deformation",
    "manipulated_front": "deformation", "cut_lead": "deformation",
    "cable_swap": "deformation",
    "color": "discoloration", "faulty_imprint": "discoloration", "print": "discoloration",
    "cut": "cut", "cut_inner_insulation": "cut", "cut_outer_insulation": "cut",
    "split_teeth": "cut", "fabric_border": "cut", "fabric_interior": "cut",
    "glue": "foreign_material", "glue_strip": "foreign_material",
    "thread": "foreign_material", "thread_side": "foreign_material",
    "thread_top": "foreign_material",
    "combined": "other", "rough": "other", "pill_type": "other", "defective": "other",
}

# Fixed class order — index in this list = YOLO class id.
# Must match the order used everywhere else in the project.
CLASS_LIST = [
    "broken", "contamination", "crack", "cut", "deformation",
    "discoloration", "foreign_material", "hole", "missing_component",
    "other", "scratch",
]
CLASS_TO_ID = {name: i for i, name in enumerate(CLASS_LIST)}


def unify_label(raw_name: str) -> str:
    return DEFECT_LABEL_MAP.get(raw_name, "other")


# ============================================================
# Get all separate defect regions from a mask
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
        if w > 2 and h > 2:
            boxes.append((x, y, w, h))

    return boxes


def to_yolo_label(class_id, box, img_w, img_h):
    x, y, w, h = box
    cx = (x + w / 2) / img_w
    cy = (y + h / 2) / img_h
    nw = w / img_w
    nh = h / img_h
    return f"{class_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}"


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

    samples = []
    class_counts = {name: 0 for name in CLASS_LIST}

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
            class_id = CLASS_TO_ID[unified_label]

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

                label_lines = [to_yolo_label(class_id, b, w, h) for b in boxes]
                class_counts[unified_label] += len(boxes)

                out_name = f"{category}_{raw_label}_{img_path.stem}"
                samples.append((img_path, out_name, label_lines))

        good_dir = test_dir / "good"
        if good_dir.exists():
            good_images = list(good_dir.glob("*.png"))
            random.shuffle(good_images)

            for img_path in good_images[:GOOD_IMAGES_PER_CATEGORY]:
                out_name = f"{category}_good_{img_path.stem}"
                samples.append((img_path, out_name, []))

    print(f"Collected {len(samples)} total images (defective + good).")
    print("\nBoxes per class:")
    for name, count in sorted(class_counts.items(), key=lambda x: -x[1]):
        print(f"  {name:20s} {count}")

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

    names_yaml = "\n".join(f"  {i}: {name}" for i, name in enumerate(CLASS_LIST))
    data_yaml_content = f"""path: {OUTPUT_DIR.resolve()}
train: images/train
val: images/val
nc: {len(CLASS_LIST)}
names:
{names_yaml}
"""
    with open(OUTPUT_DIR / "data.yaml", "w") as f:
        f.write(data_yaml_content)

    print(f"\nTrain images: {len(train_samples)}")
    print(f"Val images:   {len(val_samples)}")
    print(f"Output dir:   {OUTPUT_DIR.resolve()}")
    print("Done.")


if __name__ == "__main__":
    main()