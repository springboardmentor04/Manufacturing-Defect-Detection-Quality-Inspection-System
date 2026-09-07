"""
VisionInspect AI
Capsule ResNet18 Evaluation

IMPORTANT:
This evaluator MUST match train_resnet18_category.py.

Expected architecture:

ResNet18Category
    |
    +-- backbone = torchvision ResNet18
    |
    +-- backbone.fc
          |
          +-- Linear(512, 256)
          +-- ReLU
          +-- Dropout(0.25)
          +-- Linear(256, num_classes)

NO BatchNorm1d is used in the classifier.
"""

from pathlib import Path
from collections import Counter

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms

from PIL import Image, ImageFile

from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix,
)


# ============================================================
# CONFIGURATION
# ============================================================

CATEGORY = "capsule"

IMAGE_SIZE = 224
BATCH_SIZE = 16
NUM_WORKERS = 0

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR.parent.parent

DATASET_ROOT = (
    BACKEND_DIR
    / "dataset"
    / "mvtec_ad"
)

MODEL_PATH = (
    BASE_DIR
    / "saved_models"
    / f"{CATEGORY}_resnet18.pth"
)

VALID_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".webp",
}

ImageFile.LOAD_TRUNCATED_IMAGES = True


# ============================================================
# IMAGENET NORMALIZATION
# ============================================================

IMAGENET_MEAN = [
    0.485,
    0.456,
    0.406,
]

IMAGENET_STD = [
    0.229,
    0.224,
    0.225,
]


# ============================================================
# GLOBAL CLASS INFORMATION
# Filled from checkpoint.
# ============================================================

CLASS_NAMES = []
CLASS_TO_INDEX = {}


# ============================================================
# HEADER
# ============================================================

def print_header():
    print()
    print("=" * 90)
    print("VISIONINSPECT AI")
    print("CAPSULE RESNET18 EVALUATION")
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
        "=" * 90
    )


# ============================================================
# MODEL
# EXACT MATCH TO TRAINING CODE
# ============================================================

class ResNet18Category(nn.Module):

    def __init__(
        self,
        number_of_classes: int,
    ):
        super().__init__()

        self.backbone = models.resnet18(
            weights=None
        )

        # EXACT TRAINING ARCHITECTURE
        #
        # 512 -> 256 -> classes
        #
        # NO BatchNorm1d.
        self.backbone.fc = nn.Sequential(

            nn.Linear(
                512,
                256
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                p=0.25
            ),

            nn.Linear(
                256,
                number_of_classes
            ),
        )

    def forward(self, x):

        return self.backbone(x)


# ============================================================
# CHECKPOINT STATE DICT EXTRACTION
# ============================================================

def extract_state_dict(
    checkpoint
):
    """
    Supports checkpoints saved as:

        {
            "model_state_dict": ...
        }

    or:

        {
            "state_dict": ...
        }

    or a raw state_dict.
    """

    if isinstance(
        checkpoint,
        dict
    ):

        if (
            "model_state_dict"
            in checkpoint
        ):
            return checkpoint[
                "model_state_dict"
            ]

        if (
            "state_dict"
            in checkpoint
        ):
            return checkpoint[
                "state_dict"
            ]

    return checkpoint


# ============================================================
# STATE DICT KEY CLEANING
# ============================================================

def clean_state_dict(
    state_dict
):

    cleaned = {}

    for key, value in state_dict.items():

        new_key = key

        # DataParallel compatibility
        if new_key.startswith(
            "module."
        ):
            new_key = new_key[
                len("module.") :
            ]

        cleaned[
            new_key
        ] = value

    return cleaned


# ============================================================
# MODEL LOADING
# ============================================================

