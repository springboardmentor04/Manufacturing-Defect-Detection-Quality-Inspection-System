from collections import defaultdict

from app.ai.defect_dataloader import (
    MVTecDefectDataset,
    CATEGORIES
)


# ============================================================
# LOAD DATASET
# ============================================================

dataset = MVTecDefectDataset()

samples = dataset.samples


# ============================================================
# GROUP DEFECTS
# ============================================================

category_defects = defaultdict(list)

for sample in samples:

    category = sample["category"]
    defect_type = sample["defect_type"]

    if defect_type not in category_defects[category]:
        category_defects[category].append(defect_type)


# ============================================================
# PRINT SUMMARY
# ============================================================

print("=" * 70)
print("VISIONINSPECT AI - DEFECT DATASET VERIFICATION")
print("=" * 70)

print(
    f"\nTotal defective images : {len(samples)}"
)

print(
    f"Total categories       : {len(category_defects)}"
)

total_defect_types = sum(
    len(defects)
    for defects in category_defects.values()
)

print(
    f"Total defect types     : {total_defect_types}"
)


# ============================================================
# DETAILED CATEGORY INFORMATION
# ============================================================

print("\n" + "=" * 70)
print("DEFECT TYPES BY CATEGORY")
print("=" * 70)


total_images_check = 0


for category in CATEGORIES:

    category_samples = [
        sample
        for sample in samples
        if sample["category"] == category
    ]

    defects = sorted(
        set(
            sample["defect_type"]
            for sample in category_samples
        )
    )

    print("\n" + "-" * 70)

    print(
        f"{category.upper()}"
    )

    print(
        f"Images: {len(category_samples)}"
    )

    print(
        f"Defect types: {len(defects)}"
    )

    print()

    defect_counts = defaultdict(int)

    for sample in category_samples:

        defect_counts[
            sample["defect_type"]
        ] += 1

    for defect in defects:

        count = defect_counts[defect]

        print(
            f"  {defect:<30} {count:>4} images"
        )

    total_images_check += len(
        category_samples
    )


# ============================================================
# VALIDATION CHECKS
# ============================================================

print("\n" + "=" * 70)
print("VALIDATION CHECKS")
print("=" * 70)


# Check 1
print("\n[1] Image count check")

if total_images_check == len(samples):

    print(
        "PASS - All images accounted for."
    )

else:

    print(
        "FAIL - Image count mismatch."
    )

    print(
        f"Expected: {len(samples)}"
    )

    print(
        f"Found: {total_images_check}"
    )


# Check 2
print("\n[2] Category count check")

if len(category_defects) == 15:

    print(
        "PASS - All 15 categories present."
    )

else:

    print(
        "FAIL - Expected 15 categories."
    )


# Check 3
print("\n[3] Defect type count check")

if total_defect_types == 73:

    print(
        "PASS - All 73 defect types present."
    )

else:

    print(
        "FAIL - Expected 73 defect types."
    )


# Check 4
print("\n[4] Empty category check")

empty_categories = []

for category in CATEGORIES:

    if category not in category_defects:

        empty_categories.append(
            category
        )

if not empty_categories:

    print(
        "PASS - No category is empty."
    )

else:

    print(
        "FAIL - Empty categories:"
    )

    for category in empty_categories:

        print(
            f"  {category}"
        )


# Check 5
print("\n[5] Single-image defect check")

small_defects = []

for category in category_defects:

    category_samples = [
        sample
        for sample in samples
        if sample["category"] == category
    ]

    defect_counts = defaultdict(int)

    for sample in category_samples:

        defect_counts[
            sample["defect_type"]
        ] += 1

    for defect, count in defect_counts.items():

        if count < 2:

            small_defects.append(
                (
                    category,
                    defect,
                    count
                )
            )


if not small_defects:

    print(
        "PASS - Every defect type has at least 2 images."
    )

else:

    print(
        "WARNING - Defect types with fewer than 2 images:"
    )

    for category, defect, count in small_defects:

        print(
            f"  {category} -> "
            f"{defect}: {count}"
        )


# ============================================================
# FINAL STATUS
# ============================================================

print("\n" + "=" * 70)
print("VERIFICATION COMPLETE")
print("=" * 70)

if (
    total_images_check == len(samples)
    and len(category_defects) == 15
    and total_defect_types == 73
    and not empty_categories
    and not small_defects
):

    print(
        "\nDATASET READY FOR DEFECT TRAINING"
    )

else:

    print(
        "\nDATASET REQUIRES ATTENTION BEFORE TRAINING"
    )