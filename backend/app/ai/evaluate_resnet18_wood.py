"""
VisionInspect AI
Wood Category - ResNet18 Evaluation

Training class order:
0 = good
1 = color
2 = combined
3 = hole
4 = liquid
5 = scratch
"""

import os
import json
from collections import Counter

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
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

CATEGORY = "wood"

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

# IMPORTANT:
# Actual dataset location in this project
DATASET_DIR = os.path.join(
    BASE_DIR,
    "dataset",
    "mvtec_ad",
    CATEGORY
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "saved_models",
    "wood_resnet18.pth"
)

RESULTS_DIR = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "evaluation_results"
)

os.makedirs(
    RESULTS_DIR,
    exist_ok=True
)

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

IMAGE_SIZE = 224
BATCH_SIZE = 32


# ============================================================
# CRITICAL CLASS ORDER
# MUST MATCH TRAINING
# ============================================================

CLASSES = [
    "good",
    "color",
    "combined",
    "hole",
    "liquid",
    "scratch",
]

CLASS_TO_INDEX = {
    name: index
    for index, name in enumerate(CLASSES)
}

INDEX_TO_CLASS = {
    index: name
    for index, name in enumerate(CLASSES)
}


# ============================================================
# IMAGE EXTENSIONS
# ============================================================

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}


def is_image_file(filename):
    return (
        os.path.splitext(filename)[1].lower()
        in IMAGE_EXTENSIONS
    )


# ============================================================
# TRANSFORMS
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
# DATASET
# ============================================================

class WoodDataset(Dataset):

    def __init__(
        self,
        samples,
        transform=None
    ):
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):

        image_path, label = self.samples[index]

        image = Image.open(
            image_path
        ).convert("RGB")

        if self.transform:
            image = self.transform(image)

        return image, label


# ============================================================
# COLLECT DATA
# ============================================================

def collect_samples():

    samples = []

    print("\n" + "=" * 70)
    print("COLLECTING WOOD EVALUATION DATA")
    print("=" * 70)

    print(
        f"\nDataset directory:\n{DATASET_DIR}"
    )

    # --------------------------------------------------------
    # TRAIN / GOOD
    # --------------------------------------------------------
    #
    # This follows the same evaluation approach used in the
    # existing project evaluator:
    #
    # train/good
    # +
    # test/good
    # +
    # test/defects
    #
    # Masks are excluded.
    # --------------------------------------------------------

    train_good_dir = os.path.join(
        DATASET_DIR,
        "train",
        "good"
    )

    if not os.path.isdir(train_good_dir):

        raise FileNotFoundError(
            "\nTraining good folder not found:\n"
            f"{train_good_dir}"
        )

    train_good_count = 0

    for filename in os.listdir(
        train_good_dir
    ):

        if "_mask" in filename.lower():
            continue

        filepath = os.path.join(
            train_good_dir,
            filename
        )

        if (
            os.path.isfile(filepath)
            and is_image_file(filename)
        ):

            samples.append(
                (
                    filepath,
                    CLASS_TO_INDEX["good"]
                )
            )

            train_good_count += 1

    print(
        f"\ntrain/good images: {train_good_count}"
    )

    # --------------------------------------------------------
    # TEST
    # --------------------------------------------------------

    test_dir = os.path.join(
        DATASET_DIR,
        "test"
    )

    if not os.path.isdir(test_dir):

        raise FileNotFoundError(
            "\nTest folder not found:\n"
            f"{test_dir}"
        )

    for class_name in CLASSES:

        class_dir = os.path.join(
            test_dir,
            class_name
        )

        if not os.path.isdir(class_dir):

            print(
                f"WARNING: Missing test folder: "
                f"{class_name}"
            )

            continue

        count = 0

        for filename in os.listdir(
            class_dir
        ):

            # Never evaluate segmentation masks
            if "_mask" in filename.lower():
                continue

            filepath = os.path.join(
                class_dir,
                filename
            )

            if (
                os.path.isfile(filepath)
                and is_image_file(filename)
            ):

                samples.append(
                    (
                        filepath,
                        CLASS_TO_INDEX[class_name]
                    )
                )

                count += 1

        print(
            f"test/{class_name}: {count}"
        )

    return samples


# ============================================================
# BUILD MODEL
# ============================================================

