"""
VisionInspect AI
Hazelnut ResNet18 Evaluation

Evaluates:
    good
    crack
    cut
    hole
    print

The model is the fine-tuned ImageNet ResNet18 checkpoint:
    app/ai/saved_models/hazelnut_resnet18.pth
"""

from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms

from PIL import Image

from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix,
)


# ============================================================
# CONFIGURATION
# ============================================================

CATEGORY = "hazelnut"

IMAGE_SIZE = 224
BATCH_SIZE = 8

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

CLASS_NAMES = [
    "good",
    "crack",
    "cut",
    "hole",
    "print",
]


# ============================================================
# PATHS
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

DATASET_DIR = (
    BACKEND_DIR
    / "dataset"
    / "mvtec_ad"
    / CATEGORY
)

MODEL_PATH = (
    BACKEND_DIR
    / "app"
    / "ai"
    / "saved_models"
    / "hazelnut_resnet18.pth"
)


# ============================================================
# IMAGE TRANSFORMATION
# ============================================================

TEST_TRANSFORM = transforms.Compose(
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


# ============================================================
# DATASET
# ============================================================

class HazelnutEvaluationDataset(Dataset):

    def __init__(
        self,
        samples,
    ):
        self.samples = samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(
        self,
        index,
    ):

        image_path, label = self.samples[index]

        image = Image.open(
            image_path
        ).convert("RGB")

        image = TEST_TRANSFORM(image)

        return (
            image,
            label,
            str(image_path),
        )


# ============================================================
# COLLECT EVALUATION DATA
# ============================================================

def collect_samples():

    samples = []

    # --------------------------------------------------------
    # GOOD IMAGES
    #
    # MVTec AD stores normal training images here.
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
                in {
                    ".png",
                    ".jpg",
                    ".jpeg",
                    ".bmp",
                    ".webp",
                }
            ):

                samples.append(
                    (
                        image_path,
                        0,
                    )
                )

    # --------------------------------------------------------
    # DEFECT IMAGES
    #
    # MVTec AD stores defect images here.
    # --------------------------------------------------------

    test_dir = (
        DATASET_DIR
        / "test"
    )

    for class_index, class_name in enumerate(
        CLASS_NAMES
    ):

        if class_name == "good":
            continue

        defect_dir = (
            test_dir
            / class_name
        )

        if not defect_dir.exists():
            continue

        for image_path in sorted(
            defect_dir.iterdir()
        ):

            if (
                image_path.is_file()
                and image_path.suffix.lower()
                in {
                    ".png",
                    ".jpg",
                    ".jpeg",
                    ".bmp",
                    ".webp",
                }
            ):

                samples.append(
                    (
                        image_path,
                        class_index,
                    )
                )

    return samples


# ============================================================
# BUILD RESNET18
# ============================================================

def build_model():

    model = models.resnet18(
        weights=None
    )

    number_of_classes = len(
        CLASS_NAMES
    )

    input_features = (
        model.fc.in_features
    )

    model.fc = nn.Sequential(
        nn.Dropout(
            p=0.35
        ),

        nn.Linear(
            input_features,
            number_of_classes,
        ),
    )

    return model


# ============================================================
# LOAD CHECKPOINT
# ============================================================

