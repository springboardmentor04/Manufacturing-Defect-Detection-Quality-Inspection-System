# ============================================================
# VISIONINSPECT AI
# STRICT BINARY DATASET AUDIT V2
# ============================================================
#
# Purpose:
#   Verify EXACTLY which images are used for binary training.
#
# Classes:
#   0 = Normal
#   1 = Defective
#
# Dataset construction:
#
#   NORMAL:
#       category/train/good
#
#   DEFECTIVE:
#       category/test/<defect_type>
#
# This script DOES NOT train any model.
# ============================================================

import os
from pathlib import Path
from collections import Counter, defaultdict

from PIL import Image


# ============================================================
# PATH
# ============================================================

AI_DIR = Path(__file__).resolve().parent

BACKEND_DIR = AI_DIR.parent.parent

DATASET_ROOT = (
    BACKEND_DIR
    / "dataset"
    / "mvtec_ad"
)


# ============================================================
# CATEGORIES
# ============================================================

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
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".webp",
}


# ============================================================
# HELPERS
# ============================================================

def is_image(path: Path) -> bool:
    return (
        path.is_file()
        and path.suffix.lower()
        in IMAGE_EXTENSIONS
    )


def direct_images(folder: Path):
    """
    Images directly inside a folder.
    """

    if not folder.exists():
        return []

    return sorted(
        [
            path
            for path in folder.iterdir()
            if is_image(path)
        ]
    )


def recursive_images(folder: Path):
    """
    ALL images below a folder recursively.
    Used only for reconciliation/debugging.
    """

    if not folder.exists():
        return []

    return sorted(
        [
            path
            for path in folder.rglob("*")
            if is_image(path)
        ]
    )


