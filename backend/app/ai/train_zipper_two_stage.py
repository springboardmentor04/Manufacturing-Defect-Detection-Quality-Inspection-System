import os
import random
import copy
import json

import numpy as np

import torch
import torch.nn as nn
import torch.optim as optim

from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler

from torchvision import models, transforms

from PIL import Image

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)


# ============================================================
# CONFIGURATION
# ============================================================

SEED = 42

CATEGORY = "zipper"

IMAGE_SIZE = 224

BATCH_SIZE = 16

NUM_WORKERS = 0


# ============================================================
# STAGE 1
# GOOD VS DEFECTIVE
# ============================================================

BINARY_CLASSES = [
    "good",
    "defect",
]


# ============================================================
# STAGE 2
# DEFECT TYPE CLASSIFIER
# ============================================================

DEFECT_CLASSES = [
    "broken_teeth",
    "combined",
    "fabric_border",
    "fabric_interior",
    "rough",
    "split_teeth",
    "squeezed_teeth",
]


NUM_DEFECT_CLASSES = len(
    DEFECT_CLASSES
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
    )
)


DATASET_DIR = os.path.join(
    BASE_DIR,
    "dataset",
    "mvtec_ad",
    CATEGORY,
)


MODEL_DIR = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "saved_models",
)


RESULT_DIR = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "evaluation_results",
)


BINARY_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "zipper_binary_resnet18.pth",
)


DEFECT_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "zipper_defect_resnet18.pth",
)


RESULT_PATH = os.path.join(
    RESULT_DIR,
    "zipper_two_stage_training.json",
)


# ============================================================
# REPRODUCIBILITY
# ============================================================

def set_seed(seed=42):

    random.seed(seed)

    np.random.seed(seed)

    torch.manual_seed(seed)

    if torch.cuda.is_available():

        torch.cuda.manual_seed(seed)

        torch.cuda.manual_seed_all(seed)

    torch.backends.cudnn.deterministic = True

    torch.backends.cudnn.benchmark = False


set_seed(SEED)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


print("=" * 75)
print("VISIONINSPECT AI - TWO-STAGE ZIPPER TRAINING")
print("=" * 75)

print(
    f"Device       : {DEVICE}"
)

print(
    f"Dataset      : {DATASET_DIR}"
)

print(
    f"Binary model : {BINARY_MODEL_PATH}"
)

print(
    f"Defect model : {DEFECT_MODEL_PATH}"
)


# ============================================================
# IMAGE VALIDATION
# ============================================================

IMAGE_EXTENSIONS = (
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".tif",
    ".tiff",
)


def valid_image(filename):

    return (
        filename.lower().endswith(
            IMAGE_EXTENSIONS
        )
        and "_mask" not in filename.lower()
    )


# ============================================================
# TRANSFORMS
# ============================================================

train_transform = transforms.Compose(
    [

        transforms.Resize(
            (256, 256)
        ),

        transforms.RandomResizedCrop(
            IMAGE_SIZE,
            scale=(0.85, 1.0),
            ratio=(0.90, 1.10),
        ),

        transforms.RandomHorizontalFlip(
            p=0.5
        ),

        transforms.RandomRotation(
            degrees=7
        ),

        transforms.ColorJitter(
            brightness=0.10,
            contrast=0.10,
            saturation=0.06,
            hue=0.015,
        ),

        transforms.ToTensor(),

        transforms.Normalize(
            mean=[
                0.485,
                0.456,
                0.406,
            ],
            std=[
                0.229,
                0.224,
                0.225,
            ],
        ),
    ]
)


val_transform = transforms.Compose(
    [

        transforms.Resize(
            (256, 256)
        ),

        transforms.CenterCrop(
            IMAGE_SIZE
        ),

        transforms.ToTensor(),

        transforms.Normalize(
            mean=[
                0.485,
                0.456,
                0.406,
            ],
            std=[
                0.229,
                0.224,
                0.225,
            ],
        ),
    ]
)


# ============================================================
# GENERIC IMAGE DATASET
# ============================================================

class ImageClassificationDataset(
    Dataset
):

    def __init__(
        self,
        image_paths,
        labels,
        transform,
    ):

        self.image_paths = image_paths

        self.labels = labels

        self.transform = transform


    def __len__(self):

        return len(
            self.image_paths
        )


    def __getitem__(
        self,
        index,
    ):

        path = self.image_paths[
            index
        ]

        label = self.labels[
            index
        ]

        image = Image.open(
            path
        ).convert("RGB")

        image = self.transform(
            image
        )

        return (
            image,
            label,
        )