def load_model():

    global CLASS_NAMES
    global CLASS_TO_INDEX

    print()
    print(
        "Loading Capsule ResNet18..."
    )

    print()

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            "\nCapsule model not found:\n"
            f"{MODEL_PATH}\n\n"
            "Train the capsule model first."
        )

    # --------------------------------------------------------
    # LOAD CHECKPOINT
    # --------------------------------------------------------

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=False,
    )

    # --------------------------------------------------------
    # READ CLASS NAMES
    # --------------------------------------------------------

    if not isinstance(
        checkpoint,
        dict
    ):

        raise RuntimeError(
            "Unsupported checkpoint format."
        )

    classes = (
        checkpoint.get(
            "class_names"
        )
        or checkpoint.get(
            "classes"
        )
    )

    if classes is None:

        raise RuntimeError(
            "Checkpoint does not contain "
            "'class_names' or 'classes'."
        )

    CLASS_NAMES = list(
        classes
    )

    CLASS_TO_INDEX = {
        name: index
        for index, name
        in enumerate(
            CLASS_NAMES
        )
    }

    number_of_classes = len(
        CLASS_NAMES
    )

    print(
        "Classes:"
    )

    for index, name in enumerate(
        CLASS_NAMES
    ):

        print(
            f"  {index}: {name}"
        )

    # --------------------------------------------------------
    # EXTRACT STATE DICT
    # --------------------------------------------------------

    state_dict = extract_state_dict(
        checkpoint
    )

    state_dict = clean_state_dict(
        state_dict
    )

    # --------------------------------------------------------
    # VERIFY CURRENT ARCHITECTURE
    # --------------------------------------------------------

    required_keys = [
        "backbone.conv1.weight",
        "backbone.fc.0.weight",
        "backbone.fc.0.bias",
        "backbone.fc.3.weight",
        "backbone.fc.3.bias",
    ]

    missing_required = [
        key
        for key in required_keys
        if key not in state_dict
    ]

    if missing_required:

        print()
        print(
            "=" * 90
        )

        print(
            "CHECKPOINT ARCHITECTURE ERROR"
        )

        print(
            "=" * 90
        )

        print()
        print(
            "The checkpoint does NOT match "
            "the current ResNet18 trainer."
        )

        print()
        print(
            "Expected checkpoint keys:"
        )

        for key in required_keys:

            print(
                f"  {key}"
            )

        print()
        print(
            "Missing keys:"
        )

        for key in missing_required:

            print(
                f"  {key}"
            )

        print()
        print(
            "This usually means the .pth file "
            "was created by an older trainer."
        )

        print()
        print(
            "Retrain the capsule model using "
            "the corrected trainer."
        )

        raise RuntimeError(
            "Incompatible Capsule checkpoint."
        )

    # --------------------------------------------------------
    # CHECK CLASSIFIER DIMENSIONS
    # --------------------------------------------------------

    fc0_weight = state_dict[
        "backbone.fc.0.weight"
    ]

    fc3_weight = state_dict[
        "backbone.fc.3.weight"
    ]

    input_features = (
        fc0_weight.shape[1]
    )

    hidden_features = (
        fc0_weight.shape[0]
    )

    output_features = (
        fc3_weight.shape[0]
    )

    if input_features != 512:

        raise RuntimeError(
            "Unexpected classifier input size: "
            f"{input_features}. "
            "Expected 512."
        )

    if hidden_features != 256:

        raise RuntimeError(
            "Unexpected classifier hidden size: "
            f"{hidden_features}. "
            "Expected 256."
        )

    if (
        output_features
        != number_of_classes
    ):

        raise RuntimeError(
            "Checkpoint output size does not "
            "match number of classes. "
            f"Checkpoint={output_features}, "
            f"Classes={number_of_classes}"
        )

    # --------------------------------------------------------
    # BUILD EXACT MODEL
    # --------------------------------------------------------

    model = ResNet18Category(
        number_of_classes
    )

    # --------------------------------------------------------
    # STRICT LOADING
    # --------------------------------------------------------

    try:

        model.load_state_dict(
            state_dict,
            strict=True,
        )

    except RuntimeError as error:

        print()
        print(
            "=" * 90
        )

        print(
            "STRICT MODEL LOADING FAILED"
        )

        print(
            "=" * 90
        )

        print()
        print(error)

        print()
        print(
            "The evaluator architecture and "
            "checkpoint are different."
        )

        print(
            "Do NOT use strict=False to hide "
            "this problem."
        )

        raise

    model = model.to(
        DEVICE
    )

    model.eval()

    print()
    print(
        "✓ Model loaded successfully"
    )

    print(
        "✓ Exact trainer architecture matched"
    )

    print(
        "✓ BatchNorm-free classifier confirmed"
    )

    return (
        model,
        checkpoint,
    )


# ============================================================
# TRANSFORM
# ============================================================

