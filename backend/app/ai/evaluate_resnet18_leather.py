"""
VisionInspect AI
Leather ResNet18 Evaluation
"""

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
    classification_report,
    confusion_matrix,
)


# ============================================================================
# CONFIGURATION
# ============================================================================

CATEGORY = "leather"

BASE_DIR = Path(__file__).resolve().parents[2]

DATASET_DIR = (
    BASE_DIR
    / "dataset"
    / "mvtec_ad"
    / CATEGORY
)

MODEL_PATH = (
    BASE_DIR
    / "app"
    / "ai"
    / "saved_models"
    / f"{CATEGORY}_resnet18.pth"
)

IMAGE_SIZE = 224

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================================
# CLASSES
# ============================================================================

CLASS_NAMES = [
    "good",
    "color",
    "cut",
    "fold",
    "glue",
    "poke",
]


# ============================================================================
# TRANSFORM
# ============================================================================

TRANSFORM = transforms.Compose(
    [
        transforms.Resize(
            (IMAGE_SIZE, IMAGE_SIZE)
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


# ============================================================================
# MODEL
# ============================================================================

def build_model():

    model = models.resnet18(
        weights=None
    )

    # Actual Leather checkpoint contains:
    #
    # fc.1.weight
    # fc.1.bias
    #
    # Therefore recreate the classifier with
    # Dropout followed by Linear.

    model.fc = nn.Sequential(
        nn.Dropout(
            p=0.30
        ),

        nn.Linear(
            model.fc.in_features,
            len(CLASS_NAMES),
        ),
    )

    return model


# ============================================================================
# CHECKPOINT
# ============================================================================

def extract_state_dict(checkpoint):

    if isinstance(
        checkpoint,
        dict
    ):

        if "model_state_dict" in checkpoint:
            return checkpoint["model_state_dict"]

        if "state_dict" in checkpoint:
            return checkpoint["state_dict"]

        if "model" in checkpoint:
            return checkpoint["model"]

    return checkpoint


# ============================================================================
# DATASET
# ============================================================================

def collect_images():

    samples = []

    test_dir = (
        DATASET_DIR
        / "test"
    )

    for class_name in CLASS_NAMES:

        class_dir = (
            test_dir
            / class_name
        )

        if not class_dir.exists():
            print(
                f"WARNING: Missing directory: "
                f"{class_dir}"
            )
            continue

        for image_path in sorted(
            class_dir.iterdir()
        ):

            if image_path.suffix.lower() in [
                ".png",
                ".jpg",
                ".jpeg",
                ".bmp",
                ".webp",
            ]:

                samples.append(
                    (
                        image_path,
                        class_name,
                    )
                )

    return samples


# ============================================================================
# MAIN
# ============================================================================

def main():

    print()
    print("=" * 90)
    print(
        "VISIONINSPECT AI"
    )
    print(
        "LEATHER RESNET18 EVALUATION"
    )
    print("=" * 90)

    print(
        f"Device       : {DEVICE}"
    )

    print(
        "Architecture : ResNet18"
    )

    print(
        "Backbone     : ImageNet"
    )

    print(
        "Training     : Fine-tuned"
    )

    print("=" * 90)

    # ------------------------------------------------------------------------
    # LOAD MODEL
    # ------------------------------------------------------------------------

    print()
    print(
        "Loading Leather ResNet18..."
    )

    model = build_model()

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=False,
    )

    state_dict = extract_state_dict(
        checkpoint
    )

    print()
    print(
        "Checkpoint classifier keys:"
    )

    for key in state_dict.keys():

        if key.startswith("fc."):
            print(
                f"  {key}"
            )

    # ------------------------------------------------------------------------
    # LOAD WEIGHTS
    # ------------------------------------------------------------------------

    missing, unexpected = model.load_state_dict(
        state_dict,
        strict=False,
    )

    if missing:
        print()
        print(
            "Missing keys:"
        )

        for key in missing:
            print(
                f"  {key}"
            )

    if unexpected:
        print()
        print(
            "Unexpected keys:"
        )

        for key in unexpected:
            print(
                f"  {key}"
            )

    if missing or unexpected:

        print()
        print(
            "ERROR: Checkpoint still does not "
            "match the evaluator architecture."
        )

        return

    print()
    print(
        "✓ Model loaded successfully"
    )

    print(
        "✓ Exact Leather checkpoint architecture matched"
    )

    # ------------------------------------------------------------------------
    # MODEL INFO
    # ------------------------------------------------------------------------

    print()
    print(
        "MODEL INFORMATION"
    )
    print("-" * 60)

    print(
        "Architecture : resnet18"
    )

    print(
        "Pretrained   : True"
    )

    print(
        "ImageNet     : True"
    )

    print(
        "Fine-tuned   : True"
    )

    print(
        f"Model path   : {MODEL_PATH}"
    )

    # ------------------------------------------------------------------------
    # DATASET
    # ------------------------------------------------------------------------

    samples = collect_images()

    print()
    print("=" * 90)
    print(
        "EVALUATION DATASET"
    )
    print("=" * 90)

    class_counts = {
        name: 0
        for name in CLASS_NAMES
    }

    for _, label in samples:
        class_counts[label] += 1

    for name in CLASS_NAMES:

        print(
            f"{name:<35}: "
            f"{class_counts[name]}"
        )

    print()
    print(
        f"TOTAL IMAGES : {len(samples)}"
    )

    if len(samples) == 0:

        print()
        print(
            "ERROR: No evaluation images found."
        )

        return

    # ------------------------------------------------------------------------
    # INFERENCE
    # ------------------------------------------------------------------------

    print()
    print("=" * 90)
    print(
        "RUNNING INFERENCE"
    )
    print("=" * 90)

    model.to(DEVICE)
    model.eval()

    true_labels = []
    predicted_labels = []
    confidences = []

    with torch.no_grad():

        for index, (
            image_path,
            actual_class,
        ) in enumerate(
            samples,
            start=1,
        ):

            try:

                image = Image.open(
                    image_path
                ).convert("RGB")

                image = TRANSFORM(
                    image
                )

                image = image.unsqueeze(
                    0
                ).to(DEVICE)

                outputs = model(
                    image
                )

                probabilities = torch.softmax(
                    outputs,
                    dim=1,
                )

                confidence, prediction = torch.max(
                    probabilities,
                    dim=1,
                )

                predicted_class = CLASS_NAMES[
                    prediction.item()
                ]

                true_labels.append(
                    actual_class
                )

                predicted_labels.append(
                    predicted_class
                )

                confidences.append(
                    confidence.item()
                )

                if (
                    index % 8 == 0
                    or index == len(samples)
                ):

                    print(
                        f"Processed "
                        f"{index}/{len(samples)}"
                    )

            except Exception as error:

                print()
                print(
                    f"ERROR processing "
                    f"{image_path.name}: "
                    f"{error}"
                )

    # ------------------------------------------------------------------------
    # METRICS
    # ------------------------------------------------------------------------

    accuracy = accuracy_score(
        true_labels,
        predicted_labels,
    )

    precision = precision_score(
        true_labels,
        predicted_labels,
        labels=CLASS_NAMES,
        average="macro",
        zero_division=0,
    )

    recall = recall_score(
        true_labels,
        predicted_labels,
        labels=CLASS_NAMES,
        average="macro",
        zero_division=0,
    )

    f1 = f1_score(
        true_labels,
        predicted_labels,
        labels=CLASS_NAMES,
        average="macro",
        zero_division=0,
    )

    print()
    print("=" * 90)
    print(
        "FINAL MULTICLASS RESULTS"
    )
    print("=" * 90)

    print(
        f"Accuracy        : {accuracy * 100:.2f}%"
    )

    print(
        f"Macro Precision : {precision * 100:.2f}%"
    )

    print(
        f"Macro Recall    : {recall * 100:.2f}%"
    )

    print(
        f"Macro F1        : {f1 * 100:.2f}%"
    )

    # ------------------------------------------------------------------------
    # GOOD VS DEFECTIVE
    # ------------------------------------------------------------------------

    binary_true = [
        0 if label == "good" else 1
        for label in true_labels
    ]

    binary_pred = [
        0 if label == "good" else 1
        for label in predicted_labels
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

    print()
    print("=" * 90)
    print(
        "GOOD VS DEFECTIVE RESULTS"
    )
    print("=" * 90)

    print(
        f"Accuracy   : {binary_accuracy * 100:.2f}%"
    )

    print(
        f"Precision  : {binary_precision * 100:.2f}%"
    )

    print(
        f"Recall     : {binary_recall * 100:.2f}%"
    )

    print(
        f"F1         : {binary_f1 * 100:.2f}%"
    )

    # ------------------------------------------------------------------------
    # CLASSIFICATION REPORT
    # ------------------------------------------------------------------------

    print()
    print("=" * 90)
    print(
        "PER-CLASS PERFORMANCE"
    )
    print("=" * 90)

    print(
        classification_report(
            true_labels,
            predicted_labels,
            labels=CLASS_NAMES,
            target_names=CLASS_NAMES,
            digits=4,
            zero_division=0,
        )
    )

    # ------------------------------------------------------------------------
    # CONFUSION MATRIX
    # ------------------------------------------------------------------------

    matrix = confusion_matrix(
        true_labels,
        predicted_labels,
        labels=CLASS_NAMES,
    )

    print("=" * 90)
    print(
        "CONFUSION MATRIX"
    )
    print("=" * 90)

    print(
        "Rows = Actual"
    )

    print(
        "Columns = Predicted"
    )

    header = (
        "Actual".ljust(30)
        + " ".join(
            name[:10].rjust(12)
            for name in CLASS_NAMES
        )
    )

    print()
    print(header)

    for index, row in enumerate(matrix):

        row_text = (
            CLASS_NAMES[index].ljust(30)
        )

        row_text += " ".join(
            str(value).rjust(12)
            for value in row
        )

        print(
            row_text
        )

    # ------------------------------------------------------------------------
    # CONFIDENCE
    # ------------------------------------------------------------------------

    average_confidence = (
        sum(confidences)
        / len(confidences)
    )

    print()
    print("=" * 90)
    print(
        "CONFIDENCE ANALYSIS"
    )
    print("=" * 90)

    print(
        f"Average confidence : "
        f"{average_confidence * 100:.2f}%"
    )

    # ------------------------------------------------------------------------
    # TARGET
    # ------------------------------------------------------------------------

    print()
    print("=" * 90)
    print(
        "90% TARGET CHECK"
    )
    print("=" * 90)

    if binary_f1 >= 0.90:
        print(
            "✓ GOOD VS DEFECTIVE: "
            "90% TARGET ACHIEVED"
        )
    else:
        print(
            "⚠ GOOD VS DEFECTIVE: "
            "90% TARGET NOT ACHIEVED"
        )

    if f1 >= 0.90:
        print(
            "✓ DEFECT TYPE: "
            "90% TARGET ACHIEVED"
        )
    else:
        print(
            "⚠ DEFECT TYPE: "
            "90% TARGET NOT ACHIEVED"
        )

    if f1 >= 0.90:
        print(
            "✓ MACRO F1: "
            "90% TARGET ACHIEVED"
        )
    else:
        print(
            "⚠ MACRO F1: "
            "90% TARGET NOT ACHIEVED"
        )

    print()
    print("=" * 90)
    print(
        "FINAL LEATHER BACKEND VERDICT"
    )
    print("=" * 90)

    if (
        binary_f1 >= 0.90
        and f1 >= 0.90
    ):

        print(
            "✓ LEATHER RESNET18 "
            "MEETS ALL TARGETS"
        )

    else:

        print(
            "⚠ LEATHER RESNET18 "
            "DOES NOT YET MEET ALL TARGETS"
        )

    print()
    print(
        "MODEL PARAMETERS : "
        f"{sum(p.numel() for p in model.parameters()):,}"
    )

    print()
    print("=" * 90)
    print(
        "LEATHER EVALUATION COMPLETE"
    )
    print("=" * 90)


if __name__ == "__main__":
    main()