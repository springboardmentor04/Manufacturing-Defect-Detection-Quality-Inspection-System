import os
import json
import copy

import numpy as np

import torch
import torch.nn as nn

from torch.utils.data import Dataset, DataLoader

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
# CONFIG
# ============================================================

CATEGORY = "zipper"

SEED = 42

IMAGE_SIZE = 224

BATCH_SIZE = 16

NUM_WORKERS = 0

NUM_CLASSES = 8


CLASSES = [
    "good",
    "broken_teeth",
    "combined",
    "fabric_border",
    "fabric_interior",
    "rough",
    "split_teeth",
    "squeezed_teeth",
]


CLASS_TO_INDEX = {
    name: index
    for index, name in enumerate(CLASSES)
}


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


MODEL_PATH = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "saved_models",
    "zipper_resnet18.pth",
)


RESULT_DIR = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "evaluation_results",
)


RESULT_PATH = os.path.join(
    RESULT_DIR,
    "zipper_logit_calibration.json",
)


CALIBRATED_MODEL_PATH = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "saved_models",
    "zipper_resnet18_calibrated.pth",
)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# ============================================================
# REPRODUCIBILITY
# ============================================================

torch.manual_seed(SEED)

np.random.seed(SEED)


if torch.cuda.is_available():

    torch.cuda.manual_seed_all(
        SEED
    )


# ============================================================
# PRINT HEADER
# ============================================================

print("=" * 78)

print(
    "VISIONINSPECT AI - ZIPPER LOGIT CALIBRATION"
)

print("=" * 78)

print(
    f"Device       : {DEVICE}"
)

print(
    f"Dataset      : {DATASET_DIR}"
)

print(
    f"Original     : {MODEL_PATH}"
)

print(
    f"Calibrated   : {CALIBRATED_MODEL_PATH}"
)


# ============================================================
# TRANSFORM
# ============================================================

transform = transforms.Compose(
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

    lower = filename.lower()

    return (
        lower.endswith(
            IMAGE_EXTENSIONS
        )
        and "_mask" not in lower
    )


# ============================================================
# DATASET
# ============================================================

class ZipperDataset(
    Dataset
):

    def __init__(
        self,
        paths,
        labels,
    ):

        self.paths = paths

        self.labels = labels


    def __len__(self):

        return len(
            self.paths
        )


    def __getitem__(
        self,
        index,
    ):

        path = self.paths[
            index
        ]

        label = self.labels[
            index
        ]


        image = Image.open(
            path
        ).convert("RGB")


        image = transform(
            image
        )


        return (
            image,
            label,
        )


# ============================================================
# COLLECT TRAINING DATA
#
# Same project training convention:
#
# train/good
# +
# test defects
#
# IMPORTANT:
# test/good is NOT used for calibration training.
# ============================================================

def collect_training_data():

    paths = []

    labels = []


    # --------------------------------------------------------
    # GOOD
    # --------------------------------------------------------

    good_dir = os.path.join(
        DATASET_DIR,
        "train",
        "good",
    )


    if not os.path.exists(
        good_dir
    ):

        raise FileNotFoundError(
            f"Missing directory:\n"
            f"{good_dir}"
        )


    for filename in sorted(
        os.listdir(
            good_dir
        )
    ):

        if valid_image(
            filename
        ):

            paths.append(
                os.path.join(
                    good_dir,
                    filename,
                )
            )

            labels.append(
                CLASS_TO_INDEX[
                    "good"
                ]
            )


    # --------------------------------------------------------
    # DEFECTS
    # --------------------------------------------------------

    test_dir = os.path.join(
        DATASET_DIR,
        "test",
    )


    for class_name in CLASSES:

        if class_name == "good":

            continue


        class_dir = os.path.join(
            test_dir,
            class_name,
        )


        if not os.path.exists(
            class_dir
        ):

            raise FileNotFoundError(
                f"Missing directory:\n"
                f"{class_dir}"
            )


        for filename in sorted(
            os.listdir(
                class_dir
            )
        ):

            if valid_image(
                filename
            ):

                paths.append(
                    os.path.join(
                        class_dir,
                        filename,
                    )
                )

                labels.append(
                    CLASS_TO_INDEX[
                        class_name
                    ]
                )


    return (
        paths,
        labels,
    )


# ============================================================
# LOAD CALIBRATION DATA
# ============================================================

all_paths, all_labels = (
    collect_training_data()
)


print("\nCalibration source dataset")
print("-" * 78)


for index, class_name in enumerate(
    CLASSES
):

    count = all_labels.count(
        index
    )

    print(
        f"{class_name:<20}: {count}"
    )


print(
    f"{'TOTAL':<20}: "
    f"{len(all_labels)}"
)


# ============================================================
# VALIDATION SPLIT
#
# We calibrate only using this validation portion.
# ============================================================

(
    calibration_train_paths,
    calibration_val_paths,
    calibration_train_labels,
    calibration_val_labels,
) = train_test_split(

    all_paths,

    all_labels,

    test_size=0.20,

    random_state=SEED,

    stratify=all_labels,
)


print("\nCalibration split")
print("-" * 78)

print(
    f"Calibration images : "
    f"{len(calibration_val_paths)}"
)


# ============================================================
# CALIBRATION LOADER
# ============================================================

calibration_dataset = ZipperDataset(
    calibration_val_paths,
    calibration_val_labels,
)


calibration_loader = DataLoader(
    calibration_dataset,

    batch_size=BATCH_SIZE,

    shuffle=False,

    num_workers=NUM_WORKERS,
)


# ============================================================
# BUILD ORIGINAL MODEL
#
# EXACT ARCHITECTURE USED BY THE ZIPPER CHECKPOINT
# ============================================================

def build_model():

    model = models.resnet18(
        weights=None
    )


    model.fc = nn.Sequential(

        nn.Dropout(
            0.20
        ),

        nn.Linear(
            512,
            NUM_CLASSES,
        ),
    )


    return model


model = build_model()


# ============================================================
# LOAD ORIGINAL CHECKPOINT
# ============================================================

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
)


