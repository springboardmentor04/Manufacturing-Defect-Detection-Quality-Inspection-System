from pathlib import Path
import sys

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
)


# ============================================================
# VISIONINSPECT AI
# FINAL RESNET18 FULL DATASET EVALUATION
# ============================================================

IMAGE_SIZE = 224

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

BACKEND_DIR = Path(__file__).resolve().parents[2]

DATASET_DIR = (
    BACKEND_DIR
    / "dataset"
    / "mvtec_ad"
    / "cable"
)

MODEL_PATH = (
    BACKEND_DIR
    / "app"
    / "ai"
    / "saved_models"
    / "cable_resnet18.pth"
)


# ============================================================
# CLASS MAPPING
# ============================================================

CLASS_NAMES = [
    "good",
    "bent_wire",
    "cable_swap",
    "combined",
    "cut_inner_insulation",
    "cut_outer_insulation",
    "missing_cable",
    "missing_wire",
    "poke_insulation",
]


IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}


# ============================================================
# IMAGE TRANSFORM
# ============================================================

transform = transforms.Compose([
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
])


# ============================================================
# LOAD RESNET18
# ============================================================

def load_model():

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            f"\nModel checkpoint not found:\n"
            f"{MODEL_PATH}\n"
        )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=False,
    )

    model = models.resnet18(
        weights=None
    )

    in_features = model.fc.in_features

    model.fc = nn.Sequential(
        nn.Dropout(
            p=0.30
        ),

        nn.Linear(
            in_features,
            len(CLASS_NAMES),
        ),
    )

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    model = model.to(
        DEVICE
    )

    model.eval()

    return model, checkpoint


# ============================================================
# COLLECT DATASET
# ============================================================

def collect_dataset():

    samples = []

    # --------------------------------------------------------
    # GOOD
    # --------------------------------------------------------
    #
    # MVTec good images are stored in:
    #
    # dataset/mvtec_ad/cable/train/good
    #
    # --------------------------------------------------------

    good_dir = (
        DATASET_DIR
        / "train"
        / "good"
    )

    if good_dir.exists():

        for image_path in sorted(
            good_dir.iterdir()
        ):

            if (
                image_path.is_file()
                and image_path.suffix.lower()
                in IMAGE_EXTENSIONS
            ):

                samples.append(
                    (
                        image_path,
                        0,
                    )
                )


    # --------------------------------------------------------
    # DEFECT CLASSES
    # --------------------------------------------------------

    test_dir = (
        DATASET_DIR
        / "test"
    )

    for class_index, class_name in enumerate(
        CLASS_NAMES[1:],
        start=1,
    ):

        class_dir = (
            test_dir
            / class_name
        )

        if not class_dir.exists():

            continue

        for image_path in sorted(
            class_dir.iterdir()
        ):

            if (
                image_path.is_file()
                and image_path.suffix.lower()
                in IMAGE_EXTENSIONS
            ):

                samples.append(
                    (
                        image_path,
                        class_index,
                    )
                )

    return samples


# ============================================================
# PREDICT ONE IMAGE
# ============================================================

def predict_image(
    model,
    image_path,
):

    try:

        image = Image.open(
            image_path
        ).convert("RGB")

    except Exception as exc:

        raise RuntimeError(
            f"Could not read image "
            f"{image_path}: {exc}"
        )


    tensor = transform(
        image
    ).unsqueeze(0)

    tensor = tensor.to(
        DEVICE
    )


    with torch.no_grad():

        logits = model(
            tensor
        )

        probabilities = torch.softmax(
            logits,
            dim=1,
        )[0]


    prediction = int(
        torch.argmax(
            probabilities
        ).item()
    )

    confidence = float(
        probabilities[
            prediction
        ].item()
    )

    return (
        prediction,
        confidence,
    )


# ============================================================
# BINARY CONVERSION
# ============================================================

def convert_to_binary(
    labels
):

    return [
        0 if label == 0 else 1
        for label in labels
    ]


# ============================================================
# PRINT CLASS COUNTS
# ============================================================

def print_dataset_counts(
    samples
):

    counts = {
        name: 0
        for name in CLASS_NAMES
    }

    for _, label in samples:

        counts[
            CLASS_NAMES[label]
        ] += 1


    print()

    for name in CLASS_NAMES:

        print(
            f"{name:<35}: "
            f"{counts[name]}"
        )


