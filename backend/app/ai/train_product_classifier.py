from pathlib import Path
from collections import Counter
import copy
import random

import numpy as np
from PIL import Image, ImageFile

import torch
import torch.nn as nn

from torch.utils.data import (
    Dataset,
    DataLoader,
    WeightedRandomSampler,
)

from torchvision import (
    models,
    transforms,
)

from sklearn.model_selection import train_test_split

from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
)


# ============================================================
# VISIONINSPECT AI
# AUTOMATIC PRODUCT CATEGORY CLASSIFIER
# ============================================================

ImageFile.LOAD_TRUNCATED_IMAGES = True


# ============================================================
# CONFIGURATION
# ============================================================

SEED = 42

IMAGE_SIZE = 224

BATCH_SIZE = 16

VALIDATION_RATIO = 0.20

PATIENCE = 6


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
# PATHS
# ============================================================

AI_DIR = Path(
    __file__
).resolve().parent


BACKEND_DIR = (
    AI_DIR
    .parent
    .parent
)


DATASET_ROOT = (
    BACKEND_DIR
    / "dataset"
    / "mvtec_ad"
)


MODEL_DIR = (
    AI_DIR
    / "saved_models"
)


MODEL_PATH = (
    MODEL_DIR
    / "product_category_resnet18.pth"
)


# ============================================================
# IMAGE SETTINGS
# ============================================================

VALID_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".webp",
    ".tif",
    ".tiff",
}


IMAGENET_MEAN = [
    0.485,
    0.456,
    0.406,
]


IMAGENET_STD = [
    0.229,
    0.224,
    0.225,
]


# ============================================================
# REPRODUCIBILITY
# ============================================================

def seed_everything():

    random.seed(
        SEED
    )

    np.random.seed(
        SEED
    )

    torch.manual_seed(
        SEED
    )

    if torch.cuda.is_available():

        torch.cuda.manual_seed_all(
            SEED
        )


# ============================================================
# VALID IMAGE
# ============================================================

def is_valid_image(
    path
):

    return (
        path.is_file()
        and
        path.suffix.lower()
        in VALID_EXTENSIONS
        and
        "_mask"
        not in path.name.lower()
    )


# ============================================================
# COLLECT DATA
# ============================================================

def collect_dataset():

    samples = []


    for category in CATEGORIES:

        category_root = (
            DATASET_ROOT
            / category
        )


        if not category_root.exists():

            raise FileNotFoundError(
                f"Dataset folder not found:\n"
                f"{category_root}"
            )


        # ----------------------------------------------------
        # TRAIN GOOD IMAGES
        # ----------------------------------------------------

        good_folder = (
            category_root
            / "train"
            / "good"
        )


        if good_folder.exists():

            for image_path in (
                good_folder.rglob("*")
            ):

                if is_valid_image(
                    image_path
                ):

                    samples.append(
                        (
                            image_path,
                            category,
                        )
                    )


        # ----------------------------------------------------
        # TEST GOOD + DEFECT IMAGES
        # ----------------------------------------------------
        #
        # All are useful here because this model only learns:
        #
        # Bottle vs Cable vs Wood vs Pill ...
        #
        # It is NOT learning defect labels.
        # ----------------------------------------------------

        test_folder = (
            category_root
            / "test"
        )


        if test_folder.exists():

            for image_path in (
                test_folder.rglob("*")
            ):

                if is_valid_image(
                    image_path
                ):

                    samples.append(
                        (
                            image_path,
                            category,
                        )
                    )


    if not samples:

        raise RuntimeError(
            f"No images found inside:\n"
            f"{DATASET_ROOT}"
        )


    return samples


# ============================================================
# DATASET
# ============================================================

class ProductDataset(
    Dataset
):

    def __init__(
        self,
        samples,
        class_to_index,
        transform,
    ):

        self.samples = samples

        self.class_to_index = (
            class_to_index
        )

        self.transform = (
            transform
        )


    def __len__(
        self
    ):

        return len(
            self.samples
        )


    def __getitem__(
        self,
        index
    ):

        image_path, category = (
            self.samples[index]
        )


        with Image.open(
            image_path
        ) as image:

            image = image.convert(
                "RGB"
            )

            image = self.transform(
                image
            )


        label = (
            self.class_to_index[
                category
            ]
        )


        return (
            image,
            label,
        )