if isinstance(
    checkpoint,
    dict
):

    if "state_dict" in checkpoint:

        checkpoint = checkpoint[
            "state_dict"
        ]

    elif "model_state_dict" in checkpoint:

        checkpoint = checkpoint[
            "model_state_dict"
        ]


# Remove possible DataParallel prefix

clean_checkpoint = {}

for key, value in checkpoint.items():

    clean_key = key

    if clean_key.startswith(
        "module."
    ):

        clean_key = clean_key[
            7:
        ]


    clean_checkpoint[
        clean_key
    ] = value


missing, unexpected = model.load_state_dict(
    clean_checkpoint,
    strict=False,
)


print("\nCheckpoint loaded")

print(
    f"Missing keys    : {len(missing)}"
)

print(
    f"Unexpected keys : {len(unexpected)}"
)


model = model.to(
    DEVICE
)

model.eval()


# ============================================================
# GET ORIGINAL LOGITS
# ============================================================

def collect_logits(
    loader,
):

    logits_list = []

    labels_list = []


    with torch.no_grad():

        for (
            images,
            labels,
        ) in loader:

            images = images.to(
                DEVICE
            )


            outputs = model(
                images
            )


            logits_list.append(
                outputs.cpu()
            )


            labels_list.append(
                labels
            )


    logits = torch.cat(
        logits_list,
        dim=0,
    )


    labels = torch.cat(
        labels_list,
        dim=0,
    )


    return (
        logits,
        labels,
    )


calibration_logits, calibration_labels = (
    collect_logits(
        calibration_loader
    )
)


print(
    "\nCollected validation logits:"
)

print(
    calibration_logits.shape
)


# ============================================================
# METRICS
# ============================================================

def metrics(
    y_true,
    y_pred,
):

    return {

        "accuracy": float(
            accuracy_score(
                y_true,
                y_pred,
            )
        ),

        "macro_precision": float(
            precision_score(
                y_true,
                y_pred,
                average="macro",
                zero_division=0,
            )
        ),

        "macro_recall": float(
            recall_score(
                y_true,
                y_pred,
                average="macro",
                zero_division=0,
            )
        ),

        "macro_f1": float(
            f1_score(
                y_true,
                y_pred,
                average="macro",
                zero_division=0,
            )
        ),
    }