# ============================================================
# MAIN
# ============================================================

def main():

    print()

    print("=" * 90)
    print(
        "VISIONINSPECT AI"
    )
    print(
        "FINAL RESNET18 FULL DATASET EVALUATION"
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


    # ========================================================
    # LOAD MODEL
    # ========================================================

    print()

    print(
        "Loading ResNet18..."
    )

    model, checkpoint = load_model()

    print(
        "✓ Model loaded successfully"
    )


    # ========================================================
    # DATASET
    # ========================================================

    samples = collect_dataset()

    if not samples:

        raise RuntimeError(
            "\nNo dataset images were found.\n"
        )


    print()

    print("=" * 90)
    print(
        "FULL DATASET"
    )
    print("=" * 90)

    print_dataset_counts(
        samples
    )

    print()

    print(
        f"TOTAL IMAGES : "
        f"{len(samples)}"
    )


    # ========================================================
    # INFERENCE
    # ========================================================

    print()

    print("=" * 90)
    print(
        "RUNNING INFERENCE"
    )
    print("=" * 90)


    y_true = []

    y_pred = []

    confidence_values = []

    errors = []


    total = len(
        samples
    )


    for index, (
        image_path,
        true_label,
    ) in enumerate(
        samples,
        start=1,
    ):

        try:

            (
                predicted_label,
                confidence,
            ) = predict_image(
                model,
                image_path,
            )

        except Exception as exc:

            print(
                f"\nERROR: "
                f"{image_path}"
            )

            print(
                exc
            )

            continue


        y_true.append(
            true_label
        )

        y_pred.append(
            predicted_label
        )

        confidence_values.append(
            confidence
        )


        # ----------------------------------------------------
        # ERROR
        # ----------------------------------------------------

        if (
            predicted_label
            != true_label
        ):

            errors.append(
                {
                    "file":
                        image_path.name,

                    "actual":
                        CLASS_NAMES[
                            true_label
                        ],

                    "predicted":
                        CLASS_NAMES[
                            predicted_label
                        ],

                    "confidence":
                        confidence,

                    "path":
                        str(image_path),
                }
            )


        if (
            index % 25 == 0
            or index == total
        ):

            print(
                f"Processed "
                f"{index}/{total}"
            )


    # ========================================================
    # SAFETY CHECK
    # ========================================================

    if not y_true:

        raise RuntimeError(
            "No images were successfully evaluated."
        )


    # ========================================================
    # MULTICLASS METRICS
    # ========================================================

    multiclass_accuracy = (
        accuracy_score(
            y_true,
            y_pred,
        )
    )


    (
        multiclass_precision,
        multiclass_recall,
        multiclass_f1,
        _,
    ) = precision_recall_fscore_support(
        y_true,
        y_pred,
        labels=list(
            range(
                len(CLASS_NAMES)
            )
        ),
        average="macro",
        zero_division=0,
    )


    # ========================================================
    # BINARY METRICS
    # ========================================================

    binary_true = (
        convert_to_binary(
            y_true
        )
    )

    binary_pred = (
        convert_to_binary(
            y_pred
        )
    )


    binary_accuracy = (
        accuracy_score(
            binary_true,
            binary_pred,
        )
    )


    (
        binary_precision,
        binary_recall,
        binary_f1,
        _,
    ) = precision_recall_fscore_support(
        binary_true,
        binary_pred,
        average="binary",
        zero_division=0,
    )


    # ========================================================
    # RESULTS
    # ========================================================

    print()

    print("=" * 90)
    print(
        "FINAL MULTICLASS RESULTS"
    )
    print("=" * 90)

    print(
        f"Accuracy        : "
        f"{multiclass_accuracy * 100:.2f}%"
    )

    print(
        f"Macro Precision : "
        f"{multiclass_precision * 100:.2f}%"
    )

    print(
        f"Macro Recall    : "
        f"{multiclass_recall * 100:.2f}%"
    )

    print(
        f"Macro F1        : "
        f"{multiclass_f1 * 100:.2f}%"
    )


    # ========================================================
    # BINARY
    # ========================================================

    print()

    print("=" * 90)
    print(
        "FINAL GOOD VS DEFECTIVE RESULTS"
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


    # ========================================================
    # CLASSIFICATION REPORT
    # ========================================================

    print()

    print("=" * 90)
    print(
        "PER-CLASS PERFORMANCE"
    )
    print("=" * 90)

    print(
        classification_report(
            y_true,
            y_pred,
            labels=list(
                range(
                    len(CLASS_NAMES)
                )
            ),
            target_names=CLASS_NAMES,
            digits=4,
            zero_division=0,
        )
    )


    # ========================================================
    # CONFUSION MATRIX
    # ========================================================

    cm = confusion_matrix(
        y_true,
        y_pred,
        labels=list(
            range(
                len(CLASS_NAMES)
            )
        ),
    )


    print()

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
        f"{'Actual':<30}"
        + "".join(
            f"{name[:8]:>10}"
            for name in CLASS_NAMES
        )
    )


    for row_index, row in enumerate(
        cm
    ):

        print(
            f"{CLASS_NAMES[row_index]:<30}"
            + "".join(
                f"{value:>10}"
                for value in row
            )
        )


    # ========================================================
    # ERROR ANALYSIS
    # ========================================================

    print()

    print("=" * 90)
    print(
        "ERROR ANALYSIS"
    )
    print("=" * 90)

    print(
        f"Correct predictions   : "
        f"{len(y_true) - len(errors)}"
    )

    print(
        f"Incorrect predictions : "
        f"{len(errors)}"
    )


    if errors:

        print()

        for error in errors:

            print(
                f"{error['file']:<12}"
                f"Actual={error['actual']:<30}"
                f"Predicted={error['predicted']:<30}"
                f"Confidence="
                f"{error['confidence'] * 100:.2f}%"
            )

    else:

        print()
        print(
            "✓ ZERO MISCLASSIFICATIONS"
        )


    # ========================================================
    # CONFIDENCE
    # ========================================================

    average_confidence = (
        sum(
            confidence_values
        )
        /
        len(
            confidence_values
        )
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


    # ========================================================
    # TARGET
    # ========================================================

    print()

    print("=" * 90)
    print(
        "90% TARGET CHECK"
    )
    print("=" * 90)


    if (
        binary_accuracy >= 0.90
        and binary_f1 >= 0.90
    ):

        print(
            "✓ GOOD VS DEFECTIVE: "
            "90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠ GOOD VS DEFECTIVE: "
            "90% TARGET NOT ACHIEVED"
        )


    if (
        multiclass_accuracy >= 0.90
        and multiclass_f1 >= 0.90
    ):

        print(
            "✓ DEFECT TYPE: "
            "90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠ DEFECT TYPE: "
            "90% TARGET NOT ACHIEVED"
        )


    # ========================================================
    # MODEL INFORMATION
    # ========================================================

    print()

    print("=" * 90)
    print(
        "MODEL INFORMATION"
    )
    print("=" * 90)

    print(
        f"Architecture : "
        f"{checkpoint.get('architecture', 'N/A')}"
    )

    print(
        f"Pretrained   : "
        f"{checkpoint.get('pretrained', 'N/A')}"
    )

    print(
        f"ImageNet     : "
        f"{checkpoint.get('imagenet', 'N/A')}"
    )

    print(
        f"Fine-tuned   : "
        f"{checkpoint.get('fine_tuned', 'N/A')}"
    )

    print(
        f"Best epoch   : "
        f"{checkpoint.get('best_epoch', 'N/A')}"
    )


    # ========================================================
    # FINAL VERDICT
    # ========================================================

    print()

    print("=" * 90)
    print(
        "FINAL BACKEND VERDICT"
    )
    print("=" * 90)


    if (
        binary_accuracy >= 0.90
        and binary_f1 >= 0.90
        and multiclass_accuracy >= 0.90
        and multiclass_f1 >= 0.90
    ):

        print(
            "✓ RESNET18 BACKEND PASSES"
        )

        print(
            "✓ DEFECT DETECTION TARGET PASSED"
        )

        print(
            "✓ DEFECT TYPE TARGET PASSED"
        )

    else:

        print(
            "⚠ RESNET18 BACKEND REQUIRES IMPROVEMENT"
        )


    print()

    print("=" * 90)
    print(
        "EVALUATION COMPLETE"
    )
    print("=" * 90)

    print()


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()