# ============================================================
# TRANSFORMS
# ============================================================

train_transform = (
    transforms.Compose(
        [

            transforms.Resize(
                (
                    256,
                    256,
                )
            ),

            transforms.RandomResizedCrop(
                IMAGE_SIZE,
                scale=(
                    0.80,
                    1.00,
                ),
                ratio=(
                    0.90,
                    1.10,
                ),
            ),

            transforms.RandomHorizontalFlip(
                p=0.5
            ),

            transforms.RandomRotation(
                degrees=8
            ),

            transforms.ColorJitter(
                brightness=0.15,
                contrast=0.15,
                saturation=0.10,
            ),

            transforms.ToTensor(),

            transforms.Normalize(
                mean=
                    IMAGENET_MEAN,

                std=
                    IMAGENET_STD,
            ),
        ]
    )
)


validation_transform = (
    transforms.Compose(
        [

            transforms.Resize(
                (
                    IMAGE_SIZE,
                    IMAGE_SIZE,
                )
            ),

            transforms.ToTensor(),

            transforms.Normalize(
                mean=
                    IMAGENET_MEAN,

                std=
                    IMAGENET_STD,
            ),
        ]
    )
)


# ============================================================
# MODEL
# ============================================================

def build_model():

    model = (
        models.resnet18(
            weights=
                models
                .ResNet18_Weights
                .IMAGENET1K_V1
        )
    )


    model.fc = (
        nn.Sequential(

            nn.Dropout(
                0.25
            ),

            nn.Linear(
                model.fc.in_features,
                len(
                    CATEGORIES
                ),
            ),
        )
    )


    return model


# ============================================================
# TRAINABLE LAYERS
# ============================================================

def freeze_all(
    model
):

    for parameter in (
        model.parameters()
    ):

        parameter.requires_grad = (
            False
        )


def enable_fc(
    model
):

    for parameter in (
        model.fc.parameters()
    ):

        parameter.requires_grad = (
            True
        )


def enable_layer4(
    model
):

    for parameter in (
        model.layer4.parameters()
    ):

        parameter.requires_grad = (
            True
        )


def enable_layer3(
    model
):

    for parameter in (
        model.layer3.parameters()
    ):

        parameter.requires_grad = (
            True
        )


# ============================================================
# VALIDATION
# ============================================================

@torch.no_grad()
def evaluate(
    model,
    loader,
    device,
):

    model.eval()


    true_labels = []

    predictions = []


    for images, labels in loader:

        images = images.to(
            device
        )


        logits = model(
            images
        )


        predicted = (
            logits.argmax(
                dim=1
            )
            .cpu()
        )


        true_labels.extend(
            labels.tolist()
        )


        predictions.extend(
            predicted.tolist()
        )


    accuracy = (
        accuracy_score(
            true_labels,
            predictions,
        )
    )


    (
        precision,
        recall,
        f1,
        _
    ) = (
        precision_recall_fscore_support(
            true_labels,
            predictions,
            average="macro",
            zero_division=0,
        )
    )


    return {

        "accuracy":
            float(
                accuracy
            ),

        "precision":
            float(
                precision
            ),

        "recall":
            float(
                recall
            ),

        "f1":
            float(
                f1
            ),
    }


# ============================================================
# TRAIN STAGE
# ============================================================

