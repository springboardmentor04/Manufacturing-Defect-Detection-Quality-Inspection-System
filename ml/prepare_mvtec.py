import os
import tarfile
import shutil
import cv2
import numpy as np
import argparse
import json
from pathlib import Path
from tqdm import tqdm


def parse_args():
    parser = argparse.ArgumentParser(
        description="Prepare MVTec AD Dataset for multi-class YOLO defect training"
    )
    parser.add_argument(
        "--archive",
        type=str,
        default="",
        help="Optional path to mvtec_anomaly_detection.tar.xz"
    )
    parser.add_argument(
        "--category",
        type=str,
        default="",
        help="Optional single MVTec category to process"
    )
    return parser.parse_args()


def validate_yolo_labels(label_dir: Path, num_classes: int):
    stats = {
        "total": 0,
        "non_empty": 0,
        "empty": 0,
        "invalid": 0,
    }

    for label_file in sorted(label_dir.rglob("*.txt")):
        stats["total"] += 1

        try:
            contents = label_file.read_text().strip().splitlines()
        except Exception:
            stats["invalid"] += 1
            continue

        if not contents:
            stats["empty"] += 1
            continue

        stats["non_empty"] += 1

        for line in contents:
            parts = line.strip().split()

            if len(parts) != 5:
                stats["invalid"] += 1
                continue

            try:
                class_id = int(float(parts[0]))
                x_c, y_c, w, h = [float(p) for p in parts[1:]]
            except ValueError:
                stats["invalid"] += 1
                continue

            if not (
                0 <= class_id < num_classes
                and 0.0 <= x_c <= 1.0
                and 0.0 <= y_c <= 1.0
                and 0.0 < w <= 1.0
                and 0.0 < h <= 1.0
            ):
                stats["invalid"] += 1

    return stats