def build_model():

    print("\n" + "=" * 70)
    print("BUILDING RESNET18 MODEL")
    print("=" * 70)

    # Same architecture used during Wood training
    model = models.resnet18(
        weights=None
    )

    model.fc = nn.Sequential(
        nn.Dropout(0.20),
        nn.Linear(
            512,
            len(CLASSES)
        )
    )

    model = model.to(DEVICE)

    if not os.path.isfile(MODEL_PATH):

        raise FileNotFoundError(
            "\nWood checkpoint not found:\n"
            f"{MODEL_PATH}"
        )

    print(
        f"\nLoading checkpoint:\n"
        f"{MODEL_PATH}"
    )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE
    )

    # --------------------------------------------------------
    # Support common checkpoint formats
    # --------------------------------------------------------

    if isinstance(
        checkpoint,
        dict
    ):

        if "model_state_dict" in checkpoint:

            state_dict = checkpoint[
                "model_state_dict"
            ]

        elif "state_dict" in checkpoint:

            state_dict = checkpoint[
                "state_dict"
            ]

        else:

            state_dict = checkpoint

    else:

        state_dict = checkpoint

    # --------------------------------------------------------
    # Remove DataParallel prefix
    # --------------------------------------------------------

    cleaned_state_dict = {}

    for key, value in state_dict.items():

        if key.startswith("module."):

            key = key[
                len("module.") :
            ]

        cleaned_state_dict[key] = value

    state_dict = cleaned_state_dict

    # --------------------------------------------------------
    # Load weights
    # --------------------------------------------------------

    model.load_state_dict(
        state_dict,
        strict=True
    )

    model.eval()

    total_params = sum(
        parameter.numel()
        for parameter in model.parameters()
    )

    print(
        "\nModel loaded successfully."
    )

    print(
        f"Device: {DEVICE}"
    )

    print(
        f"Classes: {CLASSES}"
    )

    print(
        f"Parameters: {total_params:,}"
    )

    return model


# ============================================================
# EVALUATION
# ============================================================