def train_stage(
    model,
    train_loader,
    validation_loader,
    device,
    optimizer,
    epochs,
    stage_name,
    best_state,
    best_f1,
    epoch_number,
):

    criterion = (
        nn.CrossEntropyLoss(
            label_smoothing=
                0.03
        )
    )


    stale_epochs = 0


    print()

    print(
        "=" * 90
    )

    print(
        stage_name
    )

    print(
        "=" * 90
    )


    for _ in range(
        epochs
    ):

        epoch_number += 1


        model.train()


        for images, labels in (
            train_loader
        ):

            images = images.to(
                device
            )

            labels = labels.to(
                device
            )


            optimizer.zero_grad(
                set_to_none=True
            )


            logits = model(
                images
            )


            loss = criterion(
                logits,
                labels
            )


            loss.backward()


            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                1.0,
            )


            optimizer.step()


        metrics = evaluate(
            model,
            validation_loader,
            device,
        )


        print(

            f"Epoch "
            f"{epoch_number:02d}"

            f" | Accuracy "
            f"{metrics['accuracy'] * 100:.2f}%"

            f" | Precision "
            f"{metrics['precision'] * 100:.2f}%"

            f" | Recall "
            f"{metrics['recall'] * 100:.2f}%"

            f" | F1 "
            f"{metrics['f1'] * 100:.2f}%"
        )


        if (
            metrics["f1"]
            >
            best_f1
        ):

            best_f1 = (
                metrics["f1"]
            )


            best_state = (
                copy.deepcopy(
                    model.state_dict()
                )
            )


            stale_epochs = 0


            print(
                "✓ New best model"
            )


        else:

            stale_epochs += 1


        if (
            stale_epochs
            >=
            PATIENCE
        ):

            print(
                "Early stopping."
            )

            break


    return (
        best_state,
        best_f1,
        epoch_number,
    )


# ============================================================
# MAIN
# ============================================================

