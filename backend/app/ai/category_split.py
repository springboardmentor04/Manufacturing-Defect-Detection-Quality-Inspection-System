import random
from collections import Counter

from app.ai.category_dataloader import (
    MVTecCategoryDataset,
    CATEGORIES,
)


SEED = 42
VAL_RATIO = 0.20


def create_stratified_category_split(dataset):
    """
    Create an 80/20 split while preserving:
        Product Category + Defect Type

    This prevents very small defect classes from being
    accidentally underrepresented in validation.
    """

    random.seed(SEED)

    grouped_samples = {}

    # Group by category + defect type
    for sample in dataset.samples:

        key = (
            sample["category"],
            sample["defect_type"]
        )

        if key not in grouped_samples:
            grouped_samples[key] = []

        grouped_samples[key].append(sample)

    train_samples = []
    val_samples = []

    # Split every category/defect group
    for key in sorted(grouped_samples.keys()):

        samples = grouped_samples[key]

        random.shuffle(samples)

        total = len(samples)

        # For very small classes, keep at least one
        # image in training and one in validation when possible.
        if total >= 2:
            val_count = max(
                1,
                round(total * VAL_RATIO)
            )

            train_count = total - val_count

            # Ensure training always has at least one image
            if train_count < 1:
                train_count = 1
                val_count = total - 1

        else:
            # A class with only one image cannot exist
            # in both sets.
            train_count = 1
            val_count = 0

        train_samples.extend(
            samples[:train_count]
        )

        if val_count > 0:
            val_samples.extend(
                samples[train_count:]
            )

    return train_samples, val_samples


def count_categories(samples):

    return Counter(
        sample["category"]
        for sample in samples
    )


def count_defects(samples):

    return Counter(
        (
            sample["category"],
            sample["defect_type"]
        )
        for sample in samples
    )


def print_category_distribution(
    name,
    samples
):

    counts = count_categories(samples)

    print(f"\n{name}")
    print("=" * 70)

    print(f"Total images: {len(samples)}")

    print("\nCategory distribution")
    print("-" * 50)

    for category in CATEGORIES:

        print(
            f"{category:<15}"
            f"{counts[category]:>5}"
        )


def print_defect_distribution(
    name,
    samples
):

    counts = count_defects(samples)

    print(f"\n{name} - Defect Distribution")
    print("-" * 70)

    current_category = None

    for (category, defect), count in sorted(
        counts.items()
    ):

        if defect == "good":
            continue

        if category != current_category:

            print(f"\n[{category}]")
            current_category = category

        print(
            f"  {defect:<30}"
            f"{count:>4}"
        )


def print_normal_defective_distribution(
    name,
    samples
):

    normal = sum(
        1
        for sample in samples
        if sample["defect_type"] == "good"
    )

    defective = len(samples) - normal

    print(f"\n{name} - Normal / Defective")
    print("-" * 50)

    print(f"Normal    : {normal}")
    print(f"Defective : {defective}")


def verify_split(
    train_samples,
    val_samples,
    total_samples
):

    print("\n" + "=" * 70)
    print("SPLIT VERIFICATION")
    print("=" * 70)

    print(
        f"Training images   : {len(train_samples)}"
    )

    print(
        f"Validation images : {len(val_samples)}"
    )

    print(
        f"Total images      : "
        f"{len(train_samples) + len(val_samples)}"
    )

    print(
        f"Original dataset  : {total_samples}"
    )

    if (
        len(train_samples) +
        len(val_samples)
        == total_samples
    ):
        print("\n✓ No images lost.")
    else:
        print("\n✗ ERROR: Image count mismatch.")

    train_categories = set(
        sample["category"]
        for sample in train_samples
    )

    val_categories = set(
        sample["category"]
        for sample in val_samples
    )

    missing_train = set(CATEGORIES) - train_categories
    missing_val = set(CATEGORIES) - val_categories

    print(
        f"\nTraining categories : "
        f"{len(train_categories)}/15"
    )

    print(
        f"Validation categories : "
        f"{len(val_categories)}/15"
    )

    if not missing_train:
        print("✓ All categories present in training.")

    if not missing_val:
        print("✓ All categories present in validation.")

    # Check defect classes
    train_defects = set(
        (
            sample["category"],
            sample["defect_type"]
        )
        for sample in train_samples
    )

    val_defects = set(
        (
            sample["category"],
            sample["defect_type"]
        )
        for sample in val_samples
    )

    missing_val_defects = (
        train_defects - val_defects
    )

    # Ignore "good" because it is the normal class
    missing_val_defects = {
        item
        for item in missing_val_defects
        if item[1] != "good"
    }

    print(
        f"\nDefect types missing from validation: "
        f"{len(missing_val_defects)}"
    )

    if missing_val_defects:

        print("\nSmall classes without validation samples:")

        for category, defect in sorted(
            missing_val_defects
        ):
            print(
                f"  {category} -> {defect}"
            )

    else:
        print(
            "✓ Every defect type has validation samples."
        )


if __name__ == "__main__":

    print("\n" + "=" * 70)
    print("VISIONINSPECT AI")
    print("STRATIFIED CATEGORY + DEFECT DATASET SPLIT")
    print("=" * 70)

    dataset = MVTecCategoryDataset()

    train_samples, val_samples = (
        create_stratified_category_split(
            dataset
        )
    )

    print_category_distribution(
        "TRAINING SET",
        train_samples
    )

    print_normal_defective_distribution(
        "TRAINING SET",
        train_samples
    )

    print_defect_distribution(
        "TRAINING SET",
        train_samples
    )

    print_category_distribution(
        "VALIDATION SET",
        val_samples
    )

    print_normal_defective_distribution(
        "VALIDATION SET",
        val_samples
    )

    print_defect_distribution(
        "VALIDATION SET",
        val_samples
    )

    verify_split(
        train_samples,
        val_samples,
        len(dataset)
    )

    print("\n" + "=" * 70)
    print("STRATIFIED SPLIT COMPLETE")
    print("=" * 70)