def load_model():

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            "\nHazelnut model not found:\n"
            f"{MODEL_PATH}"
        )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=False,
    )

    model = build_model()

    state_dict = checkpoint[
        "model_state_dict"
    ]

    model.load_state_dict(
        state_dict
    )

    model = model.to(
        DEVICE
    )

    model.eval()

    return (
        model,
        checkpoint,
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
        "HAZELNUT RESNET18 EVALUATION"
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
        "Loading Hazelnut ResNet18..."
    )

    model, checkpoint = load_model()

    print(
        "✓ Model loaded"
    )


    # ========================================================
    # MODEL INFORMATION
    # ========================================================

    print()

    print(
        "MODEL INFORMATION"
    )

    print("-" * 60)

    print(
        f"Architecture : "
        f"{checkpoint.get('architecture', 'resnet18')}"
    )

    print(
        f"Pretrained   : "
        f"{checkpoint.get('pretrained', True)}"
    )

    print(
        f"ImageNet     : "
        f"{checkpoint.get('imagenet', True)}"
    )

    print(
        f"Fine-tuned   : "
        f"{checkpoint.get('fine_tuned', True)}"
    )

    print(
        f"Best epoch   : "
        f"{checkpoint.get('best_epoch', 'N/A')}"
    )

    print(
        f"Model path   : "
        f"{MODEL_PATH}"
    )


    # ========================================================
    # COLLECT DATA
    # ========================================================

    print()

    print("=" * 90)

    print(
        "EVALUATION DATASET"
    )

    print("=" * 90)

    samples = collect_samples()

    class_counts = {
        class_name: 0
        for class_name in CLASS_NAMES
    }

    for _, label in samples:

        class_counts[
            CLASS_NAMES[label]
        ] += 1


    for class_name in CLASS_NAMES:

        print(
            f"{class_name:<30}"
            f": {class_counts[class_name]}"
        )

    print()

    print(
        f"TOTAL IMAGES : {len(samples)}"
    )


    # ========================================================
    # DATA LOADER
    # ========================================================

    dataset = (
        HazelnutEvaluationDataset(
            samples
        )
    )

    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
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


    all_true = []
    all_pred = []
    all_confidence = []
    all_paths = []


    processed = 0


    with torch.no_grad():

        for (
            images,
            labels,
            paths,
        ) in loader:

            images = images.to(
                DEVICE
            )

            outputs = model(
                images
            )

            probabilities = torch.softmax(
                outputs,
                dim=1,
            )

            confidence, predictions = (
                torch.max(
                    probabilities,
                    dim=1,
                )
            )

            all_true.extend(
                labels.numpy()
            )

            all_pred.extend(
                predictions.cpu().numpy()
            )

            all_confidence.extend(
                confidence.cpu().numpy()
            )

            all_paths.extend(
                paths
            )

            processed += len(
                labels
            )

            print(
                f"Processed "
                f"{processed}/{len(samples)}"
            )


    # ========================================================
    # MULTICLASS METRICS
    # ========================================================

    accuracy = accuracy_score(
        all_true,
        all_pred,
    )


    macro_precision, macro_recall, macro_f1, _ = (
        precision_recall_fscore_support(
            all_true,
            all_pred,
            average="macro",
            zero_division=0,
        )
    )


    weighted_precision, weighted_recall, weighted_f1, _ = (
        precision_recall_fscore_support(
            all_true,
            all_pred,
            average="weighted",
            zero_division=0,
        )
    )


    # ========================================================
    # BINARY GOOD VS DEFECTIVE
    # ========================================================

    binary_true = [
        0 if label == 0 else 1
        for label in all_true
    ]

    binary_pred = [
        0 if prediction == 0 else 1
        for prediction in all_pred
    ]


    binary_accuracy = accuracy_score(
        binary_true,
        binary_pred,
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
    # MULTICLASS RESULTS
    # ========================================================

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


    # ========================================================
    # BINARY RESULTS
    # ========================================================

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


    # ========================================================
    # PER CLASS REPORT
    # ========================================================

    print()

    print("=" * 90)

    print(
        "PER-CLASS PERFORMANCE"
    )

    print("=" * 90)

    print(
        classification_report(
            all_true,
            all_pred,
            labels=list(
                range(
                    len(CLASS_NAMES)
                )
            ),
            target_names=CLASS_NAMES,
            zero_division=0,
            digits=4,
        )
    )


    # ========================================================
    # CONFUSION MATRIX
    # ========================================================

    matrix = confusion_matrix(
        all_true,
        all_pred,
        labels=list(
            range(
                len(CLASS_NAMES)
            )
        ),
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
        f"{'Actual':<30}"
        +
        "".join(
            f"{name[:10]:>12}"
            for name in CLASS_NAMES
        )
    )


    for index, row in enumerate(
        matrix
    ):

        print(
            f"{CLASS_NAMES[index]:<30}"
            +
            "".join(
                f"{value:>12}"
                for value in row
            )
        )


    # ========================================================
    # ERROR ANALYSIS
    # ========================================================

    errors = []

    for index in range(
        len(all_true)
    ):

        if (
            all_true[index]
            != all_pred[index]
        ):

            errors.append(
                index
            )


    print()

    print("=" * 90)

    print(
        "ERROR ANALYSIS"
    )

    print("=" * 90)

    print(
        f"Correct predictions   : "
        f"{len(samples) - len(errors)}"
    )

    print(
        f"Incorrect predictions : "
        f"{len(errors)}"
    )


    if errors:

        print()

        for index in errors:

            filename = Path(
                all_paths[index]
            ).name

            actual = CLASS_NAMES[
                all_true[index]
            ]

            predicted = CLASS_NAMES[
                all_pred[index]
            ]

            confidence = (
                all_confidence[index]
                * 100
            )

            print(
                f"{filename:<15}"
                f"Actual={actual:<20}"
                f"Predicted={predicted:<20}"
                f"Confidence={confidence:.2f}%"
            )

    else:

        print(
            "✓ No incorrect predictions"
        )


    # ========================================================
    # CONFIDENCE
    # ========================================================

    average_confidence = (
        sum(all_confidence)
        /
        len(all_confidence)
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
    # TARGET CHECK
    # ========================================================

    print()

    print("=" * 90)

    print(
        "90% TARGET CHECK"
    )

    print("=" * 90)


    if binary_accuracy >= 0.90:

        print(
            "✓ GOOD VS DEFECTIVE: "
            "90% TARGET ACHIEVED"
        )

    else:

        print(
            "✗ GOOD VS DEFECTIVE: "
            "90% TARGET NOT ACHIEVED"
        )


    if accuracy >= 0.90:

        print(
            "✓ DEFECT TYPE: "
            "90% TARGET ACHIEVED"
        )

    else:

        print(
            "✗ DEFECT TYPE: "
            "90% TARGET NOT ACHIEVED"
        )


    # ========================================================
    # FINAL VERDICT
    # ========================================================

    print()

    print("=" * 90)

    print(
        "FINAL HAZELNUT BACKEND VERDICT"
    )

    print("=" * 90)


    if (
        binary_accuracy >= 0.90
        and accuracy >= 0.90
    ):

        print(
            "✓ HAZELNUT RESNET18 PASSES"
        )

        print(
            "✓ DEFECT DETECTION TARGET PASSED"
        )

        print(
            "✓ DEFECT TYPE TARGET PASSED"
        )

    else:

        print(
            "⚠ HAZELNUT RESNET18 "
            "REQUIRES IMPROVEMENT"
        )


    print()

    print("=" * 90)

    print(
        "HAZELNUT EVALUATION COMPLETE"
    )

    print("=" * 90)

    print()


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()