def create_transform():

    return transforms.Compose([

        transforms.Resize(
            (
                IMAGE_SIZE,
                IMAGE_SIZE
            )
        ),

        transforms.ToTensor(),

        transforms.Normalize(
            IMAGENET_MEAN,
            IMAGENET_STD,
        ),
    ])


# ============================================================
# DATASET COLLECTION
# ============================================================

def collect_dataset():

    category_root = (
        DATASET_ROOT
        / CATEGORY
    )

    if not category_root.exists():

        raise FileNotFoundError(
            "\nDataset category not found:\n"
            f"{category_root}"
        )

    samples = []

    # --------------------------------------------------------
    # GOOD
    # --------------------------------------------------------

    good_locations = [

        category_root
        / "train"
        / "good",

        category_root
        / "test"
        / "good",
    ]

    for good_dir in good_locations:

        if not good_dir.exists():
            continue

        for image_path in sorted(
            good_dir.iterdir()
        ):

            if (
                image_path.is_file()
                and
                image_path.suffix.lower()
                in VALID_EXTENSIONS
            ):

                samples.append(
                    (
                        image_path,
                        "good"
                    )
                )

    # --------------------------------------------------------
    # DEFECTS
    # --------------------------------------------------------

    test_root = (
        category_root
        / "test"
    )

    if test_root.exists():

        for defect_dir in sorted(
            test_root.iterdir()
        ):

            if not defect_dir.is_dir():
                continue

            if defect_dir.name == "good":
                continue

            defect_name = (
                defect_dir.name
            )

            for image_path in sorted(
                defect_dir.iterdir()
            ):

                if (
                    image_path.is_file()
                    and
                    image_path.suffix.lower()
                    in VALID_EXTENSIONS
                ):

                    samples.append(
                        (
                            image_path,
                            defect_name
                        )
                    )

    return samples


# ============================================================
# PYTORCH DATASET
# ============================================================

class CapsuleEvaluationDataset(
    Dataset
):

    def __init__(
        self,
        samples,
        class_to_index,
        transform,
    ):

        self.samples = samples

        self.class_to_index = (
            class_to_index
        )

        self.transform = transform

    def __len__(self):

        return len(
            self.samples
        )

    def __getitem__(
        self,
        index,
    ):

        image_path, label = (
            self.samples[index]
        )

        try:

            image = Image.open(
                image_path
            ).convert(
                "RGB"
            )

        except Exception as error:

            raise RuntimeError(
                f"Could not read image: "
                f"{image_path}"
            ) from error

        image = self.transform(
            image
        )

        target = self.class_to_index[
            label
        ]

        return (
            image,
            target,
            str(image_path),
        )


# ============================================================
# INFERENCE
# ============================================================

def run_inference(
    model,
    loader,
):

    true_labels = []
    predicted_labels = []
    confidences = []
    records = []

    total_images = len(
        loader.dataset
    )

    processed = 0

    model.eval()

    with torch.no_grad():

        for (
            images,
            targets,
            paths,
        ) in loader:

            images = images.to(
                DEVICE,
                non_blocking=True,
            )

            outputs = model(
                images
            )

            probabilities = torch.softmax(
                outputs,
                dim=1,
            )

            confidence, prediction = (
                probabilities.max(
                    dim=1
                )
            )

            target_list = (
                targets.tolist()
            )

            prediction_list = (
                prediction.cpu().tolist()
            )

            confidence_list = (
                confidence.cpu().tolist()
            )

            true_labels.extend(
                target_list
            )

            predicted_labels.extend(
                prediction_list
            )

            confidences.extend(
                confidence_list
            )

            for (
                path,
                actual,
                predicted,
                conf,
            ) in zip(
                paths,
                target_list,
                prediction_list,
                confidence_list,
            ):

                records.append(
                    {
                        "path": path,
                        "actual":
                            CLASS_NAMES[
                                actual
                            ],
                        "predicted":
                            CLASS_NAMES[
                                predicted
                            ],
                        "confidence":
                            conf,
                    }
                )

            processed += len(
                images
            )

            print(
                f"Processed "
                f"{processed}/"
                f"{total_images}"
            )

    return (
        true_labels,
        predicted_labels,
        confidences,
        records,
    )