# ============================================================
# COLLECT ALL ZIPPER DATA
#
# Training:
#
# train/good
# +
# test defect classes
#
# We intentionally DO NOT train using test/good.
# ============================================================

def collect_training_data():

    paths = []

    labels = []

    # --------------------------------------------------------
    # GOOD
    # --------------------------------------------------------

    train_good_dir = os.path.join(
        DATASET_DIR,
        "train",
        "good",
    )

    if not os.path.exists(
        train_good_dir
    ):

        raise FileNotFoundError(
            f"Missing:\n"
            f"{train_good_dir}"
        )


    for filename in os.listdir(
        train_good_dir
    ):

        if valid_image(
            filename
        ):

            paths.append(
                os.path.join(
                    train_good_dir,
                    filename,
                )
            )

            labels.append(
                "good"
            )


    # --------------------------------------------------------
    # DEFECTS
    # --------------------------------------------------------

    test_dir = os.path.join(
        DATASET_DIR,
        "test",
    )


    for defect_name in DEFECT_CLASSES:

        defect_dir = os.path.join(
            test_dir,
            defect_name,
        )


        if not os.path.exists(
            defect_dir
        ):

            print(
                f"WARNING: Missing "
                f"{defect_dir}"
            )

            continue


        for filename in os.listdir(
            defect_dir
        ):

            if valid_image(
                filename
            ):

                paths.append(
                    os.path.join(
                        defect_dir,
                        filename,
                    )
                )

                labels.append(
                    defect_name
                )


    return (
        paths,
        labels,
    )


# ============================================================
# LOAD DATA
# ============================================================

all_paths, all_labels = (
    collect_training_data()
)


print("\nComplete training dataset")
print("-" * 75)


for class_name in (
    ["good"] + DEFECT_CLASSES
):

    count = all_labels.count(
        class_name
    )

    print(
        f"{class_name:<20} : {count}"
    )


print("-" * 75)

print(
    f"Total                : "
    f"{len(all_labels)}"
)


# ============================================================
# TRAIN / VALIDATION SPLIT
# ============================================================

train_paths, val_paths, train_labels, val_labels = (
    train_test_split(
        all_paths,
        all_labels,
        test_size=0.20,
        random_state=SEED,
        stratify=all_labels,
    )
)


print("\nSplit")
print("-" * 75)

print(
    f"Training             : "
    f"{len(train_paths)}"
)

print(
    f"Validation           : "
    f"{len(val_paths)}"
)


# ============================================================
# HELPER
# ============================================================

def build_loaders(
    train_paths,
    train_labels,
    val_paths,
    val_labels,
):

    train_dataset = (
        ImageClassificationDataset(
            train_paths,
            train_labels,
            train_transform,
        )
    )


    val_dataset = (
        ImageClassificationDataset(
            val_paths,
            val_labels,
            val_transform,
        )
    )


    unique_labels = sorted(
        set(train_labels)
    )


    counts = {
        label: train_labels.count(
            label
        )
        for label in unique_labels
    }


    # --------------------------------------------------------
    # Mild balancing
    #
    # Avoid extreme oversampling because the zipper dataset
    # has many more good images than individual defect classes.
    # --------------------------------------------------------

    max_count = max(
        counts.values()
    )


    class_weights = {}

    for label, count in counts.items():

        class_weights[
            label
        ] = np.sqrt(
            max_count
            /
            max(
                count,
                1,
            )
        )


    sample_weights = [
        class_weights[
            label
        ]
        for label in train_labels
    ]


    sampler = WeightedRandomSampler(
        torch.tensor(
            sample_weights,
            dtype=torch.double,
        ),
        num_samples=len(
            sample_weights
        ),
        replacement=True,
    )


    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        sampler=sampler,
        num_workers=NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
    )


    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
    )


    return (
        train_loader,
        val_loader,
        train_dataset,
        val_dataset,
    )


# ============================================================
# STAGE 1 DATA
# ============================================================

binary_train_labels = [
    0 if label == "good" else 1
    for label in train_labels
]


binary_val_labels = [
    0 if label == "good" else 1
    for label in val_labels
]


binary_train_loader, binary_val_loader, _, _ = build_loaders(
    train_paths,
    binary_train_labels,
    val_paths,
    binary_val_labels,
)


# ============================================================
# STAGE 2 DATA
#
# ONLY DEFECT IMAGES
# ============================================================

defect_train_paths = []

defect_train_labels = []

defect_val_paths = []

defect_val_labels = []


for path, label in zip(
    train_paths,
    train_labels,
):

    if label != "good":

        defect_train_paths.append(
            path
        )

        defect_train_labels.append(
            DEFECT_CLASSES.index(
                label
            )
        )


