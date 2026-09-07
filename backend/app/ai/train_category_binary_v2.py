"""
======================================================================
VISIONINSPECT AI
CATEGORY BINARY DEFECT DETECTOR V2
======================================================================

Usage:

    python -m app.ai.train_category_binary_v2 --category cable

    python -m app.ai.train_category_binary_v2 --category bottle

    python -m app.ai.train_category_binary_v2 --category all

Classes:

    0 = GOOD
    1 = DEFECTIVE

Dataset structure:

    dataset/mvtec_ad/
        category/
            train/
                good/
            test/
                good/
                defect_1/
                defect_2/
                ...

IMPORTANT:

    train/good       -> NORMAL
    test/good        -> NORMAL and EXCLUDED
    test/<defect>    -> DEFECTIVE

NO PRETRAINED MODEL
NO IMAGENET
NO RESNET
NO TRANSFER LEARNING

Training from scratch.

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
import torch.optim as optim

from torch.utils.data import (
    Dataset,
    DataLoader,
    WeightedRandomSampler,
)

from torchvision import transforms

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)


# ======================================================================
# CONFIGURATION
# ======================================================================

SEED = 42

IMAGE_SIZE = 256

BATCH_SIZE = 8

EPOCHS = 20

LEARNING_RATE = 0.0003

WEIGHT_DECAY = 1e-4

VAL_RATIO = 0.20

PATIENCE = 6

NUM_WORKERS = 0

GRADIENT_CLIP = 1.0

MINIMUM_SAMPLES = 20


# ======================================================================
# DEVICE
# ======================================================================

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

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)


# ======================================================================
# SUPPORTED CATEGORIES
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
# IMAGE EXTENSIONS
# ======================================================================

EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}


# ======================================================================
# REPRODUCIBILITY
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
# TRANSFORMS
# ======================================================================

TRAIN_TRANSFORM = transforms.Compose([

    transforms.Resize(
        (
            IMAGE_SIZE,
            IMAGE_SIZE
        )
    ),

    transforms.RandomHorizontalFlip(
        p=0.5
    ),

    transforms.RandomRotation(
        4
    ),

    transforms.ColorJitter(
        brightness=0.05,
        contrast=0.05
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
    ),
])


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
    ),
])


# ======================================================================
# ARGUMENTS
# ======================================================================

def parse_arguments():

    parser = argparse.ArgumentParser(
        description=(
            "Train VisionInspect AI "
            "category-specific binary CNN "
            "from scratch."
        )
    )

    parser.add_argument(
        "--category",
        type=str,
        required=True,
        help=(
            "Category name or 'all'. "
            "Example: cable"
        )
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help=(
            "Retrain even if a checkpoint "
            "already exists."
        )
    )

    return parser.parse_args()


# ======================================================================
# DATASET COLLECTION
# ======================================================================

def collect_category_samples(
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
        category_root
    ):

        raise FileNotFoundError(
            f"\nCategory directory not found:\n"
            f"{category_root}"
        )

    if not os.path.isdir(
        train_good_dir
    ):

        raise FileNotFoundError(
            f"\nTraining good directory not found:\n"
            f"{train_good_dir}"
        )

    if not os.path.isdir(
        test_dir
    ):

        raise FileNotFoundError(
            f"\nTest directory not found:\n"
            f"{test_dir}"
        )

    samples = []

    defect_counts = Counter()

    # ------------------------------------------------------------------
    # NORMAL
    # ------------------------------------------------------------------

    normal_count = 0

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

            normal_count += 1

    # ------------------------------------------------------------------
    # DEFECTIVE
    # ------------------------------------------------------------------

    defective_count = 0

    skipped_test_good = 0

    for defect_name in sorted(
        os.listdir(
            test_dir
        )
    ):

        # ==============================================================
        # CRITICAL MVTec RULE
        # ==============================================================

        if defect_name.lower() == "good":

            good_dir = os.path.join(
                test_dir,
                defect_name
            )

            if os.path.isdir(
                good_dir
            ):

                for filename in os.listdir(
                    good_dir
                ):

                    extension = (
                        os.path.splitext(
                            filename
                        )[1].lower()
                    )

                    if extension in EXTENSIONS:

                        skipped_test_good += 1

            continue

        defect_dir = os.path.join(
            test_dir,
            defect_name
        )

        if not os.path.isdir(
            defect_dir
        ):

            continue

        count = 0

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

                count += 1

                defective_count += 1

        defect_counts[
            defect_name
        ] = count

    # ------------------------------------------------------------------
    # REPORT
    # ------------------------------------------------------------------

    print()
    print(
        "=" * 90
    )

    print(
        "DATASET COLLECTION"
    )

    print(
        "=" * 90
    )

    print(
        f"Category          : "
        f"{category}"
    )

    print(
        f"Normal            : "
        f"{normal_count}"
    )

    print(
        f"Defective         : "
        f"{defective_count}"
    )

    print(
        f"Total             : "
        f"{len(samples)}"
    )

    print(
        f"test/good skipped : "
        f"{skipped_test_good}"
    )

    print()

    print(
        "DEFECT TYPES"
    )

    for (
        name,
        count
    ) in sorted(
        defect_counts.items()
    ):

        print(
            f"  {name:<30}"
            f"{count:>6}"
        )

    return (
        samples,
        defect_counts,
        skipped_test_good
    )


# ======================================================================
# DATASET VALIDATION
# ======================================================================

def validate_samples(
    category,
    samples
):

    counts = Counter(
        label
        for _, label
        in samples
    )

    normal_count = counts[0]

    defective_count = counts[1]

    total = len(
        samples
    )

    print()
    print(
        "=" * 90
    )

    print(
        "DATASET VALIDATION"
    )

    print(
        "=" * 90
    )

    print(
        f"Normal       : "
        f"{normal_count}"
    )

    print(
        f"Defective    : "
        f"{defective_count}"
    )

    print(
        f"Total        : "
        f"{total}"
    )

    # ------------------------------------------------------------------
    # BASIC CHECKS
    # ------------------------------------------------------------------

    if total < MINIMUM_SAMPLES:

        raise RuntimeError(
            f"\nCategory '{category}' contains "
            f"only {total} samples."
        )

    if normal_count == 0:

        raise RuntimeError(
            f"\nCategory '{category}' "
            f"has no normal samples."
        )

    if defective_count == 0:

        raise RuntimeError(
            f"\nCategory '{category}' "
            f"has no defective samples."
        )

    print()

    print(
        "✓ Normal class exists"
    )

    print(
        "✓ Defective class exists"
    )

    print(
        "✓ Minimum sample requirement passed"
    )

    print(
        "✓ Dataset is valid for binary training"
    )

    print(
        "=" * 90
    )

    return counts


# ======================================================================
# STRATIFIED SPLIT
# ======================================================================

def split_samples(
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
# DATASET CLASS
# ======================================================================

class CategoryDataset(
    Dataset
):

    def __init__(
        self,
        samples,
        transform
    ):

        self.samples = samples

        self.transform = transform

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

        try:

            image = Image.open(
                path
            ).convert(
                "RGB"
            )

        except Exception as error:

            raise RuntimeError(
                f"\nCould not read image:\n"
                f"{path}\n"
                f"Error: {error}"
            )

        image = self.transform(
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
                kernel_size=2
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
# CATEGORY CNN
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

        self.initialize_weights()

    # ------------------------------------------------------------------
    # INITIALIZATION
    # ------------------------------------------------------------------

    def initialize_weights(
        self
    ):

        for module in self.modules():

            if isinstance(
                module,
                nn.Conv2d
            ):

                nn.init.kaiming_normal_(
                    module.weight,
                    mode="fan_out",
                    nonlinearity="relu"
                )

            elif isinstance(
                module,
                nn.Linear
            ):

                nn.init.xavier_uniform_(
                    module.weight
                )

                if module.bias is not None:

                    nn.init.zeros_(
                        module.bias
                    )

            elif isinstance(
                module,
                nn.BatchNorm2d
            ):

                nn.init.ones_(
                    module.weight
                )

                nn.init.zeros_(
                    module.bias
                )

    # ------------------------------------------------------------------
    # FORWARD
    # ------------------------------------------------------------------

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
# METRICS
# ======================================================================

def calculate_metrics(
    labels,
    predictions
):

    return {

        "accuracy":
            accuracy_score(
                labels,
                predictions
            ),

        "precision":
            precision_score(
                labels,
                predictions,
                zero_division=0
            ),

        "recall":
            recall_score(
                labels,
                predictions,
                zero_division=0
            ),

        "f1":
            f1_score(
                labels,
                predictions,
                zero_division=0
            )
    }


# ======================================================================
# TRAIN
# ======================================================================

def train_epoch(
    model,
    loader,
    criterion,
    optimizer
):

    model.train()

    total_loss = 0.0

    labels = []

    predictions = []

    for images, targets in loader:

        images = images.to(
            DEVICE
        )

        targets = targets.to(
            DEVICE
        )

        optimizer.zero_grad(
            set_to_none=True
        )

        outputs = model(
            images
        )

        loss = criterion(
            outputs,
            targets
        )

        loss.backward()

        torch.nn.utils.clip_grad_norm_(
            model.parameters(),
            GRADIENT_CLIP
        )

        optimizer.step()

        total_loss += (
            loss.item()
            *
            images.size(0)
        )

        predicted = (
            outputs.argmax(
                dim=1
            )
        )

        labels.extend(
            targets.detach()
            .cpu()
            .tolist()
        )

        predictions.extend(
            predicted.detach()
            .cpu()
            .tolist()
        )

    result = calculate_metrics(
        labels,
        predictions
    )

    result["loss"] = (
        total_loss
        /
        len(labels)
    )

    return result


# ======================================================================
# VALIDATION
# ======================================================================

@torch.no_grad()
def evaluate(
    model,
    loader,
    criterion
):

    model.eval()

    total_loss = 0.0

    labels = []

    predictions = []

    probabilities = []

    for images, targets in loader:

        images = images.to(
            DEVICE
        )

        targets = targets.to(
            DEVICE
        )

        outputs = model(
            images
        )

        loss = criterion(
            outputs,
            targets
        )

        total_loss += (
            loss.item()
            *
            images.size(0)
        )

        probabilities_tensor = (
            torch.softmax(
                outputs,
                dim=1
            )
        )

        predicted = (
            outputs.argmax(
                dim=1
            )
        )

        labels.extend(
            targets.cpu().tolist()
        )

        predictions.extend(
            predicted.cpu().tolist()
        )

        probabilities.extend(
            probabilities_tensor[:, 1]
            .cpu()
            .tolist()
        )

    result = calculate_metrics(
        labels,
        predictions
    )

    result["loss"] = (
        total_loss
        /
        len(labels)
    )

    result["confusion_matrix"] = (
        confusion_matrix(
            labels,
            predictions,
            labels=[
                0,
                1
            ]
        ).tolist()
    )

    result["labels"] = labels

    result["predictions"] = predictions

    result["probabilities"] = probabilities

    return result


# ======================================================================
# CHECKPOINT PATH
# ======================================================================

def get_model_path(
    category
):

    return os.path.join(
        MODEL_DIR,
        f"{category}_binary_v2.pth"
    )


# ======================================================================
# TRAIN ONE CATEGORY
# ======================================================================

def train_category(
    category,
    force=False
):

    model_path = get_model_path(
        category
    )

    # ------------------------------------------------------------------
    # EXISTING CHECKPOINT
    # ------------------------------------------------------------------

    if (
        os.path.exists(model_path)
        and
        not force
    ):

        print()
        print(
            "=" * 90
        )

        print(
            f"CHECKPOINT EXISTS: {category.upper()}"
        )

        print(
            "=" * 90
        )

        print(
            model_path
        )

        print()

        print(
            "Skipping training."
        )

        print(
            "Use --force to retrain."
        )

        return None

    # ------------------------------------------------------------------
    # COLLECT
    # ------------------------------------------------------------------

    (
        samples,
        defect_counts,
        skipped_test_good
    ) = collect_category_samples(
        category
    )

    counts = validate_samples(
        category,
        samples
    )

    # ------------------------------------------------------------------
    # SPLIT
    # ------------------------------------------------------------------

    (
        train_samples,
        val_samples
    ) = split_samples(
        samples
    )

    train_counts = Counter(
        label
        for _, label
        in train_samples
    )

    val_counts = Counter(
        label
        for _, label
        in val_samples
    )

    print()
    print(
        "=" * 90
    )

    print(
        "TRAIN / VALIDATION SPLIT"
    )

    print(
        "=" * 90
    )

    print(
        f"Training images   : "
        f"{len(train_samples)}"
    )

    print(
        f"Validation images : "
        f"{len(val_samples)}"
    )

    print()

    print(
        "TRAIN"
    )

    print(
        f"  Normal          : "
        f"{train_counts[0]}"
    )

    print(
        f"  Defective       : "
        f"{train_counts[1]}"
    )

    print()

    print(
        "VALIDATION"
    )

    print(
        f"  Normal          : "
        f"{val_counts[0]}"
    )

    print(
        f"  Defective       : "
        f"{val_counts[1]}"
    )

    # ------------------------------------------------------------------
    # DATASETS
    # ------------------------------------------------------------------

    train_dataset = CategoryDataset(
        train_samples,
        TRAIN_TRANSFORM
    )

    val_dataset = CategoryDataset(
        val_samples,
        VAL_TRANSFORM
    )

    # ------------------------------------------------------------------
    # BALANCED SAMPLER
    # ------------------------------------------------------------------

    class_counts = Counter(
        label
        for _, label
        in train_samples
    )

    sample_weights = []

    for _, label in train_samples:

        sample_weights.append(
            1.0
            /
            class_counts[label]
        )

    sample_weights = torch.tensor(
        sample_weights,
        dtype=torch.double
    )

    sampler = WeightedRandomSampler(
        weights=sample_weights,
        num_samples=len(
            sample_weights
        ),
        replacement=True
    )

    print()
    print(
        "✓ Balanced sampler enabled"
    )

    print(
        "✓ Class-weighted loss disabled"
    )

    # ------------------------------------------------------------------
    # LOADERS
    # ------------------------------------------------------------------

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        sampler=sampler,
        num_workers=NUM_WORKERS
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS
    )

    # ------------------------------------------------------------------
    # MODEL
    # ------------------------------------------------------------------

    print()
    print(
        "=" * 90
    )

    print(
        "CREATING CUSTOM CNN"
    )

    print(
        "=" * 90
    )

    model = CategoryCNNV2().to(
        DEVICE
    )

    parameter_count = sum(
        p.numel()
        for p in model.parameters()
    )

    print(
        f"Parameters        : "
        f"{parameter_count:,}"
    )

    print(
        "Pretrained        : NO"
    )

    print(
        "ImageNet          : NO"
    )

    print(
        "ResNet            : NO"
    )

    print(
        "Transfer learning : NO"
    )

    print(
        "Training          : FROM SCRATCH"
    )

    # ------------------------------------------------------------------
    # LOSS
    # ------------------------------------------------------------------

    criterion = nn.CrossEntropyLoss()

    # ------------------------------------------------------------------
    # OPTIMIZER
    # ------------------------------------------------------------------

    optimizer = optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY
    )

    scheduler = (
        optim.lr_scheduler.ReduceLROnPlateau(
            optimizer,
            mode="max",
            factor=0.5,
            patience=2,
            min_lr=1e-5
        )
    )

    # ------------------------------------------------------------------
    # BEST MODEL
    # ------------------------------------------------------------------

    best_f1 = -1.0

    best_accuracy = -1.0

    best_state = None

    best_epoch = 0

    no_improvement = 0

    # ==================================================================
    # TRAINING LOOP
    # ==================================================================

    for epoch in range(
        1,
        EPOCHS + 1
    ):

        train = train_epoch(
            model,
            train_loader,
            criterion,
            optimizer
        )

        val = evaluate(
            model,
            val_loader,
            criterion
        )

        scheduler.step(
            val["f1"]
        )

        train_acc = (
            train["accuracy"]
        )

        val_acc = (
            val["accuracy"]
        )

        train_precision = (
            train["precision"]
        )

        val_precision = (
            val["precision"]
        )

        train_recall = (
            train["recall"]
        )

        val_recall = (
            val["recall"]
        )

        train_f1 = (
            train["f1"]
        )

        val_f1 = (
            val["f1"]
        )

        accuracy_gap = (
            train_acc
            -
            val_acc
        )

        f1_gap = (
            train_f1
            -
            val_f1
        )

        current_lr = (
            optimizer
            .param_groups[0]["lr"]
        )

        print()
        print(
            f"Epoch "
            f"{epoch:02d}/{EPOCHS}"
        )

        print(
            f"  LR: "
            f"{current_lr:.7f}"
        )

        print(
            f"  TRAIN "
            f"Loss={train['loss']:.4f} "
            f"Acc={train_acc * 100:.2f}% "
            f"Prec={train_precision * 100:.2f}% "
            f"Recall={train_recall * 100:.2f}% "
            f"F1={train_f1 * 100:.2f}%"
        )

        print(
            f"  VAL   "
            f"Loss={val['loss']:.4f} "
            f"Acc={val_acc * 100:.2f}% "
            f"Prec={val_precision * 100:.2f}% "
            f"Recall={val_recall * 100:.2f}% "
            f"F1={val_f1 * 100:.2f}%"
        )

        print(
            f"  GAP   "
            f"Acc={accuracy_gap * 100:.2f}% "
            f"F1={f1_gap * 100:.2f}%"
        )

        # --------------------------------------------------------------
        # DIAGNOSIS
        # --------------------------------------------------------------

        if (
            train_acc < 0.70
            and
            val_acc < 0.70
        ):

            print(
                "  ⚠️ UNDERFITTING"
            )

        elif (
            train_acc >= 0.95
            and
            accuracy_gap > 0.10
        ):

            print(
                "  ⚠️ OVERFITTING"
            )

        elif (
            val_acc >= 0.90
            and
            abs(accuracy_gap) <= 0.08
        ):

            print(
                "  ✅ HEALTHY 90%+ RESULT"
            )

        else:

            print(
                "  • Learning..."
            )

        # --------------------------------------------------------------
        # BEST CHECKPOINT
        # --------------------------------------------------------------

        if (
            val_f1 > best_f1
            or
            (
                val_f1 == best_f1
                and
                val_acc > best_accuracy
            )
        ):

            best_f1 = val_f1

            best_accuracy = val_acc

            best_epoch = epoch

            best_state = {
                key: value.cpu().clone()
                for key, value
                in model.state_dict()
                .items()
            }

            no_improvement = 0

            print(
                "  🎯 BEST MODEL UPDATED"
            )

        else:

            no_improvement += 1

            print(
                f"  No improvement: "
                f"{no_improvement}/{PATIENCE}"
            )

        # --------------------------------------------------------------
        # EARLY STOPPING
        # --------------------------------------------------------------

        if (
            no_improvement
            >=
            PATIENCE
        ):

            print()
            print(
                "🛑 EARLY STOPPING"
            )

            break

    # ==================================================================
    # RESTORE BEST MODEL
    # ==================================================================

    if best_state is None:

        raise RuntimeError(
            "No best checkpoint was created."
        )

    model.load_state_dict(
        best_state
    )

    # ==================================================================
    # FINAL EVALUATION
    # ==================================================================

    final = evaluate(
        model,
        val_loader,
        criterion
    )

    # ==================================================================
    # SAVE CHECKPOINT
    # ==================================================================

    checkpoint = {

        "model_state_dict":
            model.state_dict(),

        "category":
            category,

        "class_names":
            [
                "good",
                "defective"
            ],

        "num_classes":
            2,

        "image_size":
            IMAGE_SIZE,

        "architecture":
            "CategoryCNNV2",

        "pretrained":
            False,

        "imagenet":
            False,

        "resnet":
            False,

        "transfer_learning":
            False,

        "training_from_scratch":
            True,

        "best_epoch":
            best_epoch,

        "validation_accuracy":
            final["accuracy"],

        "validation_precision":
            final["precision"],

        "validation_recall":
            final["recall"],

        "validation_f1":
            final["f1"],

        "dataset_total":
            len(samples),

        "dataset_normal":
            counts[0],

        "dataset_defective":
            counts[1],

        "test_good_excluded":
            True,

        "test_good_skipped":
            skipped_test_good,

        "defect_types":
            dict(
                defect_counts
            ),

        "training_method":
            "balanced_weighted_random_sampler",

        "learning_rate":
            LEARNING_RATE,

        "batch_size":
            BATCH_SIZE,

        "weight_decay":
            WEIGHT_DECAY,
    }

    torch.save(
        checkpoint,
        model_path
    )

    # ==================================================================
    # FINAL REPORT
    # ==================================================================

    print()
    print(
        "=" * 90
    )

    print(
        f"FINAL MODEL: "
        f"{category.upper()}"
    )

    print(
        "=" * 90
    )

    print(
        f"Best epoch : "
        f"{best_epoch}"
    )

    print(
        f"Accuracy   : "
        f"{final['accuracy'] * 100:.2f}%"
    )

    print(
        f"Precision  : "
        f"{final['precision'] * 100:.2f}%"
    )

    print(
        f"Recall     : "
        f"{final['recall'] * 100:.2f}%"
    )

    print(
        f"F1         : "
        f"{final['f1'] * 100:.2f}%"
    )

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

    cm = np.array(
        final[
            "confusion_matrix"
        ]
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

    print()

    print(
        "DATASET"
    )

    print(
        f"  Total             : "
        f"{len(samples)}"
    )

    print(
        f"  Normal            : "
        f"{counts[0]}"
    )

    print(
        f"  Defective         : "
        f"{counts[1]}"
    )

    print(
        f"  test/good skipped : "
        f"{skipped_test_good}"
    )

    print()

    print(
        "MODEL"
    )

    print(
        "  Pretrained        : NO"
    )

    print(
        "  ImageNet          : NO"
    )

    print(
        "  ResNet            : NO"
    )

    print(
        "  Transfer learning : NO"
    )

    print(
        "  Training          : FROM SCRATCH"
    )

    print()

    print(
        "SAVED MODEL"
    )

    print(
        model_path
    )

    print()

    print(
        "=" * 90
    )

    print(
        f"{category.upper()} TRAINING COMPLETE"
    )

    print(
        "=" * 90
    )

    return {
        "category": category,
        "accuracy": final["accuracy"],
        "precision": final["precision"],
        "recall": final["recall"],
        "f1": final["f1"],
        "best_epoch": best_epoch,
        "model_path": model_path,
    }


# ======================================================================
# TRAIN ALL
# ======================================================================

def train_all(
    force=False
):

    results = []

    print()
    print(
        "=" * 100
    )

    print(
        "VISIONINSPECT AI"
    )

    print(
        "CATEGORY BINARY TRAINING V2"
    )

    print(
        "=" * 100
    )

    print(
        f"Categories : "
        f"{len(CATEGORIES)}"
    )

    print(
        f"Device     : "
        f"{DEVICE}"
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
        "=" * 100
    )

    for index, category in enumerate(
        CATEGORIES,
        start=1
    ):

        print()
        print(
            "#" * 100
        )

        print(
            f"[{index}/{len(CATEGORIES)}] "
            f"TRAINING: "
            f"{category.upper()}"
        )

        print(
            "#" * 100
        )

        try:

            result = train_category(
                category,
                force=force
            )

            if result is not None:

                results.append(
                    result
                )

        except Exception as error:

            print()
            print(
                f"❌ FAILED: "
                f"{category}"
            )

            print(
                f"Reason: "
                f"{error}"
            )

            print(
                "Continuing to next category..."
            )

    # ------------------------------------------------------------------
    # SUMMARY
    # ------------------------------------------------------------------

    print()
    print(
        "=" * 100
    )

    print(
        "TRAINING SUMMARY"
    )

    print(
        "=" * 100
    )

    if not results:

        print(
            "No new models were trained."
        )

        return

    print()

    print(
        f"{'Category':<15}"
        f"{'Accuracy':>12}"
        f"{'Precision':>12}"
        f"{'Recall':>12}"
        f"{'F1':>12}"
    )

    print(
        "-" * 65
    )

    for result in results:

        print(
            f"{result['category']:<15}"
            f"{result['accuracy'] * 100:>11.2f}%"
            f"{result['precision'] * 100:>11.2f}%"
            f"{result['recall'] * 100:>11.2f}%"
            f"{result['f1'] * 100:>11.2f}%"
        )

    print()

    print(
        "=" * 100
    )

    print(
        "ALL REQUESTED TRAINING COMPLETE"
    )

    print(
        "=" * 100
    )


# ======================================================================
# MAIN
# ======================================================================

def main():

    set_seed()

    args = parse_arguments()

    category = (
        args.category
        .strip()
        .lower()
    )

    # ------------------------------------------------------------------
    # ALL
    # ------------------------------------------------------------------

    if category == "all":

        train_all(
            force=args.force
        )

        return

    # ------------------------------------------------------------------
    # CATEGORY VALIDATION
    # ------------------------------------------------------------------

    if category not in CATEGORIES:

        print()
        print(
            "❌ INVALID CATEGORY"
        )

        print()

        print(
            "Available categories:"
        )

        for name in CATEGORIES:

            print(
                f"  - {name}"
            )

        print()

        print(
            "Example:"
        )

        print(
            "  python -m "
            "app.ai.train_category_binary_v2 "
            "--category cable"
        )

        sys.exit(1)

    # ------------------------------------------------------------------
    # HEADER
    # ------------------------------------------------------------------

    print()
    print(
        "=" * 90
    )

    print(
        "VISIONINSPECT AI"
    )

    print(
        "CATEGORY BINARY DEFECT DETECTOR V2"
    )

    print(
        "=" * 90
    )

    print(
        f"Category     : "
        f"{category}"
    )

    print(
        f"Device       : "
        f"{DEVICE}"
    )

    print(
        f"Image size   : "
        f"{IMAGE_SIZE}x{IMAGE_SIZE}"
    )

    print(
        f"Batch size   : "
        f"{BATCH_SIZE}"
    )

    print(
        f"Epochs       : "
        f"{EPOCHS}"
    )

    print(
        f"Learning rate: "
        f"{LEARNING_RATE}"
    )

    print()

    print(
        "PRETRAINED MODEL : NO"
    )

    print(
        "IMAGENET         : NO"
    )

    print(
        "RESNET           : NO"
    )

    print(
        "TRANSFER LEARNING: NO"
    )

    print(
        "TRAINING         : FROM SCRATCH"
    )

    print(
        "=" * 90
    )

    # ------------------------------------------------------------------
    # TRAIN
    # ------------------------------------------------------------------

    train_category(
        category,
        force=args.force
    )


# ======================================================================
# ENTRY POINT
# ======================================================================

if __name__ == "__main__":

    main()