# ============================================================
# BASELINE VALIDATION
# ============================================================

baseline_predictions = torch.argmax(
    calibration_logits,
    dim=1,
)


baseline_metrics = metrics(
    calibration_labels.numpy(),
    baseline_predictions.numpy(),
)


print("\nBASELINE VALIDATION")
print("-" * 78)

print(
    f"Accuracy        : "
    f"{baseline_metrics['accuracy'] * 100:.2f}%"
)

print(
    f"Macro Precision : "
    f"{baseline_metrics['macro_precision'] * 100:.2f}%"
)

print(
    f"Macro Recall    : "
    f"{baseline_metrics['macro_recall'] * 100:.2f}%"
)

print(
    f"Macro F1        : "
    f"{baseline_metrics['macro_f1'] * 100:.2f}%"
)


# ============================================================
# TARGETED CALIBRATION
#
# We learn:
#
# 1. temperature
# 2. per-class bias
#
# WITHOUT changing the ResNet weights.
#
# The bias is regularized so the optimizer cannot arbitrarily
# distort the original model.
# ============================================================

logits = calibration_logits.to(
    DEVICE
)

targets = calibration_labels.to(
    DEVICE
)


# ------------------------------------------------------------
# Temperature
# ------------------------------------------------------------

log_temperature = torch.tensor(
    0.0,
    dtype=torch.float32,
    device=DEVICE,
    requires_grad=True,
)


# ------------------------------------------------------------
# Class biases
# ------------------------------------------------------------

class_bias = torch.zeros(
    NUM_CLASSES,
    dtype=torch.float32,
    device=DEVICE,
    requires_grad=True,
)


# ------------------------------------------------------------
# Optimizer
# ------------------------------------------------------------

optimizer = torch.optim.Adam(
    [
        log_temperature,
        class_bias,
    ],
    lr=0.025,
)


# ------------------------------------------------------------
# Cross entropy
# ------------------------------------------------------------

criterion = nn.CrossEntropyLoss()


best_loss = float(
    "inf"
)

best_temperature = 1.0

best_bias = torch.zeros(
    NUM_CLASSES
)


# ------------------------------------------------------------
# Optimize
# ------------------------------------------------------------

for step in range(
    1,
    1001,
):

    optimizer.zero_grad()


    temperature = torch.exp(
        log_temperature
    )


    calibrated_logits = (
        logits
        /
        temperature
    )


    calibrated_logits = (
        calibrated_logits
        +
        class_bias
    )


    loss = criterion(
        calibrated_logits,
        targets,
    )


    # --------------------------------------------------------
    # Regularization
    #
    # Prevent large changes to the original classifier.
    # --------------------------------------------------------

    temperature_penalty = (
        (temperature - 1.0)
        ** 2
    )


    bias_penalty = torch.mean(
        class_bias ** 2
    )


    total_loss = (
        loss
        +
        0.15
        *
        temperature_penalty
        +
        0.08
        *
        bias_penalty
    )


    total_loss.backward()


    optimizer.step()


    if total_loss.item() < best_loss:

        best_loss = (
            total_loss.item()
        )

        best_temperature = (
            temperature.detach()
            .item()
        )

        best_bias = (
            class_bias.detach()
            .cpu()
            .clone()
        )


    if step % 100 == 0:

        print(
            f"Calibration step "
            f"{step:04d} | "
            f"loss={total_loss.item():.5f} | "
            f"T={temperature.item():.4f}"
        )


# ============================================================
# FINAL CALIBRATION PARAMETERS
# ============================================================

temperature = (
    best_temperature
)

bias = (
    best_bias.numpy()
)


print("\n" + "=" * 78)

print(
    "LEARNED CALIBRATION PARAMETERS"
)

print("=" * 78)


print(
    f"\nTemperature : "
    f"{temperature:.6f}"
)


print(
    "\nClass biases:"
)


for class_name, value in zip(
    CLASSES,
    bias,
):

    print(
        f"{class_name:<20}: "
        f"{value:+.6f}"
    )


# ============================================================
# CALIBRATED VALIDATION
# ============================================================

calibrated_validation_logits = (
    calibration_logits.numpy()
    /
    temperature
)