def evaluate():

    print("\n")
    print("=" * 70)
    print("VISIONINSPECT AI - WOOD EVALUATION")
    print("=" * 70)

    print(
        f"\nCategory: {CATEGORY}"
    )

    print(
        f"Dataset: {DATASET_DIR}"
    )

    print(
        f"Model: {MODEL_PATH}"
    )

    # --------------------------------------------------------
    # CLASS MAPPING
    # --------------------------------------------------------

    print(
        "\nClass mapping used by evaluator:"
    )

    for index in range(
        len(CLASSES)
    ):

        print(
            f"  {index} -> "
            f"{INDEX_TO_CLASS[index]}"
        )

    # --------------------------------------------------------
    # COLLECT DATA
    # --------------------------------------------------------

    samples = collect_samples()

    if not samples:

        raise RuntimeError(
            "\nNo evaluation images found."
        )

    # --------------------------------------------------------
    # DATASET DISTRIBUTION
    # --------------------------------------------------------

    label_counter = Counter(
        label
        for _, label in samples
    )

    print(
        "\n" + "=" * 70
    )

    print(
        "DATASET DISTRIBUTION"
    )

    print(
        "=" * 70
    )

    for index, class_name in enumerate(
        CLASSES
    ):

        print(
            f"{class_name:<15}: "
            f"{label_counter.get(index, 0)}"
        )

    print(
        f"\nTotal images: {len(samples)}"
    )

    # --------------------------------------------------------
    # DATA LOADER
    # --------------------------------------------------------

    dataset = WoodDataset(
        samples,
        transform=transform
    )

    dataloader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0
    )

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    model = build_model()

    # --------------------------------------------------------
    # INFERENCE
    # --------------------------------------------------------

    print(
        "\n" + "=" * 70
    )

    print(
        "RUNNING INFERENCE"
    )

    print(
        "=" * 70
    )

    all_true = []
    all_pred = []
    all_confidence = []
    all_paths = []

    with torch.no_grad():

        for images, labels in dataloader:

            images = images.to(
                DEVICE
            )

            outputs = model(
                images
            )

            probabilities = torch.softmax(
                outputs,
                dim=1
            )

            confidence, predictions = torch.max(
                probabilities,
                dim=1
            )

            all_true.extend(
                labels.cpu().numpy().tolist()
            )

            all_pred.extend(
                predictions.cpu().numpy().tolist()
            )

            all_confidence.extend(
                confidence.cpu().numpy().tolist()
            )

    # Store paths in exact dataset order
    all_paths = [
        path
        for path, _ in samples
    ]

    # ========================================================
    # MULTI-CLASS METRICS
    # ========================================================

    accuracy = accuracy_score(
        all_true,
        all_pred
    )

    macro_precision = precision_score(
        all_true,
        all_pred,
        labels=list(range(len(CLASSES))),
        average="macro",
        zero_division=0
    )

    macro_recall = recall_score(
        all_true,
        all_pred,
        labels=list(range(len(CLASSES))),
        average="macro",
        zero_division=0
    )

    macro_f1 = f1_score(
        all_true,
        all_pred,
        labels=list(range(len(CLASSES))),
        average="macro",
        zero_division=0
    )

    # ========================================================
    # BINARY GOOD VS DEFECTIVE
    # ========================================================

    good_index = CLASS_TO_INDEX[
        "good"
    ]

    binary_true = [
        0 if label == good_index else 1
        for label in all_true
    ]

    binary_pred = [
        0 if prediction == good_index else 1
        for prediction in all_pred
    ]

    binary_accuracy = accuracy_score(
        binary_true,
        binary_pred
    )

    binary_precision = precision_score(
        binary_true,
        binary_pred,
        zero_division=0
    )

    binary_recall = recall_score(
        binary_true,
        binary_pred,
        zero_division=0
    )

    binary_f1 = f1_score(
        binary_true,
        binary_pred,
        zero_division=0
    )

    # ========================================================
    # CONFUSION MATRIX
    # ========================================================

    cm = confusion_matrix(
        all_true,
        all_pred,
        labels=list(range(len(CLASSES)))
    )

    # ========================================================
    # MAIN RESULTS
    # ========================================================

    print("\n")
    print("=" * 70)
    print("WOOD EVALUATION RESULTS")
    print("=" * 70)

    print(
        f"\nAccuracy:          "
        f"{accuracy * 100:.2f}%"
    )

    print(
        f"Macro Precision:   "
        f"{macro_precision * 100:.2f}%"
    )

    print(
        f"Macro Recall:      "
        f"{macro_recall * 100:.2f}%"
    )

    print(
        f"Macro F1:          "
        f"{macro_f1 * 100:.2f}%"
    )

    # ========================================================
    # BINARY RESULTS
    # ========================================================

    print(
        "\n" + "-" * 70
    )

    print(
        "GOOD VS DEFECTIVE"
    )

    print(
        "-" * 70
    )

    print(
        f"Binary Accuracy:   "
        f"{binary_accuracy * 100:.2f}%"
    )

    print(
        f"Binary Precision:  "
        f"{binary_precision * 100:.2f}%"
    )

    print(
        f"Binary Recall:     "
        f"{binary_recall * 100:.2f}%"
    )

    print(
        f"Binary F1:         "
        f"{binary_f1 * 100:.2f}%"
    )

    # ========================================================
    # CONFUSION MATRIX
    # ========================================================

    print(
        "\n" + "=" * 70
    )

    print(
        "CONFUSION MATRIX"
    )

    print(
        "=" * 70
    )

    print(
        "\nRows = Actual"
    )

    print(
        "Columns = Predicted\n"
    )

    print(
        f"{'Actual \\ Pred':<18}",
        end=""
    )

    for class_name in CLASSES:

        print(
            f"{class_name:<14}",
            end=""
        )

    print()

    print(
        "-" * 102
    )

    for i, class_name in enumerate(
        CLASSES
    ):

        print(
            f"{class_name:<18}",
            end=""
        )

        for j in range(
            len(CLASSES)
        ):

            print(
                f"{cm[i][j]:<14}",
                end=""
            )

        print()

    # ========================================================
    # PER CLASS REPORT
    # ========================================================

    print(
        "\n" + "=" * 70
    )

    print(
        "PER-CLASS PERFORMANCE"
    )

    print(
        "=" * 70
    )

    report = classification_report(
        all_true,
        all_pred,
        labels=list(range(len(CLASSES))),
        target_names=CLASSES,
        zero_division=0
    )

    print(
        "\n" + report
    )

    # ========================================================
    # ERROR ANALYSIS
    # ========================================================

    error_pairs = Counter()

    errors = []

    for index, (
        true_label,
        predicted_label
    ) in enumerate(
        zip(
            all_true,
            all_pred
        )
    ):

        if true_label != predicted_label:

            actual = INDEX_TO_CLASS[
                true_label
            ]

            predicted = INDEX_TO_CLASS[
                predicted_label
            ]

            error_pairs[
                (
                    actual,
                    predicted
                )
            ] += 1

            errors.append({
                "image": all_paths[index],
                "actual": actual,
                "predicted": predicted,
                "confidence": float(
                    all_confidence[index]
                )
            })

    total_errors = len(errors)

    print(
        "\n" + "=" * 70
    )

    print(
        "ERROR ANALYSIS"
    )

    print(
        "=" * 70
    )

    print(
        f"\nTotal errors: {total_errors}"
    )

    if total_errors == 0:

        print(
            "\nNo classification errors."
        )

    else:

        print(
            "\nError breakdown:"
        )

        for (
            actual,
            predicted
        ), count in error_pairs.most_common():

            print(
                f"  {actual} -> "
                f"{predicted}: "
                f"{count}"
            )

    # ========================================================
    # TARGET CHECK
    # ========================================================

    print(
        "\n" + "=" * 70
    )

    print(
        "PROJECT TARGET CHECK"
    )

    print(
        "=" * 70
    )

    targets = {
        "Accuracy": (
            accuracy,
            0.90
        ),

        "Macro Precision": (
            macro_precision,
            0.90
        ),

        "Macro Recall": (
            macro_recall,
            0.90
        ),

        "Macro F1": (
            macro_f1,
            0.90
        ),

        "Binary Accuracy": (
            binary_accuracy,
            0.90
        ),

        "Binary Precision": (
            binary_precision,
            0.90
        ),

        "Binary Recall": (
            binary_recall,
            0.90
        ),

        "Binary F1": (
            binary_f1,
            0.90
        ),
    }

    all_targets_passed = True

    for metric_name, (
        value,
        target
    ) in targets.items():

        passed = (
            value >= target
        )

        if not passed:

            all_targets_passed = False

        status = (
            "PASS"
            if passed
            else "FAIL"
        )

        print(
            f"{metric_name:<20}"
            f"{value * 100:>7.2f}% "
            f"(target "
            f"{target * 100:.0f}%) "
            f"[{status}]"
        )

    print(
        "\n" + "-" * 70
    )

    if all_targets_passed:

        overall_status = "PASS"

        print(
            "OVERALL STATUS: PASS"
        )

    else:

        overall_status = (
            "SOME_TARGETS_NOT_MET"
        )

        print(
            "OVERALL STATUS: "
            "SOME TARGETS NOT MET"
        )

    # ========================================================
    # SAVE JSON RESULTS
    # ========================================================

    results = {
        "category": CATEGORY,

        "dataset_path": DATASET_DIR,

        "model_path": MODEL_PATH,

        "dataset_size": len(samples),

        "classes": CLASSES,

        "class_mapping": {
            str(index): class_name
            for index, class_name
            in INDEX_TO_CLASS.items()
        },

        "metrics": {
            "accuracy": float(
                accuracy
            ),

            "macro_precision": float(
                macro_precision
            ),

            "macro_recall": float(
                macro_recall
            ),

            "macro_f1": float(
                macro_f1
            ),

            "binary_accuracy": float(
                binary_accuracy
            ),

            "binary_precision": float(
                binary_precision
            ),

            "binary_recall": float(
                binary_recall
            ),

            "binary_f1": float(
                binary_f1
            ),
        },

        "errors": total_errors,

        "error_breakdown": {
            f"{actual}->{predicted}": count
            for (
                actual,
                predicted
            ), count in error_pairs.items()
        },

        "confusion_matrix": cm.tolist(),

        "targets": {
            metric_name: {
                "value": float(value),
                "target": float(target),
                "passed": bool(
                    value >= target
                )
            }

            for metric_name, (
                value,
                target
            ) in targets.items()
        },

        "overall_status": overall_status,
    }

    result_path = os.path.join(
        RESULTS_DIR,
        "wood_resnet18_evaluation.json"
    )

    with open(
        result_path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            results,
            file,
            indent=4
        )

    print(
        "\nResults saved to:"
    )

    print(
        result_path
    )

    print(
        "\n" + "=" * 70
    )

    print(
        "EVALUATION COMPLETE"
    )

    print(
        "=" * 70
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    evaluate()