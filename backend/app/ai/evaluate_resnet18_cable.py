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
# CONFIG
# ============================================================

IMAGE_SIZE = 224
BATCH_SIZE = 16

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
# TRANSFORM
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
            0.406
        ],
        std=[
            0.229,
            0.224,
            0.225
        ]
    ),
])


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            f"Model not found:\n{MODEL_PATH}"
        )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=False
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
            len(CLASS_NAMES)
        )
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
# COLLECT TEST IMAGES
# ============================================================

def collect_images():

    samples = []

    test_dir = DATASET_DIR / "test"

    # --------------------------------------------------------
    # GOOD
    # --------------------------------------------------------
    #
    # MVTec normally stores good training images under
    # train/good, so we deliberately do NOT mix them into
    # this independent defect test.
    #
    # For evaluation we use:
    #
    #   test/<defect>
    #
    # for defect recognition.
    #
    # --------------------------------------------------------

    for class_index, class_name in enumerate(
        CLASS_NAMES
    ):

        if class_name == "good":
            continue

        class_dir = (
            test_dir / class_name
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
                        class_index
                    )
                )

    return samples


# ============================================================
# PREDICTION
# ============================================================

def predict_image(
    model,
    image_path
):

    image = Image.open(
        image_path
    ).convert("RGB")

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
            dim=1
        )

    prediction = int(
        torch.argmax(
            probabilities,
            dim=1
        ).item()
    )

    confidence = float(
        probabilities[
            0,
            prediction
        ].item()
    )

    return (
        prediction,
        confidence,
        probabilities[0].cpu().numpy()
    )


# ============================================================
# BINARY METRICS
# ============================================================

