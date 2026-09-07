"""
VisionInspect AI
Screw ResNet18 Evaluation

Classes:
    good
    manipulated_front
    scratch_head
    scratch_neck
    thread_side
    thread_top
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

CATEGORY = "screw"

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
# CLASS ORDER
# ============================================================================

CLASS_NAMES = [
    "good",
    "manipulated_front",
    "scratch_head",
    "scratch_neck",
    "thread_side",
    "thread_top",
]


# ============================================================================
# IMAGE TRANSFORM
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

    # The trained category models use:
    #
    # fc.0 = Dropout
    # fc.1 = Linear
    #
    # ResNet18 feature size = 512
    # Screw classes = 6

    model.fc = nn.Sequential(
        nn.Dropout(
            p=0.30
        ),

        nn.Linear(
            512,
            len(CLASS_NAMES),
        ),
    )

    return model


# ============================================================================
# CHECKPOINT EXTRACTION
# ============================================================================

def extract_state_dict(checkpoint):

    if isinstance(
        checkpoint,
        dict
    ):

        if "model_state_dict" in checkpoint:

            return checkpoint[
                "model_state_dict"
            ]

        if "state_dict" in checkpoint:

            return checkpoint[
                "state_dict"
            ]

        if "model" in checkpoint:

            return checkpoint[
                "model"
            ]

    return checkpoint


# ============================================================================
# LOAD MODEL
# ============================================================================

def load_model():

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            "\nScrew model not found:\n"
            f"{MODEL_PATH}\n"
        )

    print(
        "Loading Screw ResNet18..."
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

    # Remove DataParallel prefix
    cleaned_state_dict = {}

    for key, value in state_dict.items():

        if key.startswith("module."):

            key = key[
                len("module.") :
            ]

        cleaned_state_dict[
            key
        ] = value

    state_dict = cleaned_state_dict

    # ------------------------------------------------------------------------
    # Verify classifier architecture
    # ------------------------------------------------------------------------

    if "fc.1.weight" not in state_dict:

        raise RuntimeError(
            "\nScrew checkpoint architecture mismatch.\n\n"
            "Expected:\n"
            "  fc.0 = Dropout\n"
            "  fc.1 = Linear(512, 6)\n"
        )

    actual_shape = tuple(
        state_dict[
            "fc.1.weight"
        ].shape
    )

    expected_shape = (
        len(CLASS_NAMES),
        512,
    )

    if actual_shape != expected_shape:

        raise RuntimeError(
            "\nScrew classifier shape mismatch.\n"
            f"Expected : {expected_shape}\n"
            f"Found    : {actual_shape}"
        )

    # ------------------------------------------------------------------------
    # Load checkpoint
    # ------------------------------------------------------------------------

    missing, unexpected = (
        model.load_state_dict(
            state_dict,
            strict=False,
        )
    )

    if missing:

        print(
            "\nMissing keys:"
        )

        for key in missing:

            print(
                f"  {key}"
            )

    if unexpected:

        print(
            "\nUnexpected keys:"
        )

        for key in unexpected:

            print(
                f"  {key}"
            )

    if missing or unexpected:

        raise RuntimeError(
            "\nCheckpoint does not exactly "
            "match the expected Screw architecture."
        )

    model.to(
        DEVICE
    )

    model.eval()

    print()
    print(
        "✓ Model loaded successfully"
    )

    print(
        "✓ ResNet18 architecture matched"
    )

    print(
        "✓ Dropout + Linear classifier confirmed"
    )

    return model


# ============================================================================
# COLLECT EVALUATION IMAGES
# ============================================================================

def collect_images():

    samples = []

    test_dir = (
        DATASET_DIR
        / "test"
    )

    if not test_dir.exists():

        raise FileNotFoundError(
            "\nEvaluation directory not found:\n"
            f"{test_dir}"
        )

    for class_name in CLASS_NAMES:

        class_dir = (
            test_dir
            / class_name
        )

        if not class_dir.exists():

            print(
                f"WARNING: Missing directory:\n"
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
        "SCREW RESNET18 EVALUATION"
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

    print(
        "Classes      : 6"
    )

    print("=" * 90)

    # =========================================================================
    # LOAD MODEL
    # =========================================================================

    model = load_model()

    # =========================================================================
    # MODEL INFORMATION
    # =========================================================================

    print()
    print(
        "MODEL INFORMATION"
    )

    print("-" * 60)

    print(
        "Architecture          : ResNet18"
    )

    print(
        "Pretrained            : YES"
    )

    print(
        "ImageNet              : YES"
    )

    print(
        "Fine-tuned            : YES"
    )

    print(
        "Training from scratch : NO"
    )

    print(
        f"Model path            : {MODEL_PATH}"
    )

    print(
        "Classes               : "
        + ", ".join(CLASS_NAMES)
    )

    print(
        "Parameters            : "
        f"{sum(p.numel() for p in model.parameters()):,}"
    )

    # =========================================================================
    # DATASET
    # =========================================================================

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

        class_counts[
            label
        ] += 1

    for class_name in CLASS_NAMES:

        print(
            f"{class_name:<35} : "
            f"{class_counts[class_name]}"
        )

    print(
        "-" * 60
    )

    print(
        f"TOTAL IMAGES : "
        f"{len(samples)}"
    )

    if not samples:

        print(
            "\nERROR: No evaluation images found."
        )

        return

    # =========================================================================
    # INFERENCE
    # =========================================================================

    print()
    print("=" * 90)
    print(
        "RUNNING INFERENCE"
    )
    print("=" * 90)

    true_labels = []

    predicted_labels = []

    confidences = []

    errors = []

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
                ).convert(
                    "RGB"
                )

                image_tensor = TRANSFORM(
                    image
                )

                image_tensor = (
                    image_tensor
                    .unsqueeze(0)
                    .to(DEVICE)
                )

                outputs = model(
                    image_tensor
                )

                probabilities = (
                    torch.softmax(
                        outputs,
                        dim=1,
                    )
                )

                confidence, prediction = (
                    torch.max(
                        probabilities,
                        dim=1,
                    )
                )

                predicted_class = (
                    CLASS_NAMES[
                        prediction.item()
                    ]
                )

                confidence_value = (
                    confidence.item()
                )

                true_labels.append(
                    actual_class
                )

                predicted_labels.append(
                    predicted_class
                )

                confidences.append(
                    confidence_value
                )

                if (
                    predicted_class
                    != actual_class
                ):

                    errors.append(
                        {
                            "filename":
                                image_path.name,

                            "actual":
                                actual_class,

                            "predicted":
                                predicted_class,

                            "confidence":
                                confidence_value,
                        }
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

                print(
                    f"\nERROR processing "
                    f"{image_path.name}: "
                    f"{error}"
                )

    # =========================================================================
    # MULTICLASS METRICS
    # =========================================================================

    accuracy = accuracy_score(
        true_labels,
        predicted_labels,
    )

    macro_precision = precision_score(
        true_labels,
        predicted_labels,
        labels=CLASS_NAMES,
        average="macro",
        zero_division=0,
    )

    macro_recall = recall_score(
        true_labels,
        predicted_labels,
        labels=CLASS_NAMES,
        average="macro",
        zero_division=0,
    )

    macro_f1 = f1_score(
        true_labels,
        predicted_labels,
        labels=CLASS_NAMES,
        average="macro",
        zero_division=0,
    )

    # =========================================================================
    # MULTICLASS RESULTS
    # =========================================================================

    print()
    print("=" * 90)
    print(
        "FINAL MULTICLASS RESULTS"
    )
    print("=" * 90)

    print(
        f"Accuracy        : "
        f"{accuracy * 100:.2f}%"
    )

    print(
        f"Macro Precision : "
        f"{macro_precision * 100:.2f}%"
    )

    print(
        f"Macro Recall    : "
        f"{macro_recall * 100:.2f}%"
    )

    print(
        f"Macro F1        : "
        f"{macro_f1 * 100:.2f}%"
    )

    # =========================================================================
    # GOOD VS DEFECTIVE
    # ==========================================================================

    binary_true = [
        0 if label == "good"
        else 1
        for label in true_labels
    ]

    binary_pred = [
        0 if label == "good"
        else 1
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
        f"Accuracy   : "
        f"{binary_accuracy * 100:.2f}%"
    )

    print(
        f"Precision  : "
        f"{binary_precision * 100:.2f}%"
    )

    print(
        f"Recall     : "
        f"{binary_recall * 100:.2f}%"
    )

    print(
        f"F1         : "
        f"{binary_f1 * 100:.2f}%"
    )

    # =========================================================================
    # PER CLASS REPORT
    # =========================================================================

    print()
    print("=" * 90)
    print(
        "PER-CLASS PERFORMANCE"
    )
    print("=" * 90)

    report = classification_report(
        true_labels,
        predicted_labels,
        labels=CLASS_NAMES,
        target_names=CLASS_NAMES,
        digits=4,
        zero_division=0,
    )

    print(
        report
    )

    # =========================================================================
    # CONFUSION MATRIX
    # =========================================================================

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

    print()

    print(
        "Actual".ljust(25)
        + "".join(
            name[:10].rjust(14)
            for name in CLASS_NAMES
        )
    )

    for row_index, row in enumerate(
        matrix
    ):

        row_text = (
            CLASS_NAMES[
                row_index
            ].ljust(25)
        )

        row_text += "".join(
            str(value).rjust(14)
            for value in row
        )

        print(
            row_text
        )

    # =========================================================================
    # ERROR ANALYSIS
    # =========================================================================

    correct = sum(
        actual == predicted
        for actual, predicted
        in zip(
            true_labels,
            predicted_labels,
        )
    )

    incorrect = (
        len(true_labels)
        - correct
    )

    print()
    print("=" * 90)
    print(
        "ERROR ANALYSIS"
    )
    print("=" * 90)

    print(
        f"Correct predictions   : "
        f"{correct}"
    )

    print(
        f"Incorrect predictions : "
        f"{incorrect}"
    )

    if errors:

        print()

        for error in errors:

            print(
                f"{error['filename']:<15}"
                f"Actual={error['actual']:<22}"
                f"Predicted={error['predicted']:<22}"
                f"Confidence="
                f"{error['confidence'] * 100:.2f}%"
            )

    else:

        print()
        print(
            "✓ No incorrect predictions"
        )

    # =========================================================================
    # CONFIDENCE
    # =========================================================================

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

    # =========================================================================
    # TARGET CHECK
    # =========================================================================

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

    if accuracy >= 0.90:

        print(
            "✓ DEFECT TYPE ACCURACY: "
            "90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠ DEFECT TYPE ACCURACY: "
            "90% TARGET NOT ACHIEVED"
        )

    if macro_f1 >= 0.90:

        print(
            "✓ MACRO F1: "
            "90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠ MACRO F1: "
            "90% TARGET NOT ACHIEVED"
        )

    # =========================================================================
    # FINAL VERDICT
    # =========================================================================

    print()
    print("=" * 90)
    print(
        "FINAL SCREW RESNET18 VERDICT"
    )
    print("=" * 90)

    if (
        binary_f1 >= 0.90
        and accuracy >= 0.90
        and macro_f1 >= 0.90
    ):

        print(
            "✓ SCREW RESNET18 PASSES"
        )

        print(
            "✓ DEFECT DETECTION TARGET PASSED"
        )

        print(
            "✓ DEFECT TYPE TARGET PASSED"
        )

        print(
            "✓ MACRO F1 TARGET PASSED"
        )

    else:

        print(
            "⚠ SCREW RESNET18 "
            "DOES NOT YET MEET ALL TARGETS"
        )

    print()
    print("=" * 90)
    print(
        "SCREW EVALUATION COMPLETE"
    )
    print("=" * 90)


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":

    main()

    