# ============================================================
# MULTICLASS METRICS
# ============================================================

def calculate_multiclass_metrics(
    true_labels,
    predicted_labels,
):

    accuracy = accuracy_score(
        true_labels,
        predicted_labels,
    )

    precision, recall, f1, _ = (
        precision_recall_fscore_support(
            true_labels,
            predicted_labels,
            average="macro",
            zero_division=0,
        )
    )

    return (
        accuracy,
        precision,
        recall,
        f1,
    )


# ============================================================
# BINARY GOOD VS DEFECTIVE
# ============================================================

def calculate_binary_metrics(
    true_labels,
    predicted_labels,
):

    good_index = CLASS_TO_INDEX[
        "good"
    ]

    binary_true = [
        0 if label == good_index
        else 1
        for label in true_labels
    ]

    binary_predicted = [
        0 if label == good_index
        else 1
        for label in predicted_labels
    ]

    accuracy = accuracy_score(
        binary_true,
        binary_predicted,
    )

    precision, recall, f1, _ = (
        precision_recall_fscore_support(
            binary_true,
            binary_predicted,
            average="binary",
            zero_division=0,
        )
    )

    return (
        accuracy,
        precision,
        recall,
        f1,
    )


# ============================================================
# ERROR ANALYSIS
# ============================================================

def print_error_analysis(
    records,
):

    errors = [
        record
        for record in records
        if record["actual"]
        != record["predicted"]
    ]

    print()
    print("=" * 90)
    print("ERROR ANALYSIS")
    print("=" * 90)

    print(
        f"Correct predictions   : "
        f"{len(records) - len(errors)}"
    )

    print(
        f"Incorrect predictions : "
        f"{len(errors)}"
    )

    if not errors:

        print()
        print(
            "✓ No incorrect predictions"
        )

        return

    print()

    for record in errors:

        filename = Path(
            record["path"]
        ).name

        print(
            f"{filename:<15} "
            f"Actual="
            f"{record['actual']:<25} "
            f"Predicted="
            f"{record['predicted']:<25} "
            f"Confidence="
            f"{record['confidence'] * 100:.2f}%"
        )


# ============================================================
# CONFUSION MATRIX
# ============================================================

