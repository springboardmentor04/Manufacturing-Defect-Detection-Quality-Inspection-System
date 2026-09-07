import os
import random

from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader

from app.ai.dataset import MVTecDataset


# ==========================================================
# SETTINGS
# ==========================================================

SEED = 42

random.seed(SEED)


# ==========================================================
# MVTec AD CATEGORIES
# ==========================================================

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
    "zipper"
]


# ==========================================================
# DATA LOADERS
# ==========================================================

def get_dataloaders(
    root_dir="dataset/mvtec_ad",
    batch_size=64
):

    train_images = []
    train_labels = []

    val_images = []
    val_labels = []


    # ======================================================
    # PROCESS EACH CATEGORY
    # ======================================================

    for category in CATEGORIES:

        category_path = os.path.join(
            root_dir,
            category
        )

        if not os.path.exists(category_path):

            print(
                f"Warning: category not found - {category}"
            )

            continue


        category_images = []
        category_labels = []


        # ==================================================
        # NORMAL IMAGES
        # ==================================================

        good_folder = os.path.join(
            category_path,
            "train",
            "good"
        )


        if os.path.exists(good_folder):

            for filename in sorted(
                os.listdir(good_folder)
            ):

                filepath = os.path.join(
                    good_folder,
                    filename
                )

                if os.path.isfile(filepath):

                    category_images.append(
                        filepath
                    )

                    category_labels.append(0)


        # ==================================================
        # DEFECTIVE IMAGES
        # ==================================================

        test_folder = os.path.join(
            category_path,
            "test"
        )


        if os.path.exists(test_folder):

            for defect_type in sorted(
                os.listdir(test_folder)
            ):

                if defect_type == "good":
                    continue


                defect_folder = os.path.join(
                    test_folder,
                    defect_type
                )


                if not os.path.isdir(
                    defect_folder
                ):
                    continue


                for filename in sorted(
                    os.listdir(defect_folder)
                ):

                    filepath = os.path.join(
                        defect_folder,
                        filename
                    )

                    if os.path.isfile(filepath):

                        category_images.append(
                            filepath
                        )

                        category_labels.append(1)


        if len(category_images) == 0:
            continue


        # ==================================================
        # CATEGORY-AWARE 80/20 SPLIT
        # ==================================================

        (
            category_train_images,
            category_val_images,
            category_train_labels,
            category_val_labels
        ) = train_test_split(

            category_images,
            category_labels,

            test_size=0.20,

            random_state=SEED,

            stratify=category_labels
            if len(set(category_labels)) == 2
            else None
        )


        train_images.extend(
            category_train_images
        )

        train_labels.extend(
            category_train_labels
        )

        val_images.extend(
            category_val_images
        )

        val_labels.extend(
            category_val_labels
        )


    # ======================================================
    # SAFETY CHECKS
    # ======================================================

    if len(train_images) == 0:

        raise RuntimeError(
            "No training images found. "
            "Check the MVTec dataset path."
        )


    if len(set(train_labels)) < 2:

        raise RuntimeError(
            "Training set must contain "
            "both Normal and Defective classes."
        )


    if len(set(val_labels)) < 2:

        raise RuntimeError(
            "Validation set must contain "
            "both Normal and Defective classes."
        )


    # ======================================================
    # DATASETS
    # ======================================================

    train_dataset = MVTecDataset(
        root_dir=root_dir,
        image_paths=train_images,
        labels=train_labels,
        train=True
    )


    val_dataset = MVTecDataset(
        root_dir=root_dir,
        image_paths=val_images,
        labels=val_labels,
        train=False
    )


    # ======================================================
    # COUNTS
    # ======================================================

    normal_count = train_labels.count(0)
    defect_count = train_labels.count(1)


    # ======================================================
    # INFORMATION
    # ======================================================

    print("\n" + "=" * 50)

    print(
        "VisionInspect AI - Final Category-Aware Dataset"
    )

    print("=" * 50)

    print(
        f"Training Images  : {len(train_images)}"
    )

    print(
        f"Validation Images: {len(val_images)}"
    )

    print(
        f"Training Normal  : {normal_count}"
    )

    print(
        f"Training Defect  : {defect_count}"
    )

    print(
        f"Validation Normal: {val_labels.count(0)}"
    )

    print(
        f"Validation Defect: {val_labels.count(1)}"
    )

    print("=" * 50)


    # ======================================================
    # TRAIN LOADER
    # ======================================================

    train_loader = DataLoader(

        train_dataset,

        batch_size=batch_size,

        shuffle=True,

        num_workers=0,

        pin_memory=False
    )


    # ======================================================
    # VALIDATION LOADER
    # ======================================================

    val_loader = DataLoader(

        val_dataset,

        batch_size=batch_size,

        shuffle=False,

        num_workers=0,

        pin_memory=False
    )


    return (
        train_loader,
        val_loader,
        normal_count,
        defect_count
    )