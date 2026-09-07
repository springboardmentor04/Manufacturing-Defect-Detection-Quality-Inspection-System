"""
======================================================================
VISIONINSPECT AI
CATEGORY BINARY CNN V2 - EVALUATION
======================================================================

Evaluates an already-trained category-specific binary CNN.

Usage:

    python -m app.ai.evaluate_category_binary_v2 --category cable

    python -m app.ai.evaluate_category_binary_v2 --category bottle

Classes:

    0 = NORMAL
    1 = DEFECTIVE

IMPORTANT:
    This evaluator uses the same stratified split seed as the trainer,
    so it evaluates the exact validation partition used during training.

NO PRETRAINED MODEL
NO IMAGENET
NO RESNET
NO TRANSFER LEARNING
======================================================================
"""

import os
import sys
import random
import argparse
from collections import Counter

import numpy as np
from PIL import Image

import torch
import torch.nn as nn

from torch.utils.data import Dataset, DataLoader

from torchvision import transforms

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)


# ======================================================================
# CONFIG
# ======================================================================

SEED = 42

IMAGE_SIZE = 256

BATCH_SIZE = 8

NUM_WORKERS = 0

VAL_RATIO = 0.20

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# ======================================================================
# PATHS
# ======================================================================

AI_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

BACKEND_DIR = os.path.abspath(
    os.path.join(
        AI_DIR,
        "../.."
    )
)

DATASET_ROOT = os.path.join(
    BACKEND_DIR,
    "dataset",
    "mvtec_ad"
)

MODEL_DIR = os.path.join(
    AI_DIR,
    "saved_models"
)


# ======================================================================
# CATEGORIES
# ======================================================================

CATEGORIES = [
    "bottle",
    "cable",
    "capsule",
    "carpet",
    "grid",
    "hazelnut",
    "leather",
    "metal_nut",
    "pill",
    "screw",
    "tile",
    "toothbrush",
    "transistor",
    "wood",
    "zipper",
]


# ======================================================================
# EXTENSIONS
# ======================================================================

EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}


# ======================================================================
# SEED
# ======================================================================

def set_seed():

    random.seed(
        SEED
    )

    np.random.seed(
        SEED
    )

    torch.manual_seed(
        SEED
    )

    if torch.cuda.is_available():

        torch.cuda.manual_seed_all(
            SEED
        )


# ======================================================================
# VALIDATION TRANSFORM
# ======================================================================

VAL_TRANSFORM = transforms.Compose([

    transforms.Resize(
        (
            IMAGE_SIZE,
            IMAGE_SIZE
        )
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        [
            0.485,
            0.456,
            0.406
        ],
        [
            0.229,
            0.224,
            0.225
        ]
    )
])


# ======================================================================
# DATA COLLECTION
# ======================================================================

def collect_samples(
    category
):

    category_root = os.path.join(
        DATASET_ROOT,
        category
    )

    train_good_dir = os.path.join(
        category_root,
        "train",
        "good"
    )

    test_dir = os.path.join(
        category_root,
        "test"
    )

    if not os.path.isdir(
        train_good_dir
    ):

        raise FileNotFoundError(
            f"Training directory not found:\n"
            f"{train_good_dir}"
        )

    if not os.path.isdir(
        test_dir
    ):

        raise FileNotFoundError(
            f"Test directory not found:\n"
            f"{test_dir}"
        )

    samples = []

    # ------------------------------------------------------------------
    # NORMAL
    # ------------------------------------------------------------------

    for filename in sorted(
        os.listdir(
            train_good_dir
        )
    ):

        path = os.path.join(
            train_good_dir,
            filename
        )

        extension = os.path.splitext(
            filename
        )[1].lower()

        if (
            os.path.isfile(path)
            and
            extension in EXTENSIONS
        ):

            samples.append(
                (
                    path,
                    0
                )
            )

    # ------------------------------------------------------------------
    # DEFECTIVE
    # ------------------------------------------------------------------

    for defect_name in sorted(
        os.listdir(
            test_dir
        )
    ):

        # --------------------------------------------------------------
        # NEVER include test/good as defective
        # --------------------------------------------------------------

        if defect_name.lower() == "good":

            continue

        defect_dir = os.path.join(
            test_dir,
            defect_name
        )

        if not os.path.isdir(
            defect_dir
        ):

            continue

        for filename in sorted(
            os.listdir(
                defect_dir
            )
        ):

            path = os.path.join(
                defect_dir,
                filename
            )

            extension = os.path.splitext(
                filename
            )[1].lower()

            if (
                os.path.isfile(path)
                and
                extension in EXTENSIONS
            ):

                samples.append(
                    (
                        path,
                        1
                    )
                )

    return samples


