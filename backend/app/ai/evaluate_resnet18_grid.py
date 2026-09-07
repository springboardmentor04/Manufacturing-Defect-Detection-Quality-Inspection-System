"""
VISIONINSPECT AI
GRID RESNET18 FULL DATASET EVALUATION

Matches the generic train_resnet18_category.py trainer.

Architecture:
    ImageNet ResNet18
        -> Dropout(0.35)
        -> Linear(512 -> number of classes)

Category:
    grid
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


# =============================================================================
# CONFIG
# =============================================================================

CATEGORY = "grid"

IMAGE_SIZE = 224
BATCH_SIZE = 8
NUM_WORKERS = 0

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

ImageFile.LOAD_TRUNCATED_IMAGES = True


# =============================================================================
# PATHS
# =============================================================================

APP_DIR = Path(__file__).resolve().parent

BACKEND_DIR = APP_DIR.parent.parent

DATASET_ROOT = BACKEND_DIR / "dataset" / "mvtec_ad"

CATEGORY_ROOT = DATASET_ROOT / CATEGORY

MODEL_DIR = APP_DIR / "saved_models"

MODEL_PATH = MODEL_DIR / f"{CATEGORY}_resnet18.pth"

METADATA_PATH = (
    MODEL_DIR / f"{CATEGORY}_resnet18_metadata.json"
)


# =============================================================================
# IMAGE TRANSFORM
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

VALID_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".webp",
}


class GridEvaluationDataset(Dataset):

    def __init__(
        self,
        samples,
        class_to_index,
    ):
        self.samples = samples
        self.class_to_index = class_to_index

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):

        image_path, class_name = self.samples[index]

        try:

            image = (
                Image.open(image_path)
                .convert("RGB")
            )

        except Exception as exc:

            raise RuntimeError(
                f"Could not read image:\n{image_path}"
            ) from exc

        image = TRANSFORM(image)

        label = self.class_to_index[class_name]

        return (
            image,
            label,
            str(image_path),
        )


# =============================================================================
# COLLECT DATASET
# =============================================================================

def collect_dataset():

    if not CATEGORY_ROOT.exists():

        raise FileNotFoundError(
            f"""
Grid dataset not found:

{CATEGORY_ROOT}

Expected:

dataset/
└── mvtec_ad/
    └── grid/
        ├── train/
        │   └── good/
        └── test/
            ├── good/
            ├── bent/
            ├── broken/
            ├── glue/
            ├── metal_contamination/
            └── thread/
"""
        )

    samples = []

    # -------------------------------------------------------------------------
    # GOOD
    #
    # Same dataset logic as the trainer:
    # train/good + test/good
    # -------------------------------------------------------------------------

    train_good = (
        CATEGORY_ROOT
        / "train"
        / "good"
    )

    test_good = (
        CATEGORY_ROOT
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
    # DEFECTS
    #
    # test/<defect>
    # -------------------------------------------------------------------------

    test_root = CATEGORY_ROOT / "test"

    if not test_root.exists():

        raise FileNotFoundError(
            f"Test directory not found:\n{test_root}"
        )

    for defect_dir in sorted(
        test_root.iterdir()
    ):

        if not defect_dir.is_dir():
            continue

        if defect_dir.name == "good":
            continue

        defect_name = defect_dir.name

        for image_path in sorted(
            defect_dir.iterdir()
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
            "No grid images were found."
        )

    return samples


# =============================================================================
# MODEL
# =============================================================================

def create_model(
    num_classes,
):

    # Same ResNet18 architecture used by
    # the generic trainer.

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
            num_classes,
        ),
    )

    return model


# =============================================================================
# CHECKPOINT EXTRACTION
# =============================================================================

def extract_state_dict(
    checkpoint,
):

    if not isinstance(
        checkpoint,
        dict,
    ):

        raise RuntimeError(
            "Unsupported checkpoint format."
        )

    if "model_state_dict" in checkpoint:

        return checkpoint[
            "model_state_dict"
        ]

    if "state_dict" in checkpoint:

        return checkpoint[
            "state_dict"
        ]

    # Raw state_dict

    if all(
        isinstance(
            value,
            torch.Tensor,
        )
        for value in checkpoint.values()
    ):

        return checkpoint

    raise RuntimeError(
        """