def main():

    seed_everything()


    device = (
        torch.device(

            "cuda"
            if
            torch.cuda.is_available()

            else

            "cpu"
        )
    )


    print()

    print(
        "=" * 90
    )

    print(
        "VISIONINSPECT AI"
    )

    print(
        "AUTOMATIC PRODUCT CATEGORY CLASSIFIER"
    )

    print(
        "=" * 90
    )


    print(
        f"Device       : "
        f"{device}"
    )

    print(
        f"Dataset      : "
        f"{DATASET_ROOT}"
    )

    print(
        "Architecture : ResNet18"
    )

    print(
        "Backbone     : ImageNet pretrained"
    )

    print(
        "Training     : Fine-tuning"
    )

    print(
        f"Classes      : "
        f"{len(CATEGORIES)}"
    )


    samples = (
        collect_dataset()
    )


    counts = Counter(
        category
        for _, category
        in samples
    )


    print()

    print(
        "DATASET DISTRIBUTION"
    )

    print(
        "-" * 60
    )


    for category in (
        CATEGORIES
    ):

        print(

            f"{category:<20}"
            f": "
            f"{counts[category]}"
        )


    print(
        "-" * 60
    )

    print(

        f"{'TOTAL':<20}"
        f": "
        f"{len(samples)}"
    )


    class_to_index = {

        category:
            index

        for index, category
        in enumerate(
            CATEGORIES
        )
    }


    labels = [

        category

        for _, category
        in samples
    ]


    (
        training_samples,
        validation_samples,
    ) = (
        train_test_split(

            samples,

            test_size=
                VALIDATION_RATIO,

            random_state=
                SEED,

            stratify=
                labels,
        )
    )


    training_counts = (
        Counter(

            category

            for _, category
            in training_samples
        )
    )


    category_weights = {

        category:

            len(
                training_samples
            )
            /
            training_counts[
                category
            ]

        for category in (
            CATEGORIES
        )
    }


    sample_weights = (
        torch.DoubleTensor(

            [

                category_weights[
                    category
                ]

                for _, category
                in training_samples
            ]
        )
    )


    sampler = (
        WeightedRandomSampler(

            weights=
                sample_weights,

            num_samples=
                len(
                    sample_weights
                ),

            replacement=
                True,
        )
    )


    training_dataset = (
        ProductDataset(

            training_samples,

            class_to_index,

            train_transform,
        )
    )


    validation_dataset = (
        ProductDataset(

            validation_samples,

            class_to_index,

            validation_transform,
        )
    )


    training_loader = (
        DataLoader(

            training_dataset,

            batch_size=
                BATCH_SIZE,

            sampler=
                sampler,

            num_workers=
                0,
        )
    )


    validation_loader = (
        DataLoader(

            validation_dataset,

            batch_size=
                BATCH_SIZE,

            shuffle=
                False,

            num_workers=
                0,
        )
    )


    model = (
        build_model()
        .to(
            device
        )
    )


    best_state = (
        copy.deepcopy(
            model.state_dict()
        )
    )


    best_f1 = (
        -1.0
    )


    epoch_number = 0


    # ========================================================
    # STAGE 1
    # CLASSIFIER HEAD
    # ========================================================

    freeze_all(
        model
    )


    enable_fc(
        model
    )


    optimizer = (
        torch.optim.AdamW(

            model.fc.parameters(),

            lr=
                3e-4,

            weight_decay=
                1e-4,
        )
    )


    (
        best_state,
        best_f1,
        epoch_number,
    ) = train_stage(

        model,

        training_loader,

        validation_loader,

        device,

        optimizer,

        5,

        "STAGE 1 - CLASSIFIER HEAD",

        best_state,

        best_f1,

        epoch_number,
    )


    model.load_state_dict(
        best_state
    )


    # ========================================================
    # STAGE 2
    # LAYER 4
    # ========================================================

    freeze_all(
        model
    )


    enable_layer4(
        model
    )


    enable_fc(
        model
    )


    optimizer = (
        torch.optim.AdamW(

            [

                {

                    "params":
                        model
                        .layer4
                        .parameters(),

                    "lr":
                        5e-5,
                },

                {

                    "params":
                        model
                        .fc
                        .parameters(),

                    "lr":
                        1.5e-4,
                },
            ],

            weight_decay=
                1e-4,
        )
    )


    (
        best_state,
        best_f1,
        epoch_number,
    ) = train_stage(

        model,

        training_loader,

        validation_loader,

        device,

        optimizer,

        12,

        "STAGE 2 - LAYER4 FINE-TUNING",

        best_state,

        best_f1,

        epoch_number,
    )


    model.load_state_dict(
        best_state
    )


    # ========================================================
    # STAGE 3
    # LAYER 3 + LAYER 4
    # ========================================================

    freeze_all(
        model
    )


    enable_layer3(
        model
    )


    enable_layer4(
        model
    )


    enable_fc(
        model
    )


    optimizer = (
        torch.optim.AdamW(

            [

                {

                    "params":
                        model
                        .layer3
                        .parameters(),

                    "lr":
                        1e-5,
                },

                {

                    "params":
                        model
                        .layer4
                        .parameters(),

                    "lr":
                        3e-5,
                },

                {

                    "params":
                        model
                        .fc
                        .parameters(),

                    "lr":
                        7e-5,
                },
            ],

            weight_decay=
                1e-4,
        )
    )


    (
        best_state,
        best_f1,
        epoch_number,
    ) = train_stage(

        model,

        training_loader,

        validation_loader,

        device,

        optimizer,

        10,

        "STAGE 3 - DEEP FINE-TUNING",

        best_state,

        best_f1,

        epoch_number,
    )


    model.load_state_dict(
        best_state
    )


    final_metrics = (
        evaluate(

            model,

            validation_loader,

            device,
        )
    )


    MODEL_DIR.mkdir(

        parents=True,

        exist_ok=True,
    )


    checkpoint = {

        "model_name":
            "product_category_resnet18",

        "architecture":
            "resnet18",

        "pretrained":
            True,

        "pretrained_weights":
            "ImageNet1K_V1",

        "fine_tuned":
            True,

        "training_from_scratch":
            False,

        "class_names":
            CATEGORIES,

        "class_to_index":
            class_to_index,

        "num_classes":
            len(
                CATEGORIES
            ),

        "image_size":
            IMAGE_SIZE,

        "dropout":
            0.25,

        "metrics":
            final_metrics,

        "model_state_dict":
            model.state_dict(),

        "state_dict":
            model.state_dict(),
    }


    torch.save(

        checkpoint,

        MODEL_PATH,
    )


    print()

    print(
        "=" * 90
    )

    print(
        "PRODUCT CATEGORY TRAINING COMPLETE"
    )

    print(
        "=" * 90
    )


    print(

        f"Accuracy        : "
        f"{final_metrics['accuracy'] * 100:.2f}%"
    )


    print(

        f"Macro Precision : "
        f"{final_metrics['precision'] * 100:.2f}%"
    )


    print(

        f"Macro Recall    : "
        f"{final_metrics['recall'] * 100:.2f}%"
    )


    print(

        f"Macro F1        : "
        f"{final_metrics['f1'] * 100:.2f}%"
    )


    print()

    print(
        f"Saved model:\n"
        f"{MODEL_PATH}"
    )


    print(
        "=" * 90
    )


if __name__ == "__main__":

    main()