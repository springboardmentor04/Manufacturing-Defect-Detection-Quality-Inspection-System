"""
VisionInspect AI
Carpet ResNet18 Evaluation

IMPORTANT:
This evaluator matches the ORIGINAL generic
train_resnet18_category.py architecture used for:

    bottle
    cable
    hazelnut
    carpet

Model architecture:

    ImageNet ResNet18
        ↓
    Dropout(0.35)
        ↓
    Linear(512 -> number_of_classes)

The evaluator intentionally does NOT use the capsule-specific
BatchNorm-free 256-unit classifier.
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFile

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)


ImageFile.LOAD_TRUNCATED_IMAGES = True


# =============================================================================
# CONFIGURATION
# =============================================================================

CATEGORY = "carpet"

IMAGE_SIZE = 224
BATCH_SIZE = 8

NUM_WORKERS = 0

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# =============================================================================
# PATHS
# =============================================================================

APP_DIR = Path(__file__).resolve().parent

BACKEND_DIR = APP_DIR.parent.parent

DATASET_ROOT = (
    BACKEND_DIR
    / "dataset"
    / "mvtec_ad"
)

MODEL_DIR = (
    APP_DIR
    / "saved_models"
)

MODEL_PATH = (
    MODEL_DIR
    / f"{CATEGORY}_resnet18.pth"
)

METADATA_PATH = (
    MODEL_DIR
    / f"{CATEGORY}_resnet18_metadata.json"
)


# =============================================================================
# TRANSFORM
# =============================================================================

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


# =============================================================================
# DATASET
# =============================================================================

class CarpetEvaluationDataset(Dataset):

    def __init__(
        self,
        samples,
        class_to_index,
    ):

        self.samples = samples

        self.class_to_index = (
            class_to_index
        )

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

            image = (
                Image.open(
                    image_path
                )
                .convert("RGB")
            )

        except Exception as exc:

            raise RuntimeError(
                f"Unable to read image:\n"
                f"{image_path}"
            ) from exc

        image = TRANSFORM(
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


# =============================================================================
# COLLECT DATASET
# =============================================================================

VALID_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".webp",
}


def collect_dataset():

    category_root = (
        DATASET_ROOT
        / CATEGORY
    )

    if not category_root.exists():

        raise FileNotFoundError(
            f"""
Carpet dataset not found:

{category_root}

Expected structure:

dataset/
└── mvtec_ad/
    └── carpet/
        ├── train/
        │   └── good/
        └── test/
            ├── good/
            ├── color/
            ├── cut/
            ├── hole/
            ├── metal_contamination/
            └── thread/
"""
        )

    samples = []

    # -------------------------------------------------------------------------
    # GOOD IMAGES
    #
    # Same logic as the generic trainer:
    #
    # train/good
    # test/good
    # -------------------------------------------------------------------------

    train_good = (
        category_root
        / "train"
        / "good"
    )

    test_good = (
        category_root
        / "test"
        / "good"
    )

    for directory in [
        train_good,
        test_good,
    ]:

        if not directory.exists():

            continue

        for image_path in sorted(
            directory.iterdir()
        ):

            if (
                image_path.is_file()
                and image_path.suffix.lower()
                in VALID_EXTENSIONS
            ):

                samples.append(
                    (
                        image_path,
                        "good",
                    )
                )

    # -------------------------------------------------------------------------
    # DEFECT IMAGES
    #
    # test/<defect>
    # -------------------------------------------------------------------------

    test_root = (
        category_root
        / "test"
    )

    if not test_root.exists():

        raise FileNotFoundError(
            f"Test directory not found:\n"
            f"{test_root}"
        )

    for defect_directory in sorted(
        test_root.iterdir()
    ):

        if not defect_directory.is_dir():

            continue

        if defect_directory.name == "good":

            continue

        defect_name = (
            defect_directory.name
        )

        for image_path in sorted(
            defect_directory.iterdir()
        ):

            if (
                image_path.is_file()
                and image_path.suffix.lower()
                in VALID_EXTENSIONS
            ):

                samples.append(
                    (
                        image_path,
                        defect_name,
                    )
                )

    if not samples:

        raise RuntimeError(
            "No carpet images found."
        )

    return samples


# =============================================================================
# MODEL
# =============================================================================

def create_model(
    number_of_classes,
):

    # ImageNet pretrained ResNet18.
    #
    # The weights themselves are not required when loading
    # the complete checkpoint, but using the same architecture
    # guarantees an exact state_dict match.

    model = models.resnet18(
        weights=None
    )

    input_features = (
        model.fc.in_features
    )

    # EXACT ARCHITECTURE USED BY THE GENERIC TRAINER
    #
    # ResNet18.fc:
    #
    # Dropout(0.35)
    # Linear(512 -> classes)
    #
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


# =============================================================================
# CHECKPOINT LOADING
# =============================================================================

def load_checkpoint():

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            f"""
Carpet model not found:

{MODEL_PATH}

Train the carpet model first:

python -m app.ai.train_resnet18_category --category carpet
"""
        )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location="cpu",
    )

    # -------------------------------------------------------------------------
    # Extract class information
    # -------------------------------------------------------------------------

    classes = None

    if isinstance(
        checkpoint,
        dict,
    ):

        if "classes" in checkpoint:

            classes = checkpoint[
                "classes"
            ]

        elif "class_names" in checkpoint:

            classes = checkpoint[
                "class_names"
            ]

        elif "metadata" in checkpoint:

            metadata = checkpoint[
                "metadata"
            ]

            if isinstance(
                metadata,
                dict,
            ):

                classes = metadata.get(
                    "classes"
                )

    # -------------------------------------------------------------------------
    # Fallback to metadata file
    # -------------------------------------------------------------------------

    if classes is None and METADATA_PATH.exists():

        try:

            with open(
                METADATA_PATH,
                "r",
                encoding="utf-8",
            ) as file:

                metadata = json.load(
                    file
                )

            classes = metadata.get(
                "classes"
            )

            if classes is None:

                classes = metadata.get(
                    "class_names"
                )

        except Exception:

            classes = None

    # -------------------------------------------------------------------------
    # Carpet fallback
    #
    # This is only used if the checkpoint doesn't contain
    # class metadata.
    # -------------------------------------------------------------------------

    if classes is None:

        classes = [
            "good",
            "color",
            "cut",
            "hole",
            "metal_contamination",
            "thread",
        ]

    classes = list(
        classes
    )

    print()
    print(
        "Classes:"
    )

    for index, name in enumerate(
        classes
    ):

        print(
            f"  {index}: {name}"
        )

    # -------------------------------------------------------------------------
    # Create exact model
    # -------------------------------------------------------------------------

    model = create_model(
        len(classes)
    )

    # -------------------------------------------------------------------------
    # Extract state_dict
    # -------------------------------------------------------------------------

    state_dict = None

    if isinstance(
        checkpoint,
        dict,
    ):

        if (
            "model_state_dict"
            in checkpoint
        ):

            state_dict = checkpoint[
                "model_state_dict"
            ]

        elif (
            "state_dict"
            in checkpoint
        ):

            state_dict = checkpoint[
                "state_dict"
            ]

        else:

            # Some checkpoints are raw state_dicts.
            possible_state = checkpoint

            if all(
                isinstance(
                    value,
                    torch.Tensor,
                )
                for value
                in possible_state.values()
            ):

                state_dict = (
                    possible_state
                )

    elif isinstance(
        checkpoint,
        dict,
    ):

        state_dict = checkpoint

    if state_dict is None:

        raise RuntimeError(
            """
Could not find model_state_dict
inside the carpet checkpoint.
"""
        )

    # -------------------------------------------------------------------------
    # Remove DataParallel prefix if present
    # -------------------------------------------------------------------------

    cleaned_state_dict = {}

    for key, value in state_dict.items():

        if key.startswith(
            "module."
        ):

            key = key[
                len("module.") :
            ]

        cleaned_state_dict[
            key
        ] = value

    # -------------------------------------------------------------------------
    # STRICT LOAD
    #
    # This should succeed for the generic trainer.
    # -------------------------------------------------------------------------

    try:

        model.load_state_dict(
            cleaned_state_dict,
            strict=True,
        )

    except RuntimeError as exc:

        raise RuntimeError(
            f"""
CARPET CHECKPOINT / ARCHITECTURE MISMATCH

The checkpoint is:

{MODEL_PATH}

Expected architecture:

ResNet18
    fc = Sequential(
        Dropout(0.35),
        Linear(512, {len(classes)})
    )

The checkpoint could not be loaded strictly.

Original error:

{exc}
"""
        ) from exc

    model = model.to(
        DEVICE
    )

    model.eval()

    return (
        model,
        classes,
        checkpoint,
    )


# =============================================================================
# BINARY LABELS
# =============================================================================

def is_defective(
    class_name,
):

    return (
        class_name.lower()
        != "good"
    )


# =============================================================================
# MAIN EVALUATION
# =============================================================================

def main():

    print()
    print("=" * 90)
    print(
        "VISIONINSPECT AI"
    )
    print(
        "CARPET RESNET18 EVALUATION"
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

    # -------------------------------------------------------------------------
    # LOAD MODEL
    # -------------------------------------------------------------------------

    print()
    print(
        "Loading Carpet ResNet18..."
    )

    (
        model,
        classes,
        checkpoint,
    ) = load_checkpoint()

    print()
    print(
        "✓ Model loaded successfully"
    )

    print(
        "✓ Exact generic trainer architecture matched"
    )

    print(
        "✓ Dropout + Linear classifier confirmed"
    )

    # -------------------------------------------------------------------------
    # MODEL INFORMATION
    # -------------------------------------------------------------------------

    best_epoch = None

    if isinstance(
        checkpoint,
        dict,
    ):

        best_epoch = checkpoint.get(
            "best_epoch"
        )

    if best_epoch is None and METADATA_PATH.exists():

        try:

            with open(
                METADATA_PATH,
                "r",
                encoding="utf-8",
            ) as file:

                metadata = json.load(
                    file
                )

            best_epoch = metadata.get(
                "best_epoch"
            )

        except Exception:

            pass

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

    if best_epoch is not None:

        print(
            f"Best epoch   : {best_epoch}"
        )

    print(
        f"Model path   : {MODEL_PATH}"
    )

    # -------------------------------------------------------------------------
    # DATASET
    # -------------------------------------------------------------------------

    print()
    print("=" * 90)
    print(
        "EVALUATION DATASET"
    )
    print("=" * 90)

    samples = collect_dataset()

    counts = {}

    for _, label in samples:

        counts[label] = (
            counts.get(label, 0)
            + 1
        )

    # Display in model class order.

    for class_name in classes:

        print(
            f"{class_name:<35}: "
            f"{counts.get(class_name, 0)}"
        )

    print()
    print(
        f"TOTAL IMAGES : "
        f"{len(samples)}"
    )

    # -------------------------------------------------------------------------
    # CLASS INDEX
    # -------------------------------------------------------------------------

    class_to_index = {
        name: index
        for index, name
        in enumerate(classes)
    }

    # -------------------------------------------------------------------------
    # DATASET / LOADER
    # -------------------------------------------------------------------------

    dataset = CarpetEvaluationDataset(
        samples,
        class_to_index,
    )

    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
        drop_last=False,
    )

    # -------------------------------------------------------------------------
    # INFERENCE
    # -------------------------------------------------------------------------

    print()
    print("=" * 90)
    print(
        "RUNNING INFERENCE"
    )
    print("=" * 90)

    all_targets = []
    all_predictions = []
    all_confidences = []
    all_paths = []

    processed = 0

    total = len(
        dataset
    )

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

            confidence, predictions = (
                probabilities.max(
                    dim=1
                )
            )

            all_targets.extend(
                targets.cpu().tolist()
            )

            all_predictions.extend(
                predictions.cpu().tolist()
            )

            all_confidences.extend(
                confidence.cpu().tolist()
            )

            all_paths.extend(
                paths
            )

            processed += len(
                targets
            )

            print(
                f"Processed "
                f"{processed}/{total}"
            )

    # -------------------------------------------------------------------------
    # MULTICLASS METRICS
    # -------------------------------------------------------------------------

    multiclass_accuracy = (
        accuracy_score(
            all_targets,
            all_predictions,
        )
    )

    macro_precision = (
        precision_score(
            all_targets,
            all_predictions,
            average="macro",
            zero_division=0,
        )
    )

    macro_recall = (
        recall_score(
            all_targets,
            all_predictions,
            average="macro",
            zero_division=0,
        )
    )

    macro_f1 = (
        f1_score(
            all_targets,
            all_predictions,
            average="macro",
            zero_division=0,
        )
    )

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

    # -------------------------------------------------------------------------
    # BINARY GOOD VS DEFECTIVE
    # -------------------------------------------------------------------------

    binary_targets = [
        0
        if classes[target] == "good"
        else 1
        for target in all_targets
    ]

    binary_predictions = [
        0
        if classes[prediction] == "good"
        else 1
        for prediction in all_predictions
    ]

    binary_accuracy = (
        accuracy_score(
            binary_targets,
            binary_predictions,
        )
    )

    binary_precision = (
        precision_score(
            binary_targets,
            binary_predictions,
            zero_division=0,
        )
    )

    binary_recall = (
        recall_score(
            binary_targets,
            binary_predictions,
            zero_division=0,
        )
    )

    binary_f1 = (
        f1_score(
            binary_targets,
            binary_predictions,
            zero_division=0,
        )
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

    # -------------------------------------------------------------------------
    # PER CLASS REPORT
    # -------------------------------------------------------------------------

    print()
    print("=" * 90)
    print(
        "PER-CLASS PERFORMANCE"
    )
    print("=" * 90)

    report = classification_report(
        all_targets,
        all_predictions,
        labels=list(
            range(len(classes))
        ),
        target_names=classes,
        digits=4,
        zero_division=0,
    )

    print(report)

    # -------------------------------------------------------------------------
    # CONFUSION MATRIX
    # -------------------------------------------------------------------------

    matrix = confusion_matrix(
        all_targets,
        all_predictions,
        labels=list(
            range(len(classes))
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

    # Dynamic column width.

    column_width = max(
        12,
        max(
            len(name)
            for name in classes
        )
        + 2,
    )

    print(
        "Actual".ljust(
            column_width
        ),
        end="",
    )

    for name in classes:

        print(
            name[:16].rjust(
                column_width
            ),
            end="",
        )

    print()

    for row_index, row in enumerate(
        matrix
    ):

        print(
            classes[row_index].ljust(
                column_width
            ),
            end="",
        )

        for value in row:

            print(
                str(value).rjust(
                    column_width
                ),
                end="",
            )

        print()

    # -------------------------------------------------------------------------
    # ERROR ANALYSIS
    # -------------------------------------------------------------------------

    errors = []

    for (
        target,
        prediction,
        confidence,
        path,
    ) in zip(
        all_targets,
        all_predictions,
        all_confidences,
        all_paths,
    ):

        if target != prediction:

            errors.append(
                {
                    "path": path,
                    "actual": classes[
                        target
                    ],
                    "predicted": classes[
                        prediction
                    ],
                    "confidence": confidence,
                }
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

    print()

    if errors:

        for error in errors:

            filename = Path(
                error["path"]
            ).name

            print(
                f"{filename:<15} "
                f"Actual={error['actual']:<30} "
                f"Predicted={error['predicted']:<30} "
                f"Confidence="
                f"{error['confidence'] * 100:.2f}%"
            )

    else:

        print(
            "✓ No incorrect predictions"
        )

    # -------------------------------------------------------------------------
    # CONFIDENCE
    # -------------------------------------------------------------------------

    average_confidence = float(
        np.mean(
            all_confidences
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

    # -------------------------------------------------------------------------
    # TARGET CHECK
    # -------------------------------------------------------------------------

    print()
    print("=" * 90)
    print(
        "90% TARGET CHECK"
    )
    print("=" * 90)

    binary_pass = (
        binary_accuracy >= 0.90
    )

    defect_type_pass = (
        multiclass_accuracy >= 0.90
    )

    f1_pass = (
        macro_f1 >= 0.90
    )

    if binary_pass:

        print(
            "✓ GOOD VS DEFECTIVE: "
            "90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠️ GOOD VS DEFECTIVE: "
            "90% TARGET NOT ACHIEVED"
        )

    if defect_type_pass:

        print(
            "✓ DEFECT TYPE: "
            "90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠️ DEFECT TYPE: "
            "90% TARGET NOT ACHIEVED"
        )

    if f1_pass:

        print(
            "✓ MACRO F1: "
            "90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠️ MACRO F1: "
            "90% TARGET NOT ACHIEVED"
        )

    # -------------------------------------------------------------------------
    # FINAL VERDICT
    # -------------------------------------------------------------------------

    print()
    print("=" * 90)
    print(
        "FINAL CARPET BACKEND VERDICT"
    )
    print("=" * 90)

    if (
        binary_pass
        and defect_type_pass
        and f1_pass
    ):

        print(
            "✓ CARPET RESNET18 PASSES"
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
            "⚠️ CARPET RESNET18 "
            "DOES NOT YET MEET ALL TARGETS"
        )

    # -------------------------------------------------------------------------
    # PARAMETER COUNT
    # -------------------------------------------------------------------------

    parameter_count = sum(
        parameter.numel()
        for parameter
        in model.parameters()
    )

    print()
    print(
        f"MODEL PARAMETERS : "
        f"{parameter_count:,}"
    )

    print()
    print("=" * 90)
    print(
        "CARPET EVALUATION COMPLETE"
    )
    print("=" * 90)


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":

    main()