def main():
    args = parse_args()

    project_root = Path(__file__).resolve().parent.parent
    raw_dir = project_root / "datasets" / "mvtec_raw"
    yolo_dir = project_root / "datasets" / "yolo_dataset"

    if yolo_dir.exists():
        print(f"Removing stale YOLO dataset directory: {yolo_dir}")
        shutil.rmtree(yolo_dir)

    # ---------------------------------------------------------
    # Optional archive extraction
    # ---------------------------------------------------------
    if args.archive:
        archive_path = Path(args.archive)

        if not archive_path.exists():
            raise FileNotFoundError(
                f"Archive not found at {archive_path}"
            )

        print(f"Extracting {archive_path} to {raw_dir}...")

        raw_dir.mkdir(parents=True, exist_ok=True)

        with tarfile.open(archive_path, "r:xz") as tar:
            for member in tqdm(
                tar.getmembers(),
                desc="Extracting Tar Archive"
            ):
                tar.extract(member, path=raw_dir)

    if not raw_dir.exists():
        raise FileNotFoundError(
            f"MVTec raw dataset not found at {raw_dir}"
        )

    # ---------------------------------------------------------
    # Discover categories
    # ---------------------------------------------------------
    if args.category:
        selected_categories = [args.category]
    else:
        selected_categories = sorted(
            p.name
            for p in raw_dir.iterdir()
            if p.is_dir()
        )

    valid_categories = []

    for category in selected_categories:
        category_dir = raw_dir / category

        if (
            (category_dir / "train").exists()
            and (category_dir / "test").exists()
            and (category_dir / "ground_truth").exists()
        ):
            valid_categories.append(category)

    if not valid_categories:
        raise ValueError(
            f"No valid MVTec categories found under {raw_dir}"
        )

    print("\nValid categories:")
    for category in valid_categories:
        print(f"  - {category}")

    # ---------------------------------------------------------
    # Discover defect classes automatically
    # ---------------------------------------------------------
    class_entries = []

    for category in valid_categories:
        test_dir = raw_dir / category / "test"

        defect_types = sorted(
            p.name
            for p in test_dir.iterdir()
            if p.is_dir() and p.name.lower() != "good"
        )

        for defect_type in defect_types:
            class_name = f"{category}_{defect_type}"

            class_entries.append({
                "class_id": len(class_entries),
                "class_name": class_name,
                "category": category,
                "defect_type": defect_type,
            })

    if not class_entries:
        raise ValueError("No defect classes were discovered.")

    class_lookup = {
        (entry["category"], entry["defect_type"]): entry["class_id"]
        for entry in class_entries
    }

    class_names = [
        entry["class_name"]
        for entry in class_entries
    ]

    num_classes = len(class_names)

    print("\n========================================")
    print("DISCOVERED DEFECT CLASSES")
    print("========================================")

    for entry in class_entries:
        print(
            f"{entry['class_id']:>3} : "
            f"{entry['class_name']}"
        )

    print(f"\nTotal defect classes: {num_classes}")

    # ---------------------------------------------------------
    # Create YOLO directories
    # ---------------------------------------------------------
    for split in ["train", "val"]:
        (yolo_dir / "images" / split).mkdir(
            parents=True,
            exist_ok=True
        )

        (yolo_dir / "labels" / split).mkdir(
            parents=True,
            exist_ok=True
        )

    # ---------------------------------------------------------
    # Fixed random seed for reproducibility
    # ---------------------------------------------------------
    rng = np.random.default_rng(42)

    total_image_files = 0
    total_label_files = 0
    total_empty_labels = 0

    # ---------------------------------------------------------
    # Process each category
    # ---------------------------------------------------------
    for category in valid_categories:

        category_dir = raw_dir / category
        test_dir = category_dir / "test"
        ground_truth_dir = category_dir / "ground_truth"

        defect_images = []

        # ---------------------------------------------
        # Defect images
        # ---------------------------------------------
        for defect_type in sorted(
            p.name
            for p in test_dir.iterdir()
            if p.is_dir() and p.name.lower() != "good"
        ):

            defect_dir = test_dir / defect_type

            for img_path in sorted(defect_dir.iterdir()):

                if img_path.suffix.lower() not in (
                    ".png",
                    ".jpg",
                    ".jpeg",
                ):
                    continue

                mask_path = (
                    ground_truth_dir
                    / defect_type
                    / f"{img_path.stem}_mask.png"
                )

                if not mask_path.exists():
                    print(
                        f"WARNING: Missing mask: {mask_path}"
                    )
                    continue

                defect_images.append(
                    (
                        category,
                        defect_type,
                        img_path,
                        mask_path,
                    )
                )

        if not defect_images:
            print(
                f"No defect images found for {category}"
            )
            continue

        # ---------------------------------------------
        # Deterministic split
        # ---------------------------------------------
        indices = np.arange(len(defect_images))
        rng.shuffle(indices)

        split_idx = int(len(indices) * 0.8)

        train_indices = indices[:split_idx]
        val_indices = indices[split_idx:]

        split_data = {
            "train": [defect_images[i] for i in train_indices],
            "val": [defect_images[i] for i in val_indices],
        }

        # ---------------------------------------------
        # Process images
        # ---------------------------------------------
        for split_name, files_list in split_data.items():

            for (
                category_name,
                defect_type,
                img_path,
                mask_path,
            ) in tqdm(
                files_list,
                desc=f"Processing {category}/{split_name}"
            ):

                img = cv2.imread(str(img_path))

                if img is None:
                    print(
                        f"WARNING: unreadable image: {img_path}"
                    )
                    continue

                mask = cv2.imread(
                    str(mask_path),
                    cv2.IMREAD_GRAYSCALE
                )

                if mask is None:
                    print(
                        f"WARNING: unreadable mask: {mask_path}"
                    )
                    continue

                h, w = img.shape[:2]

                contours, _ = cv2.findContours(
                    mask,
                    cv2.RETR_EXTERNAL,
                    cv2.CHAIN_APPROX_SIMPLE,
                )

                class_id = class_lookup[
                    (category_name, defect_type)
                ]

                unique_name = (
                    f"{category_name}_{defect_type}_{img_path.name}"
                )

                output_image = (
                    yolo_dir
                    / "images"
                    / split_name
                    / unique_name
                )

                output_label = (
                    yolo_dir
                    / "labels"
                    / split_name
                    / f"{Path(unique_name).stem}.txt"
                )

                output_image.parent.mkdir(
                    parents=True,
                    exist_ok=True
                )

                output_label.parent.mkdir(
                    parents=True,
                    exist_ok=True
                )

                cv2.imwrite(
                    str(output_image),
                    img
                )

                written = False

                with open(
                    output_label,
                    "w",
                    encoding="utf-8"
                ) as f:

                    for contour in contours:

                        x, y, bw, bh = cv2.boundingRect(
                            contour
                        )

                        if bw <= 0 or bh <= 0:
                            continue

                        x_center = (
                            x + bw / 2
                        ) / w

                        y_center = (
                            y + bh / 2
                        ) / h

                        box_width = bw / w
                        box_height = bh / h

                        if not (
                            0.0 <= x_center <= 1.0
                            and 0.0 <= y_center <= 1.0
                            and 0.0 < box_width <= 1.0
                            and 0.0 < box_height <= 1.0
                        ):
                            continue

                        f.write(
                            f"{class_id} "
                            f"{x_center:.6f} "
                            f"{y_center:.6f} "
                            f"{box_width:.6f} "
                            f"{box_height:.6f}\n"
                        )

                        written = True

                total_image_files += 1
                total_label_files += 1

                if not written:
                    total_empty_labels += 1

    # ---------------------------------------------------------
    # Validate labels
    # ---------------------------------------------------------
    label_stats = {}

    total_invalid_labels = 0

    for split in ["train", "val"]:

        stats = validate_yolo_labels(
            yolo_dir / "labels" / split,
            num_classes,
        )

        label_stats[split] = stats

        total_invalid_labels += stats["invalid"]

    if total_invalid_labels > 0:
        raise ValueError(
            f"Dataset validation failed: "
            f"{total_invalid_labels} invalid labels found."
        )

    # ---------------------------------------------------------
    # data.yaml
    # ---------------------------------------------------------
    yaml_path = yolo_dir / "data.yaml"

    yaml_lines = [
        f"path: {yolo_dir.absolute()}",
        "train: images/train",
        "val: images/val",
        f"nc: {num_classes}",
        "names:",
    ]

    for class_id, class_name in enumerate(class_names):
        yaml_lines.append(
            f"  {class_id}: {class_name}"
        )

    yaml_path.write_text(
        "\n".join(yaml_lines) + "\n",
        encoding="utf-8",
    )

    # ---------------------------------------------------------
    # class_mapping.json
    # ---------------------------------------------------------
    mapping_path = (
        yolo_dir / "class_mapping.json"
    )

    mapping = {
        str(entry["class_id"]): entry
        for entry in class_entries
    }

    mapping_path.write_text(
        json.dumps(
            mapping,
            indent=2,
        ),
        encoding="utf-8",
    )

    # ---------------------------------------------------------
    # Final summary
    # ---------------------------------------------------------
    print("\n========================================")
    print("DATASET PREPARATION COMPLETE")
    print("========================================")

    print(f"Categories: {len(valid_categories)}")
    print(f"Defect classes: {num_classes}")
    print(f"Images processed: {total_image_files}")
    print(f"Label files: {total_label_files}")
    print(f"Empty labels: {total_empty_labels}")

    print("\nTrain label statistics:")
    print(label_stats["train"])

    print("\nValidation label statistics:")
    print(label_stats["val"])

    print(f"\nDataset YAML:")
    print(yaml_path)

    print("\nClass mapping:")
    print(mapping_path)

    print("\nAll generated YOLO labels are valid.")


if __name__ == "__main__":
    main()