def binary_metrics(
    true_labels,
    predicted_labels
):

    binary_true = [
        0 if x == 0 else 1
        for x in true_labels
    ]

    binary_pred = [
        0 if x == 0 else 1
        for x in predicted_labels
    ]

    accuracy = accuracy_score(
        binary_true,
        binary_pred
    )

    precision, recall, f1, _ = (
        precision_recall_fscore_support(
            binary_true,
            binary_pred,
            average="binary",
            zero_division=0
        )
    )

    return (
        accuracy,
        precision,
        recall,
        f1
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 90)
    print("VISIONINSPECT AI")
    print("RESNET18 CABLE EVALUATION")
    print("=" * 90)

    print(
        f"Device       : {DEVICE}"
    )

    print(
        "Architecture : ResNet18"
    )

    print(
        "Pretrained   : ImageNet"
    )

    print(
        "Training     : Fine-tuned"
    )

    print("=" * 90)


    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    print()
    print(
        "Loading model..."
    )

    model, checkpoint = load_model()

    print(
        "✓ Model loaded"
    )


    # --------------------------------------------------------
    # DATA
    # --------------------------------------------------------

    samples = collect_images()

    if not samples:

        raise RuntimeError(
            "No test images found."
        )


    print()
    print("=" * 90)
    print("TEST DATASET")
    print("=" * 90)

    counts = {
        name: 0
        for name in CLASS_NAMES
    }

    for _, label in samples:

        counts[
            CLASS_NAMES[label]
        ] += 1

    for name in CLASS_NAMES:

        print(
            f"{name:<32}: "
            f"{counts[name]}"
        )

    print()
    print(
        f"Total defect images: "
        f"{len(samples)}"
    )


    # --------------------------------------------------------
    # INFERENCE
    # --------------------------------------------------------

    print()
    print("=" * 90)
    print("RUNNING INFERENCE")
    print("=" * 90)

    y_true = []

    y_pred = []

    confidences = []

    errors = []


    for index, (
        image_path,
        true_label
    ) in enumerate(
        samples,
        start=1
    ):

        (
            predicted_label,
            confidence,
            probabilities
        ) = predict_image(
            model,
            image_path
        )

        y_true.append(
            true_label
        )

        y_pred.append(
            predicted_label
        )

        confidences.append(
            confidence
        )


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
                        str(image_path)
                }
            )


        if index % 25 == 0:

            print(
                f"Processed "
                f"{index}/{len(samples)}"
            )


    # ========================================================
    # MULTICLASS METRICS
    # ========================================================

    accuracy = accuracy_score(
        y_true,
        y_pred
    )

    precision, recall, f1, _ = (
        precision_recall_fscore_support(
            y_true,
            y_pred,
            labels=list(
                range(1, len(CLASS_NAMES))
            ),
            average="macro",
            zero_division=0
        )
    )


    # ========================================================
    # BINARY METRICS
    # ========================================================

    (
        binary_accuracy,
        binary_precision,
        binary_recall,
        binary_f1
    ) = binary_metrics(
        y_true,
        y_pred
    )


    # ========================================================
    # RESULTS
    # ========================================================

    print()
    print("=" * 90)
    print("MULTICLASS DEFECT RESULTS")
    print("=" * 90)

    print(
        f"Accuracy       : "
        f"{accuracy * 100:.2f}%"
    )

    print(
        f"Macro Precision: "
        f"{precision * 100:.2f}%"
    )

    print(
        f"Macro Recall   : "
        f"{recall * 100:.2f}%"
    )

    print(
        f"Macro F1       : "
        f"{f1 * 100:.2f}%"
    )


    # ========================================================
    # BINARY RESULTS
    # ========================================================

    print()
    print("=" * 90)
    print("BINARY DEFECT DETECTION")
    print("=" * 90)

    print(
        f"Accuracy       : "
        f"{binary_accuracy * 100:.2f}%"
    )

    print(
        f"Precision      : "
        f"{binary_precision * 100:.2f}%"
    )

    print(
        f"Recall         : "
        f"{binary_recall * 100:.2f}%"
    )

    print(
        f"F1             : "
        f"{binary_f1 * 100:.2f}%"
    )


    # ========================================================
    # CLASSIFICATION REPORT
    # ========================================================

    print()
    print("=" * 90)
    print("PER-CLASS REPORT")
    print("=" * 90)

    print(
        classification_report(
            y_true,
            y_pred,
            labels=list(
                range(1, len(CLASS_NAMES))
            ),
            target_names=CLASS_NAMES[1:],
            digits=4,
            zero_division=0
        )
    )


    # ========================================================
    # CONFUSION MATRIX
    # ========================================================

    cm = confusion_matrix(
        y_true,
        y_pred,
        labels=list(
            range(1, len(CLASS_NAMES))
        )
    )


    print()
    print("=" * 90)
    print("CONFUSION MATRIX")
    print("=" * 90)

    print(
        "Rows = Actual"
    )

    print(
        "Columns = Predicted"
    )

    print()

    print(
        f"{'':<25}"
        +
        "".join(
            f"{name[:8]:>10}"
            for name in CLASS_NAMES[1:]
        )
    )


    for i, row in enumerate(cm):

        print(
            f"{CLASS_NAMES[i + 1]:<25}"
            +
            "".join(
                f"{value:>10}"
                for value in row
            )
        )


    # ========================================================
    # ERRORS
    # ========================================================

    print()
    print("=" * 90)
    print("ERROR ANALYSIS")
    print("=" * 90)

    print(
        f"Incorrect predictions: "
        f"{len(errors)}"
    )

    print(
        f"Correct predictions  : "
        f"{len(samples) - len(errors)}"
    )


    if errors:

        print()

        for error in errors:

            print(
                f"{error['file']:<12} "
                f"Actual={error['actual']:<28} "
                f"Predicted={error['predicted']:<28} "
                f"Confidence="
                f"{error['confidence'] * 100:.2f}%"
            )


    # ========================================================
    # CONFIDENCE
    # ========================================================

    average_confidence = (
        sum(confidences)
        / len(confidences)
    )

    print()
    print("=" * 90)
    print("CONFIDENCE")
    print("=" * 90)

    print(
        f"Average prediction confidence: "
        f"{average_confidence * 100:.2f}%"
    )


    # ========================================================
    # TARGET CHECK
    # ========================================================

    print()
    print("=" * 90)
    print("TARGET CHECK")
    print("=" * 90)

    if (
        binary_accuracy >= 0.90
        and binary_f1 >= 0.90
    ):

        print(
            "✓ BINARY 90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠ BINARY 90% TARGET NOT ACHIEVED"
        )


    if (
        accuracy >= 0.90
        and f1 >= 0.90
    ):

        print(
            "✓ DEFECT-TYPE 90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠ DEFECT-TYPE 90% TARGET NOT ACHIEVED"
        )


    # ========================================================
    # MODEL INFORMATION
    # ========================================================

    print()
    print("=" * 90)
    print("MODEL INFORMATION")
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

    print()
    print("=" * 90)
    print("EVALUATION COMPLETE")
    print("=" * 90)
    print()


if __name__ == "__main__":
    main()