# ======================================================================
# SAME SPLIT USED BY TRAINER
# ======================================================================

def create_validation_split(
    samples
):

    normal = [
        item
        for item in samples
        if item[1] == 0
    ]

    defective = [
        item
        for item in samples
        if item[1] == 1
    ]

    # IMPORTANT:
    # Same seed and same shuffle behavior as trainer.

    random.seed(
        SEED
    )

    random.shuffle(
        normal
    )

    random.shuffle(
        defective
    )

    normal_val = max(
        1,
        int(
            len(normal)
            *
            VAL_RATIO
        )
    )

    defective_val = max(
        1,
        int(
            len(defective)
            *
            VAL_RATIO
        )
    )

    val_samples = (
        normal[:normal_val]
        +
        defective[:defective_val]
    )

    train_samples = (
        normal[normal_val:]
        +
        defective[defective_val:]
    )

    random.shuffle(
        train_samples
    )

    random.shuffle(
        val_samples
    )

    return (
        train_samples,
        val_samples
    )


# ======================================================================
# DATASET
# ======================================================================

class CategoryDataset(
    Dataset
):

    def __init__(
        self,
        samples
    ):

        self.samples = samples

    def __len__(
        self
    ):

        return len(
            self.samples
        )

    def __getitem__(
        self,
        index
    ):

        path, label = (
            self.samples[index]
        )

        image = Image.open(
            path
        ).convert(
            "RGB"
        )

        image = VAL_TRANSFORM(
            image
        )

        target = torch.tensor(
            label,
            dtype=torch.long
        )

        return (
            image,
            target
        )


# ======================================================================
# CNN BLOCK
# ======================================================================