for path, label in zip(
    val_paths,
    val_labels,
):

    if label != "good":

        defect_val_paths.append(
            path
        )

        defect_val_labels.append(
            DEFECT_CLASSES.index(
                label
            )
        )


(
    defect_train_loader,
    defect_val_loader,
    _,
    _,
) = build_loaders(
    defect_train_paths,
    defect_train_labels,
    defect_val_paths,
    defect_val_labels,
)


print("\nStage 2 defect dataset")
print("-" * 75)

for index, class_name in enumerate(
    DEFECT_CLASSES
):

    train_count = (
        defect_train_labels.count(
            index
        )
    )

    val_count = (
        defect_val_labels.count(
            index
        )
    )

    print(
        f"{class_name:<20} "
        f"train={train_count:<4} "
        f"val={val_count}"
    )


# ============================================================
# MODEL BUILDER
# ============================================================

def build_resnet18(
    num_classes
):

    model = models.resnet18(
        weights=models.ResNet18_Weights.DEFAULT
    )


    model.fc = nn.Sequential(
        nn.Dropout(
            0.20
        ),

        nn.Linear(
            512,
            num_classes,
        ),
    )


    return model


# ============================================================
# METRICS
# ============================================================

def classification_metrics(
    y_true,
    y_pred,
):

    return {
        "accuracy": accuracy_score(
            y_true,
            y_pred,
        ),

        "precision": precision_score(
            y_true,
            y_pred,
            average="macro",
            zero_division=0,
        ),

        "recall": recall_score(
            y_true,
            y_pred,
            average="macro",
            zero_division=0,
        ),

        "f1": f1_score(
            y_true,
            y_pred,
            average="macro",
            zero_division=0,
        ),
    }


# ============================================================
# GENERIC TRAINING FUNCTION
# ============================================================