def image_information(path: Path):

    try:

        with Image.open(path) as image:

            image.verify()

        with Image.open(path) as image:

            return {
                "width": image.width,
                "height": image.height,
                "mode": image.mode,
                "format": image.format,
            }

    except Exception as error:

        return {
            "error": str(error)
        }


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 100)
    print("VISIONINSPECT AI - STRICT BINARY DATASET AUDIT V2")
    print("=" * 100)

    print()
    print(f"Dataset root:")
    print(DATASET_ROOT)

    print()
    print("BINARY DATASET RULE")
    print("-" * 100)
    print("NORMAL    = category/train/good")
    print("DEFECTIVE = category/test/<defect_type>")
    print("-" * 100)

    if not DATASET_ROOT.exists():

        raise FileNotFoundError(
            f"Dataset not found:\n{DATASET_ROOT}"
        )

    # ========================================================
    # GLOBAL
    # ========================================================

    total_normal = 0
    total_defective = 0

    total_images = 0
    total_invalid = 0

    all_dimensions = Counter()

    category_counts = {}

    defect_counts = defaultdict(Counter)

    invalid_files = []

    duplicate_paths = []

    unexpected_categories = []

    # ========================================================
    # CATEGORY LOOP
    # ========================================================

    for category in CATEGORIES:

        category_path = (
            DATASET_ROOT / category
        )

        print()
        print("=" * 100)
        print(f"CATEGORY: {category.upper()}")
        print("=" * 100)

        if not category_path.exists():

            print(
                f"❌ CATEGORY DIRECTORY MISSING: "
                f"{category_path}"
            )

            continue

        # ----------------------------------------------------
        # NORMAL
        # ----------------------------------------------------

        train_path = (
            category_path
            / "train"
        )

        good_path = (
            train_path
            / "good"
        )

        normal_files = direct_images(
            good_path
        )

        # Check for nested normal images.
        normal_recursive = recursive_images(
            good_path
        )

        if len(normal_files) != len(normal_recursive):

            print()
            print(
                "⚠️ NORMAL NESTED-DIRECTORY WARNING"
            )

            print(
                f"Direct images    : "
                f"{len(normal_files)}"
            )

            print(
                f"Recursive images : "
                f"{len(normal_recursive)}"
            )

        # ----------------------------------------------------
        # DEFECTIVE
        # ----------------------------------------------------

        test_path = (
            category_path
            / "test"
        )

        defective_files = []

        category_defect_counts = Counter()

        if not test_path.exists():

            print(
                f"⚠️ TEST DIRECTORY MISSING:"
                f" {test_path}"
            )

        else:

            test_entries = sorted(
                test_path.iterdir()
            )

            for defect_dir in test_entries:

                if not defect_dir.is_dir():
                    continue

                defect_name = (
                    defect_dir.name
                )

                # NEVER classify test/good as defective.
                if defect_name == "good":
                    continue

                files = direct_images(
                    defect_dir
                )

                recursive = recursive_images(
                    defect_dir
                )

                # --------------------------------------------
                # Nested defect directory detection
                # --------------------------------------------

                if len(files) != len(recursive):

                    print()
                    print(
                        f"⚠️ NESTED IMAGE WARNING: "
                        f"{category}/test/{defect_name}"
                    )

                    print(
                        f"Direct    : {len(files)}"
                    )

                    print(
                        f"Recursive : {len(recursive)}"
                    )

                category_defect_counts[
                    defect_name
                ] = len(files)

                defective_files.extend(
                    files
                )

        # ----------------------------------------------------
        # COUNTS
        # ----------------------------------------------------

        normal_count = len(
            normal_files
        )

        defective_count = len(
            defective_files
        )

        category_total = (
            normal_count
            +
            defective_count
        )

        total_normal += (
            normal_count
        )

        total_defective += (
            defective_count
        )

        total_images += (
            category_total
        )

        category_counts[
            category
        ] = {
            "normal": normal_count,
            "defective": defective_count,
            "total": category_total,
        }

        defect_counts[
            category
        ] = category_defect_counts

        # ----------------------------------------------------
        # PRINT
        # ----------------------------------------------------

        print()
        print(
            f"Normal    : "
            f"{normal_count}"
        )

        print(
            f"Defective : "
            f"{defective_count}"
        )

        print(
            f"Total     : "
            f"{category_total}"
        )

        print()

        if category_defect_counts:

            print(
                "Defect types:"
            )

            for (
                defect,
                count
            ) in sorted(
                category_defect_counts.items()
            ):

                print(
                    f"  "
                    f"{defect:<30}"
                    f"{count:>6}"
                )

        # ----------------------------------------------------
        # VALIDATE IMAGES
        # ----------------------------------------------------

        category_files = (
            normal_files
            +
            defective_files
        )

        for image_path in category_files:

            info = image_information(
                image_path
            )

            if "error" in info:

                total_invalid += 1

                invalid_files.append(
                    (
                        str(image_path),
                        info["error"]
                    )
                )

                continue

            dimensions = (
                info["width"],
                info["height"]
            )

            all_dimensions[
                dimensions
            ] += 1


    # ========================================================
    # GLOBAL SUMMARY
    # ========================================================

    print()
    print("=" * 100)
    print("GLOBAL DATASET SUMMARY")
    print("=" * 100)

    print(
        f"Total images     : "
        f"{total_images}"
    )

    print(
        f"Normal images    : "
        f"{total_normal}"
    )

    print(
        f"Defective images : "
        f"{total_defective}"
    )

    print(
        f"Invalid images   : "
        f"{total_invalid}"
    )

    if total_images > 0:

        normal_percentage = (
            total_normal
            / total_images
            * 100
        )

        defective_percentage = (
            total_defective
            / total_images
            * 100
        )

        print()

        print(
            f"Normal percentage    : "
            f"{normal_percentage:.2f}%"
        )

        print(
            f"Defective percentage : "
            f"{defective_percentage:.2f}%"
        )

    # ========================================================
    # CLASS BALANCE
    # ========================================================

    print()
    print("=" * 100)
    print("CLASS BALANCE")
    print("=" * 100)

    if total_defective > 0:

        ratio = (
            total_normal
            / total_defective
        )

        print(
            f"Normal : Defective = "
            f"{ratio:.2f} : 1"
        )

    # ========================================================
    # CATEGORY TABLE
    # ========================================================

    print()
    print("=" * 100)
    print("CATEGORY DISTRIBUTION")
    print("=" * 100)

    print(
        f"{'Category':<18}"
        f"{'Normal':>10}"
        f"{'Defect':>10}"
        f"{'Total':>10}"
    )

    print("-" * 50)

    category_normal_total = 0
    category_defect_total = 0

    for category in CATEGORIES:

        if category not in category_counts:
            continue

        data = category_counts[
            category
        ]

        category_normal_total += (
            data["normal"]
        )

        category_defect_total += (
            data["defective"]
        )

        print(
            f"{category:<18}"
            f"{data['normal']:>10}"
            f"{data['defective']:>10}"
            f"{data['total']:>10}"
        )

    print("-" * 50)

    print(
        f"{'CALCULATED TOTAL':<18}"
        f"{category_normal_total:>10}"
        f"{category_defect_total:>10}"
        f"{category_normal_total + category_defect_total:>10}"
    )

    # ========================================================
    # DEFECT TYPE DISTRIBUTION
    # ========================================================

    print()
    print("=" * 100)
    print("DEFECT TYPE DISTRIBUTION")
    print("=" * 100)

    global_defect_counts = Counter()

    for category in CATEGORIES:

        for (
            defect,
            count
        ) in defect_counts[
            category
        ].items():

            global_defect_counts[
                defect
            ] += count

    for (
        defect,
        count
    ) in global_defect_counts.most_common():

        print(
            f"{defect:<35}"
            f"{count:>8}"
        )

    # ========================================================
    # BOTTLE DEEP AUDIT
    # ========================================================

    bottle_path = (
        DATASET_ROOT
        / "bottle"
    )

    print()
    print("=" * 100)
    print("BOTTLE DEEP RECONCILIATION")
    print("=" * 100)

    bottle_good = (
        bottle_path
        / "train"
        / "good"
    )

    bottle_test = (
        bottle_path
        / "test"
    )

    bottle_normal_direct = (
        direct_images(
            bottle_good
        )
    )

    bottle_normal_recursive = (
        recursive_images(
            bottle_good
        )
    )

    print()
    print(
        "BOTTLE NORMAL"
    )

    print(
        f"Direct images    : "
        f"{len(bottle_normal_direct)}"
    )

    print(
        f"Recursive images : "
        f"{len(bottle_normal_recursive)}"
    )

    bottle_defective_direct = []

    if bottle_test.exists():

        for defect_dir in sorted(
            bottle_test.iterdir()
        ):

            if (
                defect_dir.is_dir()
                and defect_dir.name != "good"
            ):

                direct = direct_images(
                    defect_dir
                )

                recursive = recursive_images(
                    defect_dir
                )

                print()
                print(
                    f"DEFECT: "
                    f"{defect_dir.name}"
                )

                print(
                    f"Direct images    : "
                    f"{len(direct)}"
                )

                print(
                    f"Recursive images : "
                    f"{len(recursive)}"
                )

                if (
                    len(direct)
                    !=
                    len(recursive)
                ):

                    print(
                        "⚠️ Nested files "
                        "detected!"
                    )

                bottle_defective_direct.extend(
                    direct
                )

    print()
    print(
        "BOTTLE TOTALS"
    )

    print(
        f"Normal    : "
        f"{len(bottle_normal_direct)}"
    )

    print(
        f"Defective : "
        f"{len(bottle_defective_direct)}"
    )

    print(
        f"TOTAL     : "
        f"{len(bottle_normal_direct) + len(bottle_defective_direct)}"
    )

    # ========================================================
    # DUPLICATE BASENAME CHECK
    # ========================================================

    print()
    print("=" * 100)
    print("DUPLICATE FILENAME CHECK")
    print("=" * 100)

    filename_map = defaultdict(list)

    for category in CATEGORIES:

        category_path = (
            DATASET_ROOT / category
        )

        if not category_path.exists():
            continue

        for image_path in recursive_images(
            category_path
        ):

            filename_map[
                image_path.name.lower()
            ].append(
                str(image_path)
            )

    duplicate_groups = {
        name: paths
        for name, paths
        in filename_map.items()
        if len(paths) > 1
    }

    print(
        f"Duplicate filenames across "
        f"dataset: {len(duplicate_groups)}"
    )

    if duplicate_groups:

        print()
        print(
            "NOTE:"
        )

        print(
            "Duplicate filenames are NOT "
            "necessarily duplicate images."
        )

        print(
            "MVTec commonly reuses names such "
            "as 000.png in different folders."
        )

    # ========================================================
    # IMAGE DIMENSIONS
    # ========================================================

    print()
    print("=" * 100)
    print("IMAGE DIMENSIONS")
    print("=" * 100)

    for (
        dimensions,
        count
    ) in all_dimensions.most_common():

        print(
            f"{dimensions[0]:4d} x "
            f"{dimensions[1]:4d}"
            f"  ->  {count}"
        )

    # ========================================================
    # INVALID FILES
    # ========================================================

    print()
    print("=" * 100)
    print("IMAGE VALIDITY")
    print("=" * 100)

    if invalid_files:

        print(
            f"❌ Invalid images: "
            f"{len(invalid_files)}"
        )

        for (
            path,
            error
        ) in invalid_files[:50]:

            print()
            print(
                f"INVALID: {path}"
            )

            print(
                f"ERROR  : {error}"
            )

    else:

        print(
            "✓ All discovered images "
            "are readable."
        )

    # ========================================================
    # FINAL RECONCILIATION
    # ========================================================

    print()
    print("=" * 100)
    print("FINAL RECONCILIATION")
    print("=" * 100)

    print(
        f"Category totals normal    : "
        f"{category_normal_total}"
    )

    print(
        f"Category totals defective : "
        f"{category_defect_total}"
    )

    print(
        f"Category totals combined  : "
        f"{category_normal_total + category_defect_total}"
    )

    print()

    if (
        category_normal_total
        == total_normal
        and
        category_defect_total
        == total_defective
        and
        (
            category_normal_total
            +
            category_defect_total
        )
        == total_images
    ):

        print(
            "✓ GLOBAL COUNTERS MATCH "
            "CATEGORY COUNTERS"
        )

    else:

        print(
            "❌ COUNTER MISMATCH DETECTED"
        )

    # ========================================================
    # BOTTLE RECONCILIATION
    # ========================================================

    print()

    bottle_expected = (
        len(bottle_normal_direct)
        +
        len(bottle_defective_direct)
    )

    bottle_recorded = (
        category_counts
        .get(
            "bottle",
            {}
        )
        .get(
            "total",
            0
        )
    )

    print(
        f"Bottle deep-audit total : "
        f"{bottle_expected}"
    )

    print(
        f"Bottle category total   : "
        f"{bottle_recorded}"
    )

    if (
        bottle_expected
        ==
        bottle_recorded
    ):

        print(
            "✓ BOTTLE COUNT RECONCILES"
        )

    else:

        print(
            "❌ BOTTLE COUNT DOES NOT "
            "RECONCILE"
        )

    # ========================================================
    # DATASET DESIGN
    # ========================================================

    print()
    print("=" * 100)
    print("DATASET DESIGN")
    print("=" * 100)

    print(
        "Normal:"
    )

    print(
        "  category/train/good"
    )

    print()

    print(
        "Defective:"
    )

    print(
        "  category/test/<defect>"
    )

    print()

    print(
        "No pretrained model is involved."
    )

    print(
        "No model is trained by this script."
    )

    # ========================================================
    # FINAL
    # ========================================================

    print()
    print("=" * 100)
    print("AUDIT COMPLETE")
    print("=" * 100)

    print(
        "No model was trained."
    )

    print(
        "No checkpoint was changed."
    )

    print("=" * 100)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()