calibrated_validation_logits += (
    bias
)


calibrated_predictions = (
    np.argmax(
        calibrated_validation_logits,
        axis=1,
    )
)


calibrated_metrics = metrics(
    calibration_labels.numpy(),
    calibrated_predictions,
)


print("\nCALIBRATED VALIDATION")
print("-" * 78)

print(
    f"Accuracy        : "
    f"{calibrated_metrics['accuracy'] * 100:.2f}%"
)

print(
    f"Macro Precision : "
    f"{calibrated_metrics['macro_precision'] * 100:.2f}%"
)

print(
    f"Macro Recall    : "
    f"{calibrated_metrics['macro_recall'] * 100:.2f}%"
)

print(
    f"Macro F1        : "
    f"{calibrated_metrics['macro_f1'] * 100:.2f}%"
)


print(
    "\nValidation confusion matrix:"
)

print(
    confusion_matrix(
        calibration_labels.numpy(),
        calibrated_predictions,
        labels=list(
            range(
                NUM_CLASSES
            )
        ),
    )
)


print(
    "\nValidation classification report:"
)

print(
    classification_report(
        calibration_labels.numpy(),
        calibrated_predictions,
        labels=list(
            range(
                NUM_CLASSES
            )
        ),
        target_names=CLASSES,
        digits=4,
        zero_division=0,
    )
)


# ============================================================
# SAVE CALIBRATED MODEL PACKAGE
#
# We save:
#
# - original ResNet weights
# - temperature
# - class bias
#
# The original checkpoint remains untouched.
# ============================================================

calibrated_package = {

    "model_state_dict":
        clean_checkpoint,

    "temperature":
        float(temperature),

    "class_bias":
        bias.tolist(),

    "classes":
        CLASSES,

    "category":
        CATEGORY,

    "method":
        "temperature_plus_regularized_class_bias",

    "original_model":
        "zipper_resnet18.pth",
}


torch.save(
    calibrated_package,
    CALIBRATED_MODEL_PATH,
)


# ============================================================
# SAVE JSON
# ============================================================

os.makedirs(
    RESULT_DIR,
    exist_ok=True,
)


result = {

    "category":
        CATEGORY,

    "method":
        "temperature_plus_regularized_class_bias",

    "classes":
        CLASSES,

    "source_model":
        MODEL_PATH,

    "calibrated_model":
        CALIBRATED_MODEL_PATH,

    "calibration_samples":
        len(
            calibration_val_labels
        ),

    "temperature":
        float(
            temperature
        ),

    "class_bias": {

        class_name:
            float(value)

        for class_name, value
        in zip(
            CLASSES,
            bias,
        )
    },

    "baseline_validation":
        baseline_metrics,

    "calibrated_validation":
        calibrated_metrics,

    "improvement": {

        "accuracy":
            calibrated_metrics[
                "accuracy"
            ]
            -
            baseline_metrics[
                "accuracy"
            ],

        "macro_precision":
            calibrated_metrics[
                "macro_precision"
            ]
            -
            baseline_metrics[
                "macro_precision"
            ],

        "macro_recall":
            calibrated_metrics[
                "macro_recall"
            ]
            -
            baseline_metrics[
                "macro_recall"
            ],

        "macro_f1":
            calibrated_metrics[
                "macro_f1"
            ]
            -
            baseline_metrics[
                "macro_f1"
            ],
    },
}


with open(
    RESULT_PATH,
    "w",
    encoding="utf-8",
) as file:

    json.dump(
        result,
        file,
        indent=4,
    )


# ============================================================
# FINAL
# ============================================================

print("\n" + "=" * 78)

print(
    "ZIPPER LOGIT CALIBRATION COMPLETE"
)

print("=" * 78)


print(
    "\nOriginal model preserved:"
)

print(
    MODEL_PATH
)


print(
    "\nCalibrated model package:"
)

print(
    CALIBRATED_MODEL_PATH
)


print(
    "\nCalibration results:"
)

print(
    RESULT_PATH
)


print(
    "\nIMPORTANT:"
)

print(
    "This calibration does NOT retrain "
    "or overwrite the original ResNet18."
)

print("=" * 78)