def train_model(
    model,
    train_loader,
    val_loader,
    class_names,
    class_weights,
    stage_name,
    epochs,
    learning_rate,
):

    print("\n" + "=" * 75)

    print(
        stage_name
    )

    print("=" * 75)


    criterion = nn.CrossEntropyLoss(
        weight=class_weights,
        label_smoothing=0.04,
    )


    optimizer = optim.AdamW(
        model.parameters(),
        lr=learning_rate,
        weight_decay=1e-4,
    )


    scheduler = (
        optim.lr_scheduler.CosineAnnealingLR(
            optimizer,
            T_max=epochs,
            eta_min=learning_rate * 0.05,
        )
    )


    best_f1 = -1.0

    best_state = copy.deepcopy(
        model.state_dict()
    )

    best_epoch = 0

    patience = 7

    no_improvement = 0


    for epoch in range(
        1,
        epochs + 1,
    ):

        # ====================================================
        # TRAIN
        # ====================================================

        model.train()

        train_loss = 0.0

        train_true = []

        train_pred = []


        for (
            images,
            labels_batch,
        ) in train_loader:

            images = images.to(
                DEVICE
            )

            labels_batch = labels_batch.to(
                DEVICE
            )


            optimizer.zero_grad()


            outputs = model(
                images
            )


            loss = criterion(
                outputs,
                labels_batch,
            )


            loss.backward()


            torch.nn.utils.clip_grad_norm_(
                model.parameters(),
                max_norm=5.0,
            )


            optimizer.step()


            train_loss += (
                loss.item()
                *
                images.size(0)
            )


            predictions = torch.argmax(
                outputs,
                dim=1,
            )


            train_true.extend(
                labels_batch
                .detach()
                .cpu()
                .numpy()
                .tolist()
            )


            train_pred.extend(
                predictions
                .detach()
                .cpu()
                .numpy()
                .tolist()
            )


        train_loss /= len(
            train_loader.dataset
        )


        train_metrics = classification_metrics(
            train_true,
            train_pred,
        )


        # ====================================================
        # VALIDATION
        # ====================================================

        model.eval()

        val_loss = 0.0

        val_true = []

        val_pred = []


        with torch.no_grad():

            for (
                images,
                labels_batch,
            ) in val_loader:

                images = images.to(
                    DEVICE
                )

                labels_batch = labels_batch.to(
                    DEVICE
                )


                outputs = model(
                    images
                )


                loss = criterion(
                    outputs,
                    labels_batch,
                )


                val_loss += (
                    loss.item()
                    *
                    images.size(0)
                )


                predictions = torch.argmax(
                    outputs,
                    dim=1,
                )


                val_true.extend(
                    labels_batch
                    .cpu()
                    .numpy()
                    .tolist()
                )


                val_pred.extend(
                    predictions
                    .cpu()
                    .numpy()
                    .tolist()
                )


        val_loss /= len(
            val_loader.dataset
        )


        val_metrics = classification_metrics(
            val_true,
            val_pred,
        )


        print(
            f"\nEpoch "
            f"{epoch:02d}/{epochs}"
        )


        print(
            f"Train Loss           : "
            f"{train_loss:.4f}"
        )


        print(
            f"Train Accuracy       : "
            f"{train_metrics['accuracy'] * 100:.2f}%"
        )


        print(
            f"Train Macro F1       : "
            f"{train_metrics['f1'] * 100:.2f}%"
        )


        print(
            f"Validation Loss      : "
            f"{val_loss:.4f}"
        )


        print(
            f"Validation Accuracy  : "
            f"{val_metrics['accuracy'] * 100:.2f}%"
        )


        print(
            f"Validation Precision : "
            f"{val_metrics['precision'] * 100:.2f}%"
        )


        print(
            f"Validation Recall    : "
            f"{val_metrics['recall'] * 100:.2f}%"
        )


        print(
            f"Validation Macro F1  : "
            f"{val_metrics['f1'] * 100:.2f}%"
        )


        # ====================================================
        # BEST MODEL
        # ====================================================

        if (
            val_metrics["f1"]
            >
            best_f1
            +
            1e-5
        ):

            best_f1 = (
                val_metrics["f1"]
            )

            best_state = copy.deepcopy(
                model.state_dict()
            )

            best_epoch = epoch

            no_improvement = 0

            print(
                "  >>> NEW BEST MODEL"
            )

        else:

            no_improvement += 1


        scheduler.step()


        if (
            no_improvement
            >=
            patience
        ):

            print(
                "\nEarly stopping."
            )

            break


    model.load_state_dict(
        best_state
    )


    # ========================================================
    # FINAL VALIDATION
    # ========================================================

    model.eval()

    final_true = []

    final_pred = []


    with torch.no_grad():

        for (
            images,
            labels_batch,
        ) in val_loader:

            images = images.to(
                DEVICE
            )

            outputs = model(
                images
            )


            predictions = torch.argmax(
                outputs,
                dim=1,
            )


            final_true.extend(
                labels_batch
                .numpy()
                .tolist()
            )


            final_pred.extend(
                predictions
                .cpu()
                .numpy()
                .tolist()
            )


    final_metrics = classification_metrics(
        final_true,
        final_pred,
    )


    print("\n" + "-" * 75)

    print(
        f"{stage_name} FINAL"
    )

    print("-" * 75)


    print(
        f"Best epoch          : "
        f"{best_epoch}"
    )


    print(
        f"Accuracy            : "
        f"{final_metrics['accuracy'] * 100:.2f}%"
    )


    print(
        f"Macro Precision     : "
        f"{final_metrics['precision'] * 100:.2f}%"
    )


    print(
        f"Macro Recall        : "
        f"{final_metrics['recall'] * 100:.2f}%"
    )


    print(
        f"Macro F1            : "
        f"{final_metrics['f1'] * 100:.2f}%"
    )


    print("\nClassification report")

    print(
        classification_report(
            final_true,
            final_pred,
            labels=list(
                range(
                    len(class_names)
                )
            ),
            target_names=class_names,
            digits=4,
            zero_division=0,
        )
    )


    print(
        "Confusion matrix"
    )

    print(
        confusion_matrix(
            final_true,
            final_pred,
            labels=list(
                range(
                    len(class_names)
                )
            ),
        )
    )


    return (
        model,
        final_metrics,
        best_epoch,
    )


# ============================================================
# STAGE 1 - BINARY MODEL
# ============================================================

print("\n" + "=" * 75)
print("STAGE 1: GOOD VS DEFECT")
print("=" * 75)


binary_model = build_resnet18(
    2
)


binary_model = binary_model.to(
    DEVICE
)


# ------------------------------------------------------------
# Binary class weights
#
# Defects receive higher weight because GOOD is dominant.
# ------------------------------------------------------------

binary_counts = np.bincount(
    binary_train_labels,
    minlength=2,
).astype(np.float32)


binary_weights = (
    np.sqrt(
        binary_counts.max()
        /
        np.maximum(
            binary_counts,
            1,
        )
    )
)


binary_weights = torch.tensor(
    binary_weights,
    dtype=torch.float32,
).to(DEVICE)