class ConvBlock(
    nn.Module
):

    def __init__(
        self,
        in_channels,
        out_channels
    ):

        super().__init__()

        self.block = nn.Sequential(

            nn.Conv2d(
                in_channels,
                out_channels,
                kernel_size=3,
                padding=1,
                bias=False
            ),

            nn.BatchNorm2d(
                out_channels
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Conv2d(
                out_channels,
                out_channels,
                kernel_size=3,
                padding=1,
                bias=False
            ),

            nn.BatchNorm2d(
                out_channels
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.MaxPool2d(
                2
            )
        )

    def forward(
        self,
        x
    ):

        return self.block(
            x
        )


# ======================================================================
# EXACT SAME CNN V2 ARCHITECTURE
# ======================================================================

class CategoryCNNV2(
    nn.Module
):

    def __init__(
        self
    ):

        super().__init__()

        self.features = nn.Sequential(

            ConvBlock(
                3,
                32
            ),

            ConvBlock(
                32,
                64
            ),

            ConvBlock(
                64,
                96
            ),

            ConvBlock(
                96,
                128
            ),

            ConvBlock(
                128,
                160
            )
        )

        self.pool = (
            nn.AdaptiveAvgPool2d(
                1
            )
        )

        self.classifier = nn.Sequential(

            nn.Flatten(),

            nn.Linear(
                160,
                64
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                0.30
            ),

            nn.Linear(
                64,
                2
            )
        )

    def forward(
        self,
        x
    ):

        x = self.features(
            x
        )

        x = self.pool(
            x
        )

        return self.classifier(
            x
        )


# ======================================================================
# MODEL PATH
# ======================================================================

def get_model_path(
    category
):

    return os.path.join(
        MODEL_DIR,
        f"{category}_binary_v2.pth"
    )


# ======================================================================
# LOAD MODEL
# ======================================================================

def load_model(
    category
):

    model_path = get_model_path(
        category
    )

    if not os.path.exists(
        model_path
    ):

        raise FileNotFoundError(
            f"\nModel checkpoint not found:\n"
            f"{model_path}"
        )

    checkpoint = torch.load(
        model_path,
        map_location=DEVICE
    )

    model = CategoryCNNV2().to(
        DEVICE
    )

    # --------------------------------------------------------------
    # Support our checkpoint format
    # --------------------------------------------------------------

    if (
        isinstance(
            checkpoint,
            dict
        )
        and
        "model_state_dict"
        in checkpoint
    ):

        state_dict = checkpoint[
            "model_state_dict"
        ]

    else:

        state_dict = checkpoint

    model.load_state_dict(
        state_dict
    )

    model.eval()

    return (
        model,
        checkpoint,
        model_path
    )


# ======================================================================
# EVALUATION
# ======================================================================

@torch.no_grad()
def evaluate(
    model,
    loader
):

    model.eval()

    labels = []

    predictions = []

    probabilities = []

    paths = []

    offset = 0

    for images, targets in loader:

        images = images.to(
            DEVICE
        )

        outputs = model(
            images
        )

        probs = torch.softmax(
            outputs,
            dim=1
        )

        predicted = (
            outputs.argmax(
                dim=1
            )
        )

        batch_size = (
            len(targets)
        )

        labels.extend(
            targets.tolist()
        )

        predictions.extend(
            predicted.cpu().tolist()
        )

        probabilities.extend(
            probs[:, 1]
            .cpu()
            .tolist()
        )

        offset += batch_size

    accuracy = accuracy_score(
        labels,
        predictions
    )

    precision = precision_score(
        labels,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        labels,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        labels,
        predictions,
        zero_division=0
    )

    cm = confusion_matrix(
        labels,
        predictions,
        labels=[
            0,
            1
        ]
    )

    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "confusion_matrix": cm,
        "labels": labels,
        "predictions": predictions,
        "probabilities": probabilities,
    }


# ======================================================================
# PER-IMAGE ANALYSIS
# ======================================================================

@torch.no_grad()
def detailed_evaluation(
    model,
    samples
):

    model.eval()

    results = []

    for path, actual in samples:

        image = Image.open(
            path
        ).convert(
            "RGB"
        )

        tensor = VAL_TRANSFORM(
            image
        )

        tensor = tensor.unsqueeze(
            0
        ).to(
            DEVICE
        )

        output = model(
            tensor
        )

        probability = torch.softmax(
            output,
            dim=1
        )[0]

        defect_probability = (
            probability[1].item()
        )

        prediction = (
            1
            if defect_probability >= 0.5
            else 0
        )

        confidence = (
            max(
                probability[0].item(),
                probability[1].item()
            )
            *
            100
        )

        results.append({

            "path": path,

            "actual": actual,

            "prediction": prediction,

            "defect_probability":
                defect_probability,

            "confidence":
                confidence,

            "correct":
                prediction == actual
        })

    return results


# ======================================================================
# MAIN EVALUATION
# ======================================================================

def evaluate_category(
    category
):

    print()
    print(
        "=" * 90
    )

    print(
        "VISIONINSPECT AI"
    )

    print(
        "CATEGORY BINARY CNN V2 - EVALUATION"
    )

    print(
        "=" * 90
    )

    print(
        f"Category : {category}"
    )

    print(
        f"Device   : {DEVICE}"
    )

    print(
        "Model    : Custom CNN V2"
    )

    print(
        "Training : FROM SCRATCH"
    )

    print(
        "=" * 90
    )

    # ------------------------------------------------------------------
    # DATA
    # ------------------------------------------------------------------

    samples = collect_samples(
        category
    )

    counts = Counter(
        label
        for _, label
        in samples
    )

    print()
    print(
        "DATASET"
    )

    print(
        f"Normal       : {counts[0]}"
    )

    print(
        f"Defective    : {counts[1]}"
    )

    print(
        f"Total        : {len(samples)}"
    )

    # ------------------------------------------------------------------
    # SPLIT
    # ------------------------------------------------------------------

    (
        train_samples,
        val_samples
    ) = create_validation_split(
        samples
    )

    val_counts = Counter(
        label
        for _, label
        in val_samples
    )

    print()
    print(
        "VALIDATION SET"
    )

    print(
        f"Total        : "
        f"{len(val_samples)}"
    )

    print(
        f"Normal       : "
        f"{val_counts[0]}"
    )

    print(
        f"Defective    : "
        f"{val_counts[1]}"
    )

    # ------------------------------------------------------------------
    # MODEL
    # ------------------------------------------------------------------

    (
        model,
        checkpoint,
        model_path
    ) = load_model(
        category
    )

    print()
    print(
        "MODEL"
    )

    print(
        f"Checkpoint : "
        f"{model_path}"
    )

    print(
        "Pretrained : NO"
    )

    print(
        "ImageNet   : NO"
    )

    print(
        "ResNet     : NO"
    )

    print(
        "Transfer   : NO"
    )

    print(
        "From scratch: YES"
    )

    # ------------------------------------------------------------------
    # VALIDATION LOADER
    # ------------------------------------------------------------------

    dataset = CategoryDataset(
        val_samples
    )

    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS
    )

    # ------------------------------------------------------------------
    # EVALUATE
    # ------------------------------------------------------------------

    print()
    print(
        "RUNNING VALIDATION INFERENCE..."
    )

    metrics = evaluate(
        model,
        loader
    )

    # ------------------------------------------------------------------
    # RESULTS
    # ------------------------------------------------------------------

    print()
    print(
        "=" * 90
    )

    print(
        "VALIDATION RESULTS"
    )

    print(
        "=" * 90
    )

    print(
        f"Accuracy   : "
        f"{metrics['accuracy'] * 100:.2f}%"
    )

    print(
        f"Precision  : "
        f"{metrics['precision'] * 100:.2f}%"
    )

    print(
        f"Recall     : "
        f"{metrics['recall'] * 100:.2f}%"
    )

    print(
        f"F1 Score   : "
        f"{metrics['f1'] * 100:.2f}%"
    )

    # ------------------------------------------------------------------
    # CONFUSION MATRIX
    # ------------------------------------------------------------------

    cm = metrics[
        "confusion_matrix"
    ]

    print()
    print(
        "CONFUSION MATRIX"
    )

    print(
        "              Predicted"
    )

    print(
        "              Normal  Defect"
    )

    print(
        f"Actual Normal "
        f"{cm[0][0]:>8}"
        f"{cm[0][1]:>8}"
    )

    print(
        f"Actual Defect "
        f"{cm[1][0]:>8}"
        f"{cm[1][1]:>8}"
    )

    # ------------------------------------------------------------------
    # ERROR ANALYSIS
    # ------------------------------------------------------------------

    detailed = detailed_evaluation(
        model,
        val_samples
    )

    false_positives = [
        item
        for item in detailed
        if (
            item["actual"] == 0
            and
            item["prediction"] == 1
        )
    ]

    false_negatives = [
        item
        for item in detailed
        if (
            item["actual"] == 1
            and
            item["prediction"] == 0
        )
    ]

    print()
    print(
        "ERROR ANALYSIS"
    )

    print(
        f"False Positives : "
        f"{len(false_positives)}"
    )

    print(
        f"False Negatives : "
        f"{len(false_negatives)}"
    )

    # ------------------------------------------------------------------
    # FALSE POSITIVES
    # ------------------------------------------------------------------

    if false_positives:

        print()
        print(
            "FALSE POSITIVES"
        )

        for item in false_positives:

            print(
                f"  {os.path.basename(item['path']):<15}"
                f"Defect probability: "
                f"{item['defect_probability'] * 100:6.2f}%"
            )

    # ------------------------------------------------------------------
    # FALSE NEGATIVES
    # ------------------------------------------------------------------

    if false_negatives:

        print()
        print(
            "FALSE NEGATIVES"
        )

        for item in false_negatives:

            print(
                f"  {os.path.basename(item['path']):<15}"
                f"Defect probability: "
                f"{item['defect_probability'] * 100:6.2f}%"
            )

    # ------------------------------------------------------------------
    # CONFIDENCE SUMMARY
    # ------------------------------------------------------------------

    correct = [
        item
        for item in detailed
        if item["correct"]
    ]

    incorrect = [
        item
        for item in detailed
        if not item["correct"]
    ]

    if correct:

        correct_confidence = np.mean(
            [
                item["confidence"]
                for item in correct
            ]
        )

    else:

        correct_confidence = 0.0

    if incorrect:

        incorrect_confidence = np.mean(
            [
                item["confidence"]
                for item in incorrect
            ]
        )

    else:

        incorrect_confidence = 0.0

    print()
    print(
        "CONFIDENCE ANALYSIS"
    )

    print(
        f"Correct predictions "
        f"average confidence : "
        f"{correct_confidence:.2f}%"
    )

    print(
        f"Incorrect predictions "
        f"average confidence : "
        f"{incorrect_confidence:.2f}%"
    )

    # ------------------------------------------------------------------
    # FINAL VERDICT
    # ------------------------------------------------------------------

    print()
    print(
        "=" * 90
    )

    print(
        "MODEL VERDICT"
    )

    print(
        "=" * 90
    )

    if metrics["accuracy"] >= 0.90:

        print(
            "✅ VALIDATION ACCURACY >= 90%"
        )

    else:

        print(
            "⚠️ VALIDATION ACCURACY < 90%"
        )

    if metrics["f1"] >= 0.90:

        print(
            "✅ VALIDATION F1 >= 90%"
        )

    else:

        print(
            "⚠️ VALIDATION F1 < 90%"
        )

    print()

    print(
        "This result is based on the "
        "validation split used by the trainer."
    )

    print(
        "It is NOT an independent external "
        "test-set accuracy."
    )

    print(
        "=" * 90
    )


# ======================================================================
# ARGUMENTS
# ======================================================================

def main():

    set_seed()

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--category",
        required=True,
        type=str
    )

    args = parser.parse_args()

    category = (
        args.category
        .strip()
        .lower()
    )

    if category not in CATEGORIES:

        print()
        print(
            "❌ INVALID CATEGORY"
        )

        print()
        print(
            "Available:"
        )

        for name in CATEGORIES:

            print(
                f"  {name}"
            )

        sys.exit(1)

    evaluate_category(
        category
    )


# ======================================================================
# ENTRY POINT
# ======================================================================

if __name__ == "__main__":

    main()