"""
VISIONINSPECT AI
TRANSISTOR - RESNET18 MODEL EVALUATION

IMPORTANT:
MVTec defect folders contain *_mask.png files.
These are segmentation masks, NOT input images.

This evaluator explicitly excludes:
    *_mask.png

Model:
    backend/app/ai/saved_models/transistor_resnet18.pth

Dataset:
    backend/dataset/mvtec_ad/transistor

Classes:
    good
    bent_lead
    cut_lead
    damaged_case
    misplaced
"""

import sys
from pathlib import Path

import torch
import torch.nn as nn

from torchvision import models, transforms

from PIL import Image

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

CATEGORY = "transistor"

CLASSES = [
    "good",
    "bent_lead",
    "cut_lead",
    "damaged_case",
    "misplaced",
]

CLASS_TO_INDEX = {
    name: index
    for index, name in enumerate(CLASSES)
}


# ============================================================
# PROJECT PATHS
# ============================================================

# File:
# backend/app/ai/evaluate_resnet18_transistor.py
#
# parents[0] = backend/app/ai
# parents[1] = backend/app
# parents[2] = backend

BACKEND_ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    BACKEND_ROOT
    / "app"
    / "ai"
    / "saved_models"
    / "transistor_resnet18.pth"
)

DATASET_DIR = (
    BACKEND_ROOT
    / "dataset"
    / "mvtec_ad"
    / "transistor"
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
# HEADER
# ============================================================

print()
print("=" * 90)
print("VISIONINSPECT AI")
print("TRANSISTOR RESNET18 MODEL EVALUATION")
print("=" * 90)

print(f"Category       : {CATEGORY}")
print(f"Device         : {DEVICE}")
print("Backbone       : ImageNet ResNet18")
print("Image size     : 224x224")
print(f"Classes        : {len(CLASSES)}")

print("=" * 90)


# ============================================================
# PATH CHECK
# ============================================================

print()
print("CHECKING PROJECT PATHS...")
print("-" * 60)

print(
    f"Backend root   : {BACKEND_ROOT}"
)

print(
    f"Dataset        : {DATASET_DIR}"
)

print(
    f"Model          : {MODEL_PATH}"
)


if not DATASET_DIR.exists():

    print()
    print("ERROR: Dataset directory not found.")
    print(DATASET_DIR)
    sys.exit(1)


if not MODEL_PATH.exists():

    print()
    print("ERROR: Model file not found.")
    print(MODEL_PATH)
    sys.exit(1)


print()
print("✓ Dataset folder found")
print("✓ Model file found")


# ============================================================
# CLASS FOLDER CHECK
# ============================================================

print()
print("CHECKING CLASS FOLDERS...")
print("-" * 60)

missing_classes = []

for class_name in CLASSES:

    found = False

    # MVTec structure:
    #
    # transistor/
    #   train/good
    #   test/good
    #   test/bent_lead
    #   test/cut_lead
    #   ...

    possible_paths = [
        DATASET_DIR / "train" / class_name,
        DATASET_DIR / "test" / class_name,
        DATASET_DIR / class_name,
    ]

    for path in possible_paths:

        if path.exists() and path.is_dir():

            found = True
            break

    if not found:
        missing_classes.append(class_name)


if missing_classes:

    print()
    print("ERROR: Missing class folders:")

    for class_name in missing_classes:
        print(f"  {class_name}")

    print()

    sys.exit(1)


print("✓ All expected classes found")


# ============================================================
# TRANSFORMS
# ============================================================

transform = transforms.Compose(
    [
        transforms.Resize(
            (224, 224)
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
# LOAD MODEL
# ============================================================

print()
print("=" * 90)
print("LOADING RESNET18 MODEL")
print("=" * 90)


model = models.resnet18(
    weights=None
)


# Current Transistor checkpoint:
#
# ResNet18
#     ↓
# Dropout
#     ↓
# Linear(512 → 5)

model.fc = nn.Sequential(
    nn.Dropout(
        p=0.4
    ),

    nn.Linear(
        model.fc.in_features,
        len(CLASSES),
    ),
)


# ============================================================
# LOAD CHECKPOINT
# ============================================================

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
)


if isinstance(checkpoint, dict):

    if "model_state_dict" in checkpoint:

        state_dict = (
            checkpoint[
                "model_state_dict"
            ]
        )

    elif "state_dict" in checkpoint:

        state_dict = (
            checkpoint[
                "state_dict"
            ]
        )

    else:

        state_dict = checkpoint

else:

    state_dict = checkpoint


# ============================================================
# REMOVE MODULE PREFIX
# ============================================================

clean_state_dict = {}

for key, value in state_dict.items():

    if key.startswith("module."):

        key = key[
            len("module.") :
        ]

    clean_state_dict[key] = value


state_dict = clean_state_dict


# ============================================================
# CHECK CLASSIFIER
# ============================================================

print()
print("CHECKING MODEL ARCHITECTURE...")
print("-" * 60)


classifier_key = "fc.1.weight"


if classifier_key not in state_dict:

    print()
    print(
        "ERROR: Expected fc.1.weight "
        "was not found."
    )

    print()
    print("FC keys found:")

    for key in state_dict:

        if key.startswith("fc."):

            print(
                f"  {key}"
            )

    print()

    sys.exit(1)


output_classes = (
    state_dict[
        classifier_key
    ].shape[0]
)


if output_classes != len(CLASSES):

    print()
    print(
        "ERROR: Class count mismatch."
    )

    print(
        f"Model output classes : "
        f"{output_classes}"
    )

    print(
        f"Expected classes     : "
        f"{len(CLASSES)}"
    )

    sys.exit(1)


model.load_state_dict(
    state_dict,
    strict=True,
)


model = model.to(
    DEVICE
)

model.eval()


print(
    "✓ ResNet18 model loaded"
)

print(
    "✓ ImageNet pretrained backbone"
)

print(
    "✓ Fine-tuned classifier"
)

print(
    "✓ Dropout + Linear classifier"
)

print(
    f"✓ Output classes : "
    f"{output_classes}"
)


# ============================================================
# COLLECT DATASET
# ============================================================

print()
print("=" * 90)
print("COLLECTING EVALUATION DATASET")
print("=" * 90)

print()
print(
    "Searching inside:"
)

print(
    DATASET_DIR
)

print()
print(
    "⚠ *_mask.png files will be excluded"
)


valid_extensions = {
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".webp",
}


samples = []

class_counts = {
    class_name: 0
    for class_name in CLASSES
}


excluded_masks = 0


# ============================================================
# DATA COLLECTION
# ============================================================

for image_path in sorted(
    DATASET_DIR.rglob("*")
):

    if not image_path.is_file():
        continue


    # --------------------------------------------------------
    # Extension check
    # --------------------------------------------------------

    if (
        image_path.suffix.lower()
        not in valid_extensions
    ):
        continue


    # --------------------------------------------------------
    # CRITICAL:
    # Ignore MVTec segmentation masks.
    # --------------------------------------------------------

    if image_path.stem.lower().endswith(
        "_mask"
    ):

        excluded_masks += 1
        continue


    # --------------------------------------------------------
    # Determine class from parent folders
    # --------------------------------------------------------

    class_name = None


    for parent in image_path.parents:

        parent_name = (
            parent.name.lower()
        )

        if parent_name in CLASS_TO_INDEX:

            class_name = parent_name
            break


        if parent == DATASET_DIR:

            break


    if class_name is None:
        continue


    class_index = (
        CLASS_TO_INDEX[
            class_name
        ]
    )


    samples.append(
        (
            image_path,
            class_index,
        )
    )


    class_counts[
        class_name
    ] += 1


# ============================================================
# DATASET DISTRIBUTION
# ============================================================

print()
print("DATASET DISTRIBUTION")
print("-" * 60)


for class_name in CLASSES:

    print(
        f"{class_name:<35}"
        f"{class_counts[class_name]:>6}"
    )


print("-" * 60)


print(
    f"{'TOTAL VALID IMAGES':<35}"
    f"{len(samples):>6}"
)


print(
    f"{'MASKS EXCLUDED':<35}"
    f"{excluded_masks:>6}"
)


# ============================================================
# VERIFY DATASET
# ============================================================

if len(samples) == 0:

    print()
    print(
        "ERROR: No valid images found."
    )

    sys.exit(1)


print()
print(
    f"✓ Found {len(samples)} valid images"
)

print(
    f"✓ Excluded {excluded_masks} mask images"
)


# ============================================================
# RUN PREDICTIONS
# ============================================================

print()
print("=" * 90)
print("RUNNING PREDICTIONS")
print("=" * 90)


y_true = []

y_pred = []

confidences = []

errors = []


with torch.no_grad():

    for image_path, true_index in samples:

        try:

            image = (
                Image.open(
                    image_path
                )
                .convert("RGB")
            )


            tensor = transform(
                image
            )


            tensor = tensor.unsqueeze(
                0
            )


            tensor = tensor.to(
                DEVICE
            )


            output = model(
                tensor
            )


            probabilities = (
                torch.softmax(
                    output,
                    dim=1,
                )
            )


            confidence, prediction = (
                torch.max(
                    probabilities,
                    dim=1,
                )
            )


            predicted_index = (
                prediction.item()
            )


            confidence_value = (
                confidence.item()
                * 100
            )


            y_true.append(
                true_index
            )

            y_pred.append(
                predicted_index
            )

            confidences.append(
                confidence_value
            )


            if (
                predicted_index
                != true_index
            ):

                errors.append(
                    {
                        "file":
                            image_path.name,

                        "path":
                            str(image_path),

                        "actual":
                            CLASSES[
                                true_index
                            ],

                        "predicted":
                            CLASSES[
                                predicted_index
                            ],

                        "confidence":
                            confidence_value,
                    }
                )


        except Exception as exc:

            print()

            print(
                "⚠ Could not process:"
            )

            print(
                image_path
            )

            print(
                f"  Reason: {exc}"
            )


# ============================================================
# SAFETY CHECK
# ============================================================

if not y_true:

    print()
    print(
        "ERROR: No predictions produced."
    )

    sys.exit(1)


# ============================================================
# MULTI-CLASS METRICS
# ============================================================

accuracy = accuracy_score(
    y_true,
    y_pred,
)


macro_precision = precision_score(
    y_true,
    y_pred,
    average="macro",
    zero_division=0,
)


macro_recall = recall_score(
    y_true,
    y_pred,
    average="macro",
    zero_division=0,
)


macro_f1 = f1_score(
    y_true,
    y_pred,
    average="macro",
    zero_division=0,
)


# ============================================================
# GOOD VS DEFECTIVE
# ============================================================

binary_true = [
    0 if value == 0 else 1
    for value in y_true
]


binary_pred = [
    0 if value == 0 else 1
    for value in y_pred
]


binary_accuracy = accuracy_score(
    binary_true,
    binary_pred,
)


binary_precision = precision_score(
    binary_true,
    binary_pred,
    zero_division=0,
)


binary_recall = recall_score(
    binary_true,
    binary_pred,
    zero_division=0,
)


binary_f1 = f1_score(
    binary_true,
    binary_pred,
    zero_division=0,
)


# ============================================================
# RESULTS
# ============================================================

print()
print("=" * 90)
print("TRANSISTOR EVALUATION RESULTS")
print("=" * 90)


print(
    f"Dataset size       : "
    f"{len(y_true)}"
)


print()
print("MULTI-CLASS METRICS")
print("-" * 60)


print(
    f"Accuracy            : "
    f"{accuracy * 100:.2f}%"
)


print(
    f"Macro Precision     : "
    f"{macro_precision * 100:.2f}%"
)


print(
    f"Macro Recall        : "
    f"{macro_recall * 100:.2f}%"
)


print(
    f"Macro F1            : "
    f"{macro_f1 * 100:.2f}%"
)


# ============================================================
# BINARY METRICS
# ============================================================

print()
print("GOOD VS DEFECTIVE")
print("-" * 60)


print(
    f"Accuracy            : "
    f"{binary_accuracy * 100:.2f}%"
)


print(
    f"Precision           : "
    f"{binary_precision * 100:.2f}%"
)


print(
    f"Recall              : "
    f"{binary_recall * 100:.2f}%"
)


print(
    f"F1 Score            : "
    f"{binary_f1 * 100:.2f}%"
)


# ============================================================
# PER-CLASS PERFORMANCE
# ============================================================

print()
print("=" * 90)
print("PER-CLASS PERFORMANCE")
print("=" * 90)


report = classification_report(
    y_true,
    y_pred,
    labels=list(
        range(len(CLASSES))
    ),
    target_names=CLASSES,
    digits=4,
    zero_division=0,
)


print(report)


# ============================================================
# CONFUSION MATRIX
# ============================================================

cm = confusion_matrix(
    y_true,
    y_pred,
    labels=list(
        range(len(CLASSES))
    ),
)


print()
print("=" * 90)
print("CONFUSION MATRIX")
print("=" * 90)


header = (
    "Actual".ljust(22)
)


for class_name in CLASSES:

    header += (
        class_name[:12]
        .rjust(14)
    )


print(header)


for row_index, class_name in enumerate(
    CLASSES
):

    row = class_name.ljust(
        22
    )


    for column_index in range(
        len(CLASSES)
    ):

        row += str(
            cm[
                row_index
            ][
                column_index
            ]
        ).rjust(14)


    print(row)


# ============================================================
# ERROR ANALYSIS
# ============================================================

print()
print("=" * 90)
print("ERROR ANALYSIS")
print("=" * 90)


print(
    f"Total errors : "
    f"{len(errors)}"
)


print(
    f"Total correct: "
    f"{len(y_true) - len(errors)}"
)


if errors:

    print()
    print(
        "MISCLASSIFIED IMAGES"
    )

    print(
        "-" * 90
    )


    for error in errors:

        print(
            f"{error['file']:<18}"
            f"Actual: "
            f"{error['actual']:<18}"
            f"Predicted: "
            f"{error['predicted']:<18}"
            f"Confidence: "
            f"{error['confidence']:.2f}%"
        )


else:

    print()
    print(
        "✓ No classification errors!"
    )


# ============================================================
# CONFIDENCE
# ============================================================

average_confidence = (
    sum(confidences)
    / len(confidences)
)


print()
print("CONFIDENCE")
print("-" * 60)


print(
    f"Average confidence : "
    f"{average_confidence:.2f}%"
)


# ============================================================
# TARGET CHECK
# ============================================================

print()
print("=" * 90)
print("90% TARGET CHECK")
print("=" * 90)


targets = {

    "Multi-class Accuracy":
        accuracy,

    "Macro Precision":
        macro_precision,

    "Macro Recall":
        macro_recall,

    "Macro F1":
        macro_f1,

    "Binary Accuracy":
        binary_accuracy,

    "Binary Precision":
        binary_precision,

    "Binary Recall":
        binary_recall,

    "Binary F1":
        binary_f1,
}


all_passed = True


for metric_name, value in targets.items():

    passed = (
        value >= 0.90
    )


    if passed:

        symbol = "✓"
        status = "PASS"

    else:

        symbol = "✗"
        status = "FAIL"

        all_passed = False


    print(
        f"{symbol} "
        f"{metric_name:<25}"
        f"{value * 100:>7.2f}%"
        f"  {status}"
    )


# ============================================================
# MODEL INFORMATION
# ============================================================

print()
print("=" * 90)
print("MODEL INFORMATION")
print("=" * 90)


parameter_count = sum(
    parameter.numel()
    for parameter in model.parameters()
)


print(
    "Architecture        : ResNet18"
)

print(
    "Pretrained          : YES"
)

print(
    "ImageNet            : YES"
)

print(
    "Fine-tuned          : YES"
)

print(
    "Training from scratch: NO"
)

print(
    f"Parameters          : "
    f"{parameter_count:,}"
)

print(
    f"Model file          : "
    f"{MODEL_PATH}"
)


# ============================================================
# FINAL VERDICT
# ============================================================

print()
print("=" * 90)


if all_passed:

    print(
        "🎯 FINAL VERDICT"
    )

    print(
        "✓ TRANSISTOR MODEL "
        "PASSES ALL 90% TARGETS"
    )

else:

    print(
        "⚠ FINAL VERDICT"
    )

    print(
        "✗ TRANSISTOR MODEL "
        "DOES NOT MEET ALL 90% TARGETS"
    )


print("=" * 90)

print()

print(
    "TRANSISTOR RESNET18 "
    "EVALUATION COMPLETE"
)

print("=" * 90)

print()