Could not find model_state_dict
or state_dict in checkpoint.
"""
    )


# =============================================================================
# CLASS EXTRACTION
# =============================================================================

def extract_classes(
    checkpoint,
):

    classes = None

    if isinstance(
        checkpoint,
        dict,
    ):

        classes = checkpoint.get(
            "classes"
        )

        if classes is None:

            classes = checkpoint.get(
                "class_names"
            )

        if classes is None:

            metadata = checkpoint.get(
                "metadata"
            )

            if isinstance(
                metadata,
                dict,
            ):

                classes = metadata.get(
                    "classes"
                )

                if classes is None:

                    classes = metadata.get(
                        "class_names"
                    )

    # Metadata file fallback

    if (
        classes is None
        and METADATA_PATH.exists()
    ):

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

    # Grid fallback

    if classes is None:

        classes = [
            "good",
            "bent",
            "broken",
            "glue",
            "metal_contamination",
            "thread",
        ]

    return list(classes)


# =============================================================================
# LOAD MODEL
# =============================================================================

def load_model():

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            f"""
Grid model not found:

{MODEL_PATH}

Train it first with:

python -m app.ai.train_resnet18_category --category grid
"""
        )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location="cpu",
    )

    classes = extract_classes(
        checkpoint
    )

    print()
    print("Classes:")

    for index, class_name in enumerate(
        classes
    ):

        print(
            f"  {index}: {class_name}"
        )

    model = create_model(
        len(classes)
    )

    state_dict = extract_state_dict(
        checkpoint
    )

    # Remove DataParallel prefix.

    cleaned_state_dict = {}

    for key, value in state_dict.items():

        if key.startswith(
            "module."
        ):

            key = key[
                len("module.") :
            ]

        cleaned_state_dict[key] = value

    # -------------------------------------------------------------------------
    # STRICT LOAD
    # -------------------------------------------------------------------------

    try:

        model.load_state_dict(
            cleaned_state_dict,
            strict=True,
        )

    except RuntimeError as exc:

        raise RuntimeError(
            f"""
GRID CHECKPOINT / ARCHITECTURE MISMATCH

Expected:

ResNet18
    fc = Sequential(
        Dropout(0.35),
        Linear(512, {len(classes)})
    )

Checkpoint:

{MODEL_PATH}

Original loading error:

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
# MAIN
# =============================================================================