(
    binary_model,
    binary_metrics,
    binary_best_epoch,
) = train_model(
    model=binary_model,
    train_loader=binary_train_loader,
    val_loader=binary_val_loader,
    class_names=BINARY_CLASSES,
    class_weights=binary_weights,
    stage_name="STAGE 1 - BINARY DEFECT DETECTOR",
    epochs=18,
    learning_rate=3e-4,
)


# ============================================================
# SAVE BINARY MODEL
# ============================================================

os.makedirs(
    MODEL_DIR,
    exist_ok=True,
)


torch.save(
    binary_model.state_dict(),
    BINARY_MODEL_PATH,
)


print(
    f"\nBinary model saved:\n"
    f"{BINARY_MODEL_PATH}"
)


# ============================================================
# STAGE 2 - DEFECT CLASSIFIER
# ============================================================

print("\n" + "=" * 75)

print(
    "STAGE 2: DEFECT TYPE CLASSIFIER"
)

print("=" * 75)


defect_model = build_resnet18(
    NUM_DEFECT_CLASSES
)


defect_model = defect_model.to(
    DEVICE
)


# ------------------------------------------------------------
# DEFECT CLASS WEIGHTS
#
# Extra focus:
#
# broken_teeth
# combined
# fabric_interior
# squeezed_teeth
# ------------------------------------------------------------

defect_weight_values = torch.tensor(
    [
        1.75,   # broken_teeth
        1.35,   # combined
        1.00,   # fabric_border
        1.55,   # fabric_interior
        1.00,   # rough
        1.00,   # split_teeth
        1.60,   # squeezed_teeth
    ],
    dtype=torch.float32,
).to(DEVICE)


(
    defect_model,
    defect_metrics,
    defect_best_epoch,
) = train_model(
    model=defect_model,
    train_loader=defect_train_loader,
    val_loader=defect_val_loader,
    class_names=DEFECT_CLASSES,
    class_weights=defect_weight_values,
    stage_name="STAGE 2 - SPECIALIZED DEFECT CLASSIFIER",
    epochs=30,
    learning_rate=2e-4,
)


# ============================================================
# SAVE DEFECT MODEL
# ============================================================

torch.save(
    defect_model.state_dict(),
    DEFECT_MODEL_PATH,
)


print(
    f"\nDefect model saved:\n"
    f"{DEFECT_MODEL_PATH}"
)


# ============================================================
# SAVE TRAINING SUMMARY
# ============================================================

training_summary = {

    "category": CATEGORY,

    "device": str(
        DEVICE
    ),

    "binary": {

        "classes": BINARY_CLASSES,

        "accuracy": float(
            binary_metrics[
                "accuracy"
            ]
        ),

        "macro_precision": float(
            binary_metrics[
                "precision"
            ]
        ),

        "macro_recall": float(
            binary_metrics[
                "recall"
            ]
        ),

        "macro_f1": float(
            binary_metrics[
                "f1"
            ]
        ),

        "best_epoch": int(
            binary_best_epoch
        ),

        "model_path": BINARY_MODEL_PATH,
    },

    "defect": {

        "classes": DEFECT_CLASSES,

        "accuracy": float(
            defect_metrics[
                "accuracy"
            ]
        ),

        "macro_precision": float(
            defect_metrics[
                "precision"
            ]
        ),

        "macro_recall": float(
            defect_metrics[
                "recall"
            ]
        ),

        "macro_f1": float(
            defect_metrics[
                "f1"
            ]
        ),

        "best_epoch": int(
            defect_best_epoch
        ),

        "model_path": DEFECT_MODEL_PATH,
    },

    "training_dataset": {

        "total": len(
            all_labels
        ),

        "good": all_labels.count(
            "good"
        ),

        "defects": (
            len(all_labels)
            -
            all_labels.count(
                "good"
            )
        ),
    },
}


os.makedirs(
    RESULT_DIR,
    exist_ok=True,
)


with open(
    RESULT_PATH,
    "w",
    encoding="utf-8",
) as file:

    json.dump(
        training_summary,
        file,
        indent=4,
    )


# ============================================================
# FINAL
# ============================================================

print("\n" + "=" * 75)

print(
    "TWO-STAGE ZIPPER TRAINING COMPLETE"
)

print("=" * 75)


print(
    "\nStage 1 binary model:"
)

print(
    BINARY_MODEL_PATH
)


print(
    "\nStage 2 defect classifier:"
)

print(
    DEFECT_MODEL_PATH
)


print(
    "\nTraining summary:"
)

print(
    RESULT_PATH
)


print(
    "\nIMPORTANT:"
)

print(
    "Your original zipper_resnet18.pth "
    "was NOT modified."
)

print("=" * 75)