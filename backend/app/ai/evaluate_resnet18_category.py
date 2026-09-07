from pathlib import Path
import argparse

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from PIL import Image

from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
)


# ============================================================
# VISIONINSPECT AI
# GENERIC RESNET18 CATEGORY EVALUATOR
# ============================================================

IMAGE_SIZE = 224
BATCH_SIZE = 8

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# PATHS
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

DATASET_ROOT = (
    BACKEND_DIR
    / "dataset"
    / "mvtec_ad"
)

MODEL_DIR = (
    BACKEND_DIR
    / "app"
    / "ai"
    / "saved_models"
)


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


# ============================================================
# TRANSFORM
# ============================================================

test_transform = transforms.Compose([

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
# DATASET
# ============================================================

class EvaluationDataset(Dataset):

    def __init__(
        self,
        samples,
        transform,
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

        image = self.transform(image)

        return image, label, str(image_path)


# ============================================================
# COLLECT DATASET
# ============================================================

def collect_test_dataset(
    category,
    class_names,
):

    category_dir = DATASET_ROOT / category

    train_dir = category_dir / "train"
    test_dir = category_dir / "test"

    class_to_index = {
        name: index
        for index, name in enumerate(class_names)
    }

    samples = []


    # --------------------------------------------------------
    # GOOD
    #
    # MVTec normal images are in train/good.
    # --------------------------------------------------------

    good_dir = train_dir / "good"

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
                        class_to_index["good"],
                    )
                )


    # --------------------------------------------------------
    # DEFECT CLASSES
    #
    # Defect images are in test/<defect>.
    # test/good is deliberately ignored.
    # --------------------------------------------------------

    for class_name in class_names:

        if class_name == "good":
            continue

        defect_dir = test_dir / class_name

        if not defect_dir.exists():
            continue

        for image_path in sorted(
            defect_dir.iterdir()
        ):

            if (
                image_path.is_file()
                and image_path.suffix.lower()
                in IMAGE_EXTENSIONS
            ):

                samples.append(
                    (
                        image_path,
                        class_to_index[class_name],
                    )
                )


    return samples


# ============================================================
# LOAD MODEL
# ============================================================

def load_model(
    model_path,
    class_names,
):

    # --------------------------------------------------------
    # Load checkpoint
    # --------------------------------------------------------

    checkpoint = torch.load(
        model_path,
        map_location=DEVICE,
        weights_only=False,
    )


    # --------------------------------------------------------
    # Create architecture
    # --------------------------------------------------------

    model = models.resnet18(
        weights=None
    )


    in_features = model.fc.in_features

    model.fc = nn.Sequential(

        nn.Dropout(
            p=0.35
        ),

        nn.Linear(
            in_features,
            len(class_names),
        ),
    )


    # --------------------------------------------------------
    # Load trained weights
    # --------------------------------------------------------

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

    parser = argparse.ArgumentParser(
        description=(
            "Evaluate a trained "
            "VisionInspect ResNet18 "
            "category model"
        )
    )


    parser.add_argument(
        "--category",
        required=True,
        type=str,
        help="Category to evaluate",
    )


    args = parser.parse_args()

    category = (
        args.category.strip().lower()
    )


    model_path = (
        MODEL_DIR
        /
        f"{category}_resnet18.pth"
    )


    print()

    print("=" * 90)

    print(
        "VISIONINSPECT AI"
    )

    print(
        "RESNET18 CATEGORY EVALUATION"
    )

    print("=" * 90)


    print(
        f"Category       : "
        f"{category}"
    )

    print(
        f"Device         : "
        f"{DEVICE}"
    )

    print(
        "Architecture   : ResNet18"
    )

    print(
        "Backbone       : ImageNet"
    )

    print(
        "Training       : Fine-tuned"
    )

    print("=" * 90)


    # ========================================================
    # CHECK MODEL
    # ========================================================

    if not model_path.exists():

        raise FileNotFoundError(
            f"\nModel not found:\n"
            f"{model_path}"
        )


    print()

    print(
        "Loading model..."
    )


    checkpoint = torch.load(
        model_path,
        map_location=DEVICE,
        weights_only=False,
    )


    class_names = checkpoint[
        "class_names"
    ]


    print(
        "✓ Model loaded"
    )


    print()

    print(
        "Classes:"
    )


    for index, name in enumerate(
        class_names
    ):

        print(
            f"  {index}: {name}"
        )


    # ========================================================
    # DATASET
    # ========================================================

    samples = collect_test_dataset(
        category,
        class_names,
    )


    print()

    print("=" * 90)

    print(
        "EVALUATION DATASET"
    )

    print("=" * 90)


    class_counts = {
        name: 0
        for name in class_names
    }


    for _, label in samples:

        class_counts[
            class_names[label]
        ] += 1


    for name in class_names:

        print(
            f"{name:<35}"
            f": {class_counts[name]}"
        )


    print()

    print(
        f"TOTAL IMAGES : "
        f"{len(samples)}"
    )


    # ========================================================
    # DATA LOADER
    # ========================================================

    dataset = EvaluationDataset(
        samples,
        test_transform,
    )


    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
    )


    # ========================================================
    # MODEL
    # ========================================================

    model, checkpoint = load_model(
        model_path,
        class_names,
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

        for images, labels, paths in loader:

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


            confidence, predictions = (
                torch.max(
                    probabilities,
                    dim=1
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
    # OVERALL METRICS
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


    binary_precision, binary_recall, binary_f1, _ = (
        precision_recall_fscore_support(
            binary_true,
            binary_pred,
            average="binary",
            zero_division=0,
        )
    )


    # ========================================================
    # PRINT MULTICLASS
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
    # CLASSIFICATION REPORT
    # ========================================================

    print()

    print("=" * 90)

    print(
        "PER-CLASS REPORT"
    )

    print("=" * 90)


    print(
        classification_report(
            all_true,
            all_pred,
            labels=list(
                range(
                    len(class_names)
                )
            ),
            target_names=class_names,
            zero_division=0,
            digits=4,
        )
    )


    # ========================================================
    # CONFUSION MATRIX
    # ========================================================

    cm = confusion_matrix(
        all_true,
        all_pred,
        labels=list(
            range(
                len(class_names)
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
            f"{name[:9]:>11}"
            for name in class_names
        )
    )


    for i, row in enumerate(
        cm
    ):

        print(
            f"{class_names[i]:<30}"
            +
            "".join(
                f"{value:>11}"
                for value in row
            )
        )


    # ========================================================
    # ERROR ANALYSIS
    # ========================================================

    incorrect_indices = [

        i

        for i, (
            true_label,
            predicted_label
        )

        in enumerate(
            zip(
                all_true,
                all_pred,
            )
        )

        if true_label != predicted_label
    ]


    print()

    print("=" * 90)

    print(
        "ERROR ANALYSIS"
    )

    print("=" * 90)


    print(
        f"Correct predictions   : "
        f"{len(samples) - len(incorrect_indices)}"
    )


    print(
        f"Incorrect predictions : "
        f"{len(incorrect_indices)}"
    )


    if incorrect_indices:

        print()


        for index in incorrect_indices:

            filename = Path(
                all_paths[index]
            ).name


            actual = class_names[
                all_true[index]
            ]


            predicted = class_names[
                all_pred[index]
            ]


            confidence = (
                all_confidence[index]
                * 100
            )


            print(
                f"{filename:<15}"
                f"Actual={actual:<30}"
                f"Predicted={predicted:<30}"
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
            "⚠️ GOOD VS DEFECTIVE: "
            "90% TARGET NOT ACHIEVED"
        )


    if accuracy >= 0.90:

        print(
            "✓ DEFECT TYPE: "
            "90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠️ DEFECT TYPE: "
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


    print()

    print(
        f"Model        : "
        f"{model_path}"
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