def print_confusion_matrix(
    true_labels,
    predicted_labels,
):

    matrix = confusion_matrix(
        true_labels,
        predicted_labels,
        labels=list(
            range(
                len(CLASS_NAMES)
            )
        ),
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

    header = (
        "Actual".ljust(30)
    )

    for class_name in CLASS_NAMES:

        header += (
            class_name[:12]
            .rjust(14)
        )

    print(header)

    for index, class_name in enumerate(
        CLASS_NAMES
    ):

        row = (
            class_name.ljust(30)
        )

        for column in range(
            len(CLASS_NAMES)
        ):

            row += (
                str(
                    matrix[
                        index,
                        column
                    ]
                ).rjust(14)
            )

        print(row)


# ============================================================
# MAIN EVALUATION
# ============================================================

def main():

    print_header()

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    model, checkpoint = (
        load_model()
    )

    # --------------------------------------------------------
    # MODEL METADATA
    # --------------------------------------------------------

    print()
    print(
        "MODEL INFORMATION"
    )

    print(
        "-" * 60
    )

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

    if isinstance(
        checkpoint,
        dict
    ):

        if (
            "best_epoch"
            in checkpoint
        ):

            print(
                f"Best epoch   : "
                f"{checkpoint['best_epoch']}"
            )

    print(
        f"Model path   : "
        f"{MODEL_PATH}"
    )

    # --------------------------------------------------------
    # DATASET
    # --------------------------------------------------------

    samples = collect_dataset()

    counts = Counter(
        label
        for _, label in samples
    )

    print()
    print("=" * 90)
    print("EVALUATION DATASET")
    print("=" * 90)

    for class_name in CLASS_NAMES:

        print(
            f"{class_name:<35}: "
            f"{counts[class_name]}"
        )

    print()

    print(
        f"TOTAL IMAGES : "
        f"{len(samples)}"
    )

    # --------------------------------------------------------
    # UNKNOWN LABEL CHECK
    # --------------------------------------------------------

    unknown_labels = sorted(
        set(
            label
            for _, label in samples
        )
        - set(CLASS_NAMES)
    )

    if unknown_labels:

        raise RuntimeError(
            "Dataset contains labels not "
            "present in checkpoint:\n"
            f"{unknown_labels}"
        )

    # --------------------------------------------------------
    # DATASET / DATALOADER
    # --------------------------------------------------------

    dataset = (
        CapsuleEvaluationDataset(
            samples,
            CLASS_TO_INDEX,
            create_transform(),
        )
    )

    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=(
            DEVICE.type == "cuda"
        ),
        drop_last=False,
    )

    # --------------------------------------------------------
    # INFERENCE
    # --------------------------------------------------------

    print()
    print("=" * 90)
    print("RUNNING INFERENCE")
    print("=" * 90)

    (
        true_labels,
        predicted_labels,
        confidences,
        records,
    ) = run_inference(
        model,
        loader,
    )

    # --------------------------------------------------------
    # MULTICLASS
    # --------------------------------------------------------

    (
        accuracy,
        macro_precision,
        macro_recall,
        macro_f1,
    ) = calculate_multiclass_metrics(
        true_labels,
        predicted_labels,
    )

    print()
    print("=" * 90)
    print("FINAL MULTICLASS RESULTS")
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

    # --------------------------------------------------------
    # GOOD VS DEFECTIVE
    # --------------------------------------------------------

    (
        binary_accuracy,
        binary_precision,
        binary_recall,
        binary_f1,
    ) = calculate_binary_metrics(
        true_labels,
        predicted_labels,
    )

    print()
    print("=" * 90)
    print("GOOD VS DEFECTIVE RESULTS")
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

    # --------------------------------------------------------
    # CLASSIFICATION REPORT
    # --------------------------------------------------------

    print()
    print("=" * 90)
    print("PER-CLASS PERFORMANCE")
    print("=" * 90)

    report = classification_report(
        true_labels,
        predicted_labels,
        labels=list(
            range(
                len(CLASS_NAMES)
            )
        ),
        target_names=CLASS_NAMES,
        zero_division=0,
        digits=4,
    )

    print(report)

    # --------------------------------------------------------
    # CONFUSION MATRIX
    # --------------------------------------------------------

    print_confusion_matrix(
        true_labels,
        predicted_labels,
    )

    # --------------------------------------------------------
    # ERROR ANALYSIS
    # --------------------------------------------------------

    print_error_analysis(
        records
    )

    # --------------------------------------------------------
    # CONFIDENCE
    # --------------------------------------------------------

    average_confidence = (
        sum(confidences)
        / len(confidences)
        if confidences
        else 0.0
    )

    print()
    print("=" * 90)
    print("CONFIDENCE ANALYSIS")
    print("=" * 90)

    print(
        f"Average confidence : "
        f"{average_confidence * 100:.2f}%"
    )

    # --------------------------------------------------------
    # TARGET CHECK
    # --------------------------------------------------------

    print()
    print("=" * 90)
    print("90% TARGET CHECK")
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

    if macro_f1 >= 0.90:

        print(
            "✓ MACRO F1: "
            "90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠️ MACRO F1: "
            "90% TARGET NOT ACHIEVED"
        )

    # --------------------------------------------------------
    # PARAMETER COUNT
    # --------------------------------------------------------

    total_parameters = sum(
        parameter.numel()
        for parameter
        in model.parameters()
    )

    # --------------------------------------------------------
    # FINAL VERDICT
    # --------------------------------------------------------

    print()
    print("=" * 90)
    print("FINAL CAPSULE BACKEND VERDICT")
    print("=" * 90)

    if (
        binary_accuracy >= 0.90
        and accuracy >= 0.90
        and macro_f1 >= 0.90
    ):

        print(
            "✓ CAPSULE RESNET18 PASSES"
        )

        print(
            "✓ DEFECT DETECTION TARGET PASSED"
        )

        print(
            "✓ DEFECT TYPE TARGET PASSED"
        )

    else:

        print(
            "⚠️ CAPSULE RESNET18 "
            "DOES NOT YET MEET ALL TARGETS"
        )

    print()
    print(
        "MODEL PARAMETERS : "
        f"{total_parameters:,}"
    )

    print()
    print("=" * 90)
    print(
        "CAPSULE EVALUATION COMPLETE"
    )
    print("=" * 90)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()