def main():

    print()
    print("=" * 90)
    print(
        "VISIONINSPECT AI"
    )
    print(
        "GRID RESNET18 EVALUATION"
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

    # =========================================================================
    # LOAD MODEL
    # =========================================================================

    print()
    print(
        "Loading Grid ResNet18..."
    )

    (
        model,
        classes,
        checkpoint,
    ) = load_model()

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

    # =========================================================================
    # MODEL INFORMATION
    # =========================================================================

    best_epoch = None

    if isinstance(
        checkpoint,
        dict,
    ):

        best_epoch = checkpoint.get(
            "best_epoch"
        )

    if (
        best_epoch is None
        and METADATA_PATH.exists()
    ):

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

    # =========================================================================
    # DATASET
    # =========================================================================

    print()
    print("=" * 90)
    print(
        "EVALUATION DATASET"
    )
    print("=" * 90)

    samples = collect_dataset()

    counts = {}

    for _, class_name in samples:

        counts[class_name] = (
            counts.get(
                class_name,
                0
            )
            + 1
        )

    for class_name in classes:

        print(
            f"{class_name:<35}: "
            f"{counts.get(class_name, 0)}"
        )

    print()

    print(
        f"TOTAL IMAGES : {len(samples)}"
    )

    # =========================================================================
    # DATASET
    # =========================================================================

    class_to_index = {
        class_name: index
        for index, class_name
        in enumerate(classes)
    }

    dataset = GridEvaluationDataset(
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

    # =========================================================================
    # INFERENCE
    # =========================================================================

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

    total = len(dataset)

    with torch.no_grad():

        for (
            images,
            targets,
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

    # =========================================================================
    # MULTICLASS RESULTS
    # =========================================================================

    accuracy = accuracy_score(
        all_targets,
        all_predictions,
    )

    macro_precision = precision_score(
        all_targets,
        all_predictions,
        average="macro",
        zero_division=0,
    )

    macro_recall = recall_score(
        all_targets,
        all_predictions,
        average="macro",
        zero_division=0,
    )

    macro_f1 = f1_score(
        all_targets,
        all_predictions,
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
    # =========================================================================

    binary_targets = []

    binary_predictions = []

    for target, prediction in zip(
        all_targets,
        all_predictions,
    ):

        actual_name = classes[
            target
        ]

        predicted_name = classes[
            prediction
        ]

        binary_targets.append(
            0
            if actual_name == "good"
            else 1
        )

        binary_predictions.append(
            0
            if predicted_name == "good"
            else 1
        )

    binary_accuracy = accuracy_score(
        binary_targets,
        binary_predictions,
    )

    binary_precision = precision_score(
        binary_targets,
        binary_predictions,
        zero_division=0,
    )

    binary_recall = recall_score(
        binary_targets,
        binary_predictions,
        zero_division=0,
    )

    binary_f1 = f1_score(
        binary_targets,
        binary_predictions,
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
    # PER CLASS
    # =========================================================================

    print()
    print("=" * 90)
    print(
        "PER-CLASS PERFORMANCE"
    )
    print("=" * 90)

    print(
        classification_report(
            all_targets,
            all_predictions,
            labels=list(
                range(len(classes))
            ),
            target_names=classes,
            digits=4,
            zero_division=0,
        )
    )

    # =========================================================================
    # CONFUSION MATRIX
    # =========================================================================

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

    width = max(
        14,
        max(
            len(name)
            for name in classes
        )
        + 2,
    )

    print(
        "Actual".ljust(width),
        end="",
    )

    for name in classes:

        print(
            name[:16].rjust(width),
            end="",
        )

    print()

    for row_index, row in enumerate(
        matrix
    ):

        print(
            classes[row_index].ljust(
                width
            ),
            end="",
        )

        for value in row:

            print(
                str(value).rjust(width),
                end="",
            )

        print()

    # =========================================================================
    # ERROR ANALYSIS
    # =========================================================================

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
                (
                    path,
                    classes[target],
                    classes[prediction],
                    confidence,
                )
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

        for (
            path,
            actual,
            predicted,
            confidence,
        ) in errors:

            filename = Path(
                path
            ).name

            print(
                f"{filename:<15} "
                f"Actual={actual:<30} "
                f"Predicted={predicted:<30} "
                f"Confidence="
                f"{confidence * 100:.2f}%"
            )

    else:

        print(
            "✓ No incorrect predictions"
        )

    # =========================================================================
    # CONFIDENCE
    # =========================================================================

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

    # =========================================================================
    # TARGET CHECK
    # =========================================================================

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
        accuracy >= 0.90
    )

    macro_f1_pass = (
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

    if macro_f1_pass:

        print(
            "✓ MACRO F1: "
            "90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠️ MACRO F1: "
            "90% TARGET NOT ACHIEVED"
        )

    # =========================================================================
    # FINAL VERDICT
    # =========================================================================

    print()
    print("=" * 90)
    print(
        "FINAL GRID BACKEND VERDICT"
    )
    print("=" * 90)

    if (
        binary_pass
        and defect_type_pass
        and macro_f1_pass
    ):

        print(
            "✓ GRID RESNET18 PASSES"
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
            "⚠️ GRID RESNET18 "
            "DOES NOT YET MEET ALL TARGETS"
        )

    # =========================================================================
    # PARAMETERS
    # =========================================================================

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
        "GRID EVALUATION COMPLETE"
    )
    print("=" * 90)


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":

    main()