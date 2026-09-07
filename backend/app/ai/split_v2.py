# ============================================================
# VISIONINSPECT AI
# DATASET SPLIT V2
# ============================================================
#
# Purpose:
#   Create reproducible, leakage-safe dataset manifests for
#   the MVTec AD dataset.
#
# IMPORTANT:
#   MVTec AD provides:
#
#       train/good
#       test/good
#       test/<defect_type>
#
#   We DO NOT use official test images for training or
#   validation.
#
#   Development splits are created only from train/good.
#
# ============================================================

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Dict, List, Tuple


# ============================================================
# CONFIGURATION
# ============================================================

SEED = 42

DEFAULT_ROOT = Path("dataset/mvtec_ad")

TRAIN_RATIO = 0.85
VAL_RATIO = 0.15


CATEGORIES = [
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
    "zipper",
]


# ============================================================
# IMAGE EXTENSIONS
# ============================================================

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}


# ============================================================
# HELPERS
# ============================================================

def is_image(path: Path) -> bool:
    return (
        path.is_file()
        and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def collect_images(folder: Path) -> List[str]:

    if not folder.exists():
        return []

    images = [
        str(path.resolve())
        for path in folder.rglob("*")
        if is_image(path)
    ]

    return sorted(images)


def normalize_path(path: str) -> str:
    return str(Path(path).resolve())


# ============================================================
# TRAIN / VALIDATION SPLIT
# ============================================================

def split_train_validation(
    images: List[str],
    train_ratio: float = TRAIN_RATIO,
    seed: int = SEED,
) -> Tuple[List[str], List[str]]:

    if not images:
        return [], []

    images = sorted(
        normalize_path(path)
        for path in images
    )

    rng = random.Random(seed)

    shuffled = images.copy()

    rng.shuffle(shuffled)

    train_count = int(
        len(shuffled) * train_ratio
    )

    # Ensure both sets exist when possible.
    if len(shuffled) >= 2:

        train_count = max(
            1,
            min(
                train_count,
                len(shuffled) - 1,
            ),
        )

    train_images = sorted(
        shuffled[:train_count]
    )

    val_images = sorted(
        shuffled[train_count:]
    )

    return train_images, val_images


# ============================================================
# OVERLAP CHECK
# ============================================================

def find_overlap(
    split_a: List[str],
    split_b: List[str],
) -> List[str]:

    a = {
        normalize_path(path)
        for path in split_a
    }

    b = {
        normalize_path(path)
        for path in split_b
    }

    return sorted(a.intersection(b))


# ============================================================
# CATEGORY DATA
# ============================================================

def build_category_manifest(
    root_dir: Path = DEFAULT_ROOT,
) -> Dict:

    train = []
    validation = []
    test = []

    missing_categories = []

    for category_index, category in enumerate(CATEGORIES):

        category_root = root_dir / category

        train_good = (
            category_root
            / "train"
            / "good"
        )

        test_root = (
            category_root
            / "test"
        )

        development_images = collect_images(
            train_good
        )

        if not development_images:

            missing_categories.append(
                category
            )

            continue

        train_images, val_images = (
            split_train_validation(
                development_images,
                seed=SEED + category_index,
            )
        )

        for path in train_images:

            train.append({
                "image_path": path,
                "category": category,
                "category_index": category_index,
                "source": "train/good",
                "label": "good",
            })

        for path in val_images:

            validation.append({
                "image_path": path,
                "category": category,
                "category_index": category_index,
                "source": "train/good",
                "label": "good",
            })

        # ----------------------------------------------------
        # OFFICIAL TEST SET
        # ----------------------------------------------------

        if test_root.exists():

            for defect_folder in sorted(
                test_root.iterdir()
            ):

                if not defect_folder.is_dir():
                    continue

                defect_type = (
                    defect_folder.name
                )

                for path in collect_images(
                    defect_folder
                ):

                    test.append({
                        "image_path": path,
                        "category": category,
                        "category_index": category_index,
                        "source": (
                            f"test/{defect_type}"
                        ),
                        "defect_type": (
                            defect_type
                        ),
                    })

    return {
        "seed": SEED,
        "train_ratio": TRAIN_RATIO,
        "validation_ratio": VAL_RATIO,
        "categories": CATEGORIES,
        "train": train,
        "validation": validation,
        "test": test,
        "missing_categories": (
            missing_categories
        ),
    }


# ============================================================
# ANOMALY DATA
# ============================================================

def build_anomaly_manifest(
    root_dir: Path = DEFAULT_ROOT,
) -> Dict:

    train = []
    validation = []
    test = []

    for category_index, category in enumerate(
        CATEGORIES
    ):

        category_root = root_dir / category

        train_good = (
            category_root
            / "train"
            / "good"
        )

        test_root = (
            category_root
            / "test"
        )

        good_images = collect_images(
            train_good
        )

        train_images, val_images = (
            split_train_validation(
                good_images,
                seed=SEED + category_index,
            )
        )

        for path in train_images:

            train.append({
                "image_path": path,
                "category": category,
                "category_index": category_index,
                "label": 0,
                "label_name": "normal",
                "source": "train/good",
            })

        for path in val_images:

            validation.append({
                "image_path": path,
                "category": category,
                "category_index": category_index,
                "label": 0,
                "label_name": "normal",
                "source": "train/good",
            })

        # ----------------------------------------------------
        # OFFICIAL TEST SET
        # ----------------------------------------------------

        if test_root.exists():

            for defect_folder in sorted(
                test_root.iterdir()
            ):

                if not defect_folder.is_dir():
                    continue

                defect_type = (
                    defect_folder.name
                )

                label = (
                    0
                    if defect_type == "good"
                    else 1
                )

                for path in collect_images(
                    defect_folder
                ):

                    test.append({
                        "image_path": path,
                        "category": category,
                        "category_index": category_index,
                        "label": label,
                        "label_name": (
                            "normal"
                            if label == 0
                            else "defective"
                        ),
                        "defect_type": (
                            defect_type
                        ),
                        "source": (
                            f"test/{defect_type}"
                        ),
                    })

    return {
        "seed": SEED,
        "train_ratio": TRAIN_RATIO,
        "validation_ratio": VAL_RATIO,
        "categories": CATEGORIES,
        "train": train,
        "validation": validation,
        "test": test,
    }


# ============================================================
# LEAKAGE VALIDATION
# ============================================================

def validate_no_leakage(
    manifest: Dict,
) -> None:

    train_paths = [
        item["image_path"]
        for item in manifest.get(
            "train",
            [],
        )
    ]

    validation_paths = [
        item["image_path"]
        for item in manifest.get(
            "validation",
            [],
        )
    ]

    test_paths = [
        item["image_path"]
        for item in manifest.get(
            "test",
            [],
        )
    ]

    train_val_overlap = find_overlap(
        train_paths,
        validation_paths,
    )

    train_test_overlap = find_overlap(
        train_paths,
        test_paths,
    )

    val_test_overlap = find_overlap(
        validation_paths,
        test_paths,
    )

    errors = []

    if train_val_overlap:
        errors.append(
            "Train/validation overlap detected."
        )

    if train_test_overlap:
        errors.append(
            "Train/test overlap detected."
        )

    if val_test_overlap:
        errors.append(
            "Validation/test overlap detected."
        )

    if errors:

        raise RuntimeError(
            "\n".join(errors)
        )


# ============================================================
# SAVE MANIFEST
# ============================================================

def save_manifest(
    manifest: Dict,
    output_path: Path,
) -> None:

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with output_path.open(
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            manifest,
            file,
            indent=2,
        )


# ============================================================
# SUMMARY
# ============================================================

def print_summary(
    title: str,
    manifest: Dict,
) -> None:

    train = manifest.get(
        "train",
        [],
    )

    validation = manifest.get(
        "validation",
        [],
    )

    test = manifest.get(
        "test",
        [],
    )

    print()
    print("=" * 70)
    print(title)
    print("=" * 70)

    print(
        f"Training samples   : {len(train)}"
    )

    print(
        f"Validation samples : {len(validation)}"
    )

    print(
        f"Official test      : {len(test)}"
    )

    print(
        f"Categories         : "
        f"{len(manifest.get('categories', []))}"
    )

    print("=" * 70)


# ============================================================
# MAIN
# ============================================================

def main():

    root_dir = DEFAULT_ROOT

    print()
    print("=" * 70)
    print("VISIONINSPECT AI - DATASET SPLIT V2")
    print("=" * 70)

    print(
        f"Dataset root: {root_dir.resolve()}"
    )

    if not root_dir.exists():

        raise FileNotFoundError(
            f"Dataset not found: {root_dir}"
        )

    # --------------------------------------------------------
    # CATEGORY MANIFEST
    # --------------------------------------------------------

    category_manifest = (
        build_category_manifest(
            root_dir
        )
    )

    validate_no_leakage(
        category_manifest
    )

    category_output = (
        Path(__file__).resolve().parent
        / "evaluation"
        / "manifests"
        / "category_manifest_v2.json"
    )

    save_manifest(
        category_manifest,
        category_output,
    )

    print_summary(
        "CATEGORY DATASET",
        category_manifest,
    )

    # --------------------------------------------------------
    # ANOMALY MANIFEST
    # --------------------------------------------------------

    anomaly_manifest = (
        build_anomaly_manifest(
            root_dir
        )
    )

    validate_no_leakage(
        anomaly_manifest
    )

    anomaly_output = (
        Path(__file__).resolve().parent
        / "evaluation"
        / "manifests"
        / "anomaly_manifest_v2.json"
    )

    save_manifest(
        anomaly_manifest,
        anomaly_output,
    )

    print_summary(
        "ANOMALY DATASET",
        anomaly_manifest,
    )

    # --------------------------------------------------------
    # FINAL MESSAGE
    # --------------------------------------------------------

    print()
    print(
        "Dataset V2 manifests created successfully."
    )

    print(
        f"Category manifest: {category_output}"
    )

    print(
        f"Anomaly manifest : {anomaly_output}"
    )

    print()
    print(
        "Official MVTec test images were kept "
        "out of training and validation."
    )


if __name__ == "__main__":
    main()