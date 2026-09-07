"""
============================================================
VISIONINSPECT AI
CATEGORY-SPECIFIC QUALITY MODEL TRAINING V2
============================================================

ONE MODEL PER PRODUCT CATEGORY

Example:
    bottle_quality_model_v2.pth
    cable_quality_model_v2.pth
    ...

Classes:
    GOOD + category-specific defect types

IMPORTANT:
    PRETRAINED MODEL : NO
    IMAGENET         : NO
    TRANSFER LEARNING: NO
    RESNET           : NO

Everything is trained FROM SCRATCH.

This version fixes the train/validation dataset handling by:
    1. Building one immutable sample list
    2. Creating stratified indices
    3. Applying train transforms only to training samples
    4. Applying validation transforms only to validation samples
    5. Keeping class mappings identical
    6. Using balanced sampling on training data
    7. Monitoring train/validation gaps
    8. Saving only the best validation checkpoint
============================================================
"""

import os
import json
import random
from collections import Counter, defaultdict

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


# ============================================================
# CONFIGURATION
# ============================================================

SEED = 42

IMAGE_SIZE = 256

BATCH_SIZE = 16

EPOCHS = 40

LEARNING_RATE = 0.0005

WEIGHT_DECAY = 0.0001

VALIDATION_RATIO = 0.20

EARLY_STOPPING_PATIENCE = 8

NUM_WORKERS = 0

LABEL_SMOOTHING = 0.03


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# ============================================================
# PATHS
# ============================================================

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

RESULTS_DIR = os.path.join(
    AI_DIR,
    "results"
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

os.makedirs(
    RESULTS_DIR,
    exist_ok=True
)


# ============================================================
# CATEGORIES
# ============================================================

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
# REPRODUCIBILITY
# ============================================================

def set_seed(seed=SEED):

    random.seed(seed)

    np.random.seed(seed)

    torch.manual_seed(seed)

    if torch.cuda.is_available():

        torch.cuda.manual_seed_all(seed)

    torch.backends.cudnn.deterministic = True

    torch.backends.cudnn.benchmark = False


# ============================================================
# TRANSFORMS
# ============================================================

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
        degrees=5
    ),

    transforms.ColorJitter(
        brightness=0.08,
        contrast=0.08,
        saturation=0.05,
        hue=0.01
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


VAL_TRANSFORM = transforms.Compose([

    transforms.Resize(
        (
            IMAGE_SIZE,
            IMAGE_SIZE
        )
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
# SAMPLE COLLECTION
# ============================================================

def collect_category_samples(
    category
):

    category_root = os.path.join(
        DATASET_ROOT,
        category
    )

    samples = []

    # --------------------------------------------------------
    # GOOD
    # --------------------------------------------------------

    good_dir = os.path.join(
        category_root,
        "train",
        "good"
    )

    if os.path.isdir(good_dir):

        for filename in sorted(
            os.listdir(good_dir)
        ):

            path = os.path.join(
                good_dir,
                filename
            )

            if (
                os.path.isfile(path)
                and
                os.path.splitext(
                    filename
                )[1].lower()
                in IMAGE_EXTENSIONS
            ):

                samples.append({
                    "path": path,
                    "label": "good"
                })

    # --------------------------------------------------------
    # DEFECTS
    # --------------------------------------------------------

    test_dir = os.path.join(
        category_root,
        "test"
    )

    if os.path.isdir(test_dir):

        for defect_name in sorted(
            os.listdir(test_dir)
        ):

            if defect_name == "good":
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
                os.listdir(defect_dir)
            ):

                path = os.path.join(
                    defect_dir,
                    filename
                )

                if (
                    os.path.isfile(path)
                    and
                    os.path.splitext(
                        filename
                    )[1].lower()
                    in IMAGE_EXTENSIONS
                ):

                    samples.append({
                        "path": path,
                        "label": defect_name
                    })

    return samples


# ============================================================
# STRATIFIED SPLIT
# ============================================================

def stratified_split(
    samples
):

    grouped = defaultdict(list)

    for index, sample in enumerate(
        samples
    ):

        grouped[
            sample["label"]
        ].append(index)

    rng = random.Random(
        SEED
    )

    train_indices = []

    val_indices = []

    for label in sorted(
        grouped.keys()
    ):

        indices = list(
            grouped[label]
        )

        rng.shuffle(
            indices
        )

        count = len(indices)

        if count <= 1:

            train_indices.extend(
                indices
            )

            continue

        val_count = max(
            1,
            round(
                count *
                VALIDATION_RATIO
            )
        )

        # Always leave at least one
        # training image.
        val_count = min(
            val_count,
            count - 1
        )

        val_indices.extend(
            indices[:val_count]
        )

        train_indices.extend(
            indices[val_count:]
        )

    rng.shuffle(
        train_indices
    )

    rng.shuffle(
        val_indices
    )

    return (
        train_indices,
        val_indices
    )


# ============================================================
# DATASET
# ============================================================

class QualityDataset(
    Dataset
):

    def __init__(
        self,
        samples,
        indices,
        class_to_index,
        transform
    ):

        self.samples = samples

        self.indices = list(
            indices
        )

        self.class_to_index = (
            class_to_index
        )

        self.transform = transform

    def __len__(self):

        return len(
            self.indices
        )

    def __getitem__(
        self,
        index
    ):

        original_index = (
            self.indices[index]
        )

        sample = (
            self.samples[
                original_index
            ]
        )

        image = Image.open(
            sample["path"]
        ).convert("RGB")

        if self.transform:

            image = self.transform(
                image
            )

        label = (
            self.class_to_index[
                sample["label"]
            ]
        )

        return (
            image,
            torch.tensor(
                label,
                dtype=torch.long
            )
        )


# ============================================================
# CUSTOM CNN BLOCK
# ============================================================

class ConvBlock(
    nn.Module
):

    def __init__(
        self,
        in_channels,
        out_channels,
        dropout=0.0
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
                kernel_size=2,
                stride=2
            ),

            nn.Dropout2d(
                dropout
            )
        )

    def forward(
        self,
        x
    ):

        return self.block(x)


# ============================================================
# CUSTOM QUALITY CNN
#
# FROM SCRATCH
# ============================================================

class QualityCNNV2(
    nn.Module
):

    def __init__(
        self,
        num_classes
    ):

        super().__init__()

        # ----------------------------------------------------
        # MAIN FEATURE BRANCH
        # ----------------------------------------------------

        self.main_branch = nn.Sequential(

            ConvBlock(
                3,
                32,
                0.02
            ),

            ConvBlock(
                32,
                64,
                0.03
            ),

            ConvBlock(
                64,
                96,
                0.05
            ),

            ConvBlock(
                96,
                128,
                0.07
            ),

            ConvBlock(
                128,
                192,
                0.08
            )
        )

        # ----------------------------------------------------
        # DETAIL BRANCH
        # ----------------------------------------------------

        self.detail_branch = nn.Sequential(

            nn.Conv2d(
                3,
                32,
                kernel_size=5,
                padding=2,
                bias=False
            ),

            nn.BatchNorm2d(
                32
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Conv2d(
                32,
                64,
                kernel_size=3,
                padding=1,
                bias=False
            ),

            nn.BatchNorm2d(
                64
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.MaxPool2d(
                2
            ),

            ConvBlock(
                64,
                96,
                0.04
            ),

            ConvBlock(
                96,
                128,
                0.06
            ),

            ConvBlock(
                128,
                160,
                0.08
            )
        )

        # ----------------------------------------------------
        # POOLING
        # ----------------------------------------------------

        self.main_avg = (
            nn.AdaptiveAvgPool2d(
                (1, 1)
            )
        )

        self.main_max = (
            nn.AdaptiveMaxPool2d(
                (1, 1)
            )
        )

        self.detail_avg = (
            nn.AdaptiveAvgPool2d(
                (1, 1)
            )
        )

        self.detail_max = (
            nn.AdaptiveMaxPool2d(
                (1, 1)
            )
        )

        # ----------------------------------------------------
        # FEATURES
        #
        # main:
        #   192 avg
        #   192 max
        #
        # detail:
        #   160 avg
        #   160 max
        #
        # total = 704
        # ----------------------------------------------------

        self.classifier = nn.Sequential(

            nn.Linear(
                704,
                256
            ),

            nn.BatchNorm1d(
                256
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                0.30
            ),

            nn.Linear(
                256,
                128
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                0.20
            ),

            nn.Linear(
                128,
                num_classes
            )
        )

        self.initialize_weights()

    # --------------------------------------------------------
    # WEIGHT INITIALIZATION
    # --------------------------------------------------------

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

                if module.bias is not None:

                    nn.init.zeros_(
                        module.bias
                    )

            elif isinstance(
                module,
                nn.Linear
            ):

                nn.init.kaiming_normal_(
                    module.weight,
                    nonlinearity="relu"
                )

                if module.bias is not None:

                    nn.init.zeros_(
                        module.bias
                    )

            elif isinstance(
                module,
                (
                    nn.BatchNorm1d,
                    nn.BatchNorm2d
                )
            ):

                nn.init.ones_(
                    module.weight
                )

                nn.init.zeros_(
                    module.bias
                )

    # --------------------------------------------------------
    # FORWARD
    # --------------------------------------------------------

    def forward(
        self,
        x
    ):

        main = self.main_branch(
            x
        )

        detail = self.detail_branch(
            x
        )

        main_avg = self.main_avg(
            main
        )

        main_max = self.main_max(
            main
        )

        detail_avg = self.detail_avg(
            detail
        )

        detail_max = self.detail_max(
            detail
        )

        main_avg = main_avg.flatten(
            1
        )

        main_max = main_max.flatten(
            1
        )

        detail_avg = detail_avg.flatten(
            1
        )

        detail_max = detail_max.flatten(
            1
        )

        features = torch.cat(
            [
                main_avg,
                main_max,
                detail_avg,
                detail_max
            ],
            dim=1
        )

        return self.classifier(
            features
        )


# ============================================================
# CLASS WEIGHTS
# ============================================================

def calculate_weights(
    samples,
    train_indices,
    class_to_index
):

    counts = Counter()

    for index in train_indices:

        label = samples[
            index
        ]["label"]

        class_index = (
            class_to_index[
                label
            ]
        )

        counts[
            class_index
        ] += 1

    num_classes = len(
        class_to_index
    )

    total = len(
        train_indices
    )

    weights = []

    for class_index in range(
        num_classes
    ):

        count = counts.get(
            class_index,
            1
        )

        weight = (
            total /
            (
                num_classes *
                count
            )
        )

        weights.append(
            weight
        )

    return (
        torch.tensor(
            weights,
            dtype=torch.float32
        ),
        counts
    )


# ============================================================
# TRAINING METRICS
# ============================================================

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
                average="weighted",
                zero_division=0
            ),

        "recall":
            recall_score(
                labels,
                predictions,
                average="weighted",
                zero_division=0
            ),

        "f1":
            f1_score(
                labels,
                predictions,
                average="weighted",
                zero_division=0
            )
    }


# ============================================================
# TRAIN ONE EPOCH
# ============================================================

def train_one_epoch(
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
            max_norm=2.0
        )

        optimizer.step()

        total_loss += (
            loss.item()
            * images.size(0)
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

    average_loss = (
        total_loss /
        max(
            len(labels),
            1
        )
    )

    metrics = calculate_metrics(
        labels,
        predictions
    )

    return (
        average_loss,
        metrics
    )


# ============================================================
# VALIDATION
# ============================================================

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
            * images.size(0)
        )

        predicted = (
            outputs.argmax(
                dim=1
            )
        )

        labels.extend(
            targets.cpu()
            .tolist()
        )

        predictions.extend(
            predicted.cpu()
            .tolist()
        )

    average_loss = (
        total_loss /
        max(
            len(labels),
            1
        )
    )

    metrics = calculate_metrics(
        labels,
        predictions
    )

    matrix = confusion_matrix(
        labels,
        predictions
    )

    metrics[
        "confusion_matrix"
    ] = matrix.tolist()

    return (
        average_loss,
        metrics
    )


# ============================================================
# SAVE CHECKPOINT
# ============================================================

def save_checkpoint(
    model,
    category,
    class_names,
    metrics,
    history,
    epoch,
    model_path
):

    torch.save(

        {

            "model_state_dict":
                model.state_dict(),

            "category":
                category,

            "class_names":
                class_names,

            "num_classes":
                len(class_names),

            "image_size":
                IMAGE_SIZE,

            "architecture":
                "QualityCNNV2",

            "pretrained":
                False,

            "imagenet":
                False,

            "transfer_learning":
                False,

            "epoch":
                epoch,

            "validation_accuracy":
                metrics["accuracy"],

            "validation_precision":
                metrics["precision"],

            "validation_recall":
                metrics["recall"],

            "validation_f1":
                metrics["f1"],

            "history":
                history
        },

        model_path
    )


# ============================================================
# TRAIN ONE CATEGORY
# ============================================================

def train_category(
    category
):

    print()
    print("=" * 100)
    print(
        f"TRAINING CATEGORY: "
        f"{category.upper()}"
    )
    print("=" * 100)

    # --------------------------------------------------------
    # COLLECT
    # --------------------------------------------------------

    samples = collect_category_samples(
        category
    )

    if len(samples) == 0:

        print(
            "No samples found."
        )

        return None

    # --------------------------------------------------------
    # CLASS NAMES
    # --------------------------------------------------------

    class_names = sorted(
        set(
            sample["label"]
            for sample in samples
        )
    )

    class_to_index = {
        name: index
        for index, name
        in enumerate(class_names)
    }

    print(
        f"Total samples : "
        f"{len(samples)}"
    )

    print(
        f"Classes       : "
        f"{class_names}"
    )

    print()

    # --------------------------------------------------------
    # GLOBAL DISTRIBUTION
    # --------------------------------------------------------

    global_counts = Counter(
        sample["label"]
        for sample in samples
    )

    for class_name in class_names:

        print(
            f"  "
            f"{class_name:<30}"
            f"{global_counts[class_name]}"
        )

    # --------------------------------------------------------
    # STRATIFIED SPLIT
    # --------------------------------------------------------

    (
        train_indices,
        val_indices
    ) = stratified_split(
        samples
    )

    print()
    print(
        f"Training samples   : "
        f"{len(train_indices)}"
    )

    print(
        f"Validation samples : "
        f"{len(val_indices)}"
    )

    # --------------------------------------------------------
    # VERIFY SPLIT
    # --------------------------------------------------------

    train_counts = Counter(
        samples[index]["label"]
        for index in train_indices
    )

    val_counts = Counter(
        samples[index]["label"]
        for index in val_indices
    )

    print()
    print("TRAIN DISTRIBUTION")

    for class_name in class_names:

        print(
            f"  "
            f"{class_name:<30}"
            f"{train_counts[class_name]}"
        )

    print()
    print("VALIDATION DISTRIBUTION")

    for class_name in class_names:

        print(
            f"  "
            f"{class_name:<30}"
            f"{val_counts[class_name]}"
        )

    # --------------------------------------------------------
    # DATASETS
    # --------------------------------------------------------

    train_dataset = QualityDataset(
        samples=samples,
        indices=train_indices,
        class_to_index=class_to_index,
        transform=TRAIN_TRANSFORM
    )

    val_dataset = QualityDataset(
        samples=samples,
        indices=val_indices,
        class_to_index=class_to_index,
        transform=VAL_TRANSFORM
    )

    # --------------------------------------------------------
    # BALANCED SAMPLER
    # --------------------------------------------------------

    train_class_weights, train_counts = (
        calculate_weights(
            samples,
            train_indices,
            class_to_index
        )
    )

    sample_weights = []

    for index in train_indices:

        label = samples[
            index
        ]["label"]

        class_index = (
            class_to_index[
                label
            ]
        )

        sample_weights.append(
            float(
                train_class_weights[
                    class_index
                ]
            )
        )

    sampler = WeightedRandomSampler(
        weights=torch.tensor(
            sample_weights,
            dtype=torch.double
        ),
        num_samples=len(
            sample_weights
        ),
        replacement=True
    )

    # --------------------------------------------------------
    # LOADERS
    # --------------------------------------------------------

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        sampler=sampler,
        num_workers=NUM_WORKERS,
        pin_memory=torch.cuda.is_available()
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=torch.cuda.is_available()
    )

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    model = QualityCNNV2(
        num_classes=len(
            class_names
        )
    ).to(DEVICE)

    total_parameters = sum(
        parameter.numel()
        for parameter
        in model.parameters()
    )

    print()
    print(
        "MODEL"
    )

    print(
        f"Parameters: "
        f"{total_parameters:,}"
    )

    print(
        "Pretrained: NO"
    )

    print(
        "ImageNet: NO"
    )

    print(
        "Transfer learning: NO"
    )

    print(
        "Training: FROM SCRATCH"
    )

    # --------------------------------------------------------
    # LOSS
    # --------------------------------------------------------

    criterion = nn.CrossEntropyLoss(
        weight=train_class_weights.to(
            DEVICE
        ),
        label_smoothing=LABEL_SMOOTHING
    )

    # --------------------------------------------------------
    # OPTIMIZER
    # --------------------------------------------------------

    optimizer = optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY
    )

    # --------------------------------------------------------
    # LR SCHEDULER
    # --------------------------------------------------------

    scheduler = (
        optim.lr_scheduler.ReduceLROnPlateau(
            optimizer,
            mode="max",
            factor=0.5,
            patience=3,
            min_lr=1e-6
        )
    )

    # --------------------------------------------------------
    # TRAINING TRACKING
    # --------------------------------------------------------

    best_f1 = -1.0

    best_epoch = 0

    best_metrics = None

    best_state = None

    patience_counter = 0

    history = []

    # ========================================================
    # EPOCH LOOP
    # ========================================================

    for epoch in range(
        1,
        EPOCHS + 1
    ):

        train_loss, train_metrics = (
            train_one_epoch(
                model,
                train_loader,
                criterion,
                optimizer
            )
        )

        val_loss, val_metrics = (
            evaluate(
                model,
                val_loader,
                criterion
            )
        )

        scheduler.step(
            val_metrics["f1"]
        )

        learning_rate = (
            optimizer
            .param_groups[0]
            ["lr"]
        )

        f1_gap = (
            train_metrics["f1"]
            -
            val_metrics["f1"]
        )

        accuracy_gap = (
            train_metrics["accuracy"]
            -
            val_metrics["accuracy"]
        )

        # ----------------------------------------------------
        # PRINT
        # ----------------------------------------------------

        print()
        print(
            f"Epoch "
            f"{epoch:02d}/{EPOCHS}"
        )

        print(
            f"  LR: "
            f"{learning_rate:.7f}"
        )

        print(
            f"  TRAIN "
            f"Loss={train_loss:.4f} "
            f"Acc={train_metrics['accuracy'] * 100:.2f}% "
            f"F1={train_metrics['f1'] * 100:.2f}%"
        )

        print(
            f"  VAL   "
            f"Loss={val_loss:.4f} "
            f"Acc={val_metrics['accuracy'] * 100:.2f}% "
            f"F1={val_metrics['f1'] * 100:.2f}%"
        )

        print(
            f"  GAPS  "
            f"Accuracy={accuracy_gap * 100:.2f}% "
            f"F1={f1_gap * 100:.2f}%"
        )

        # ----------------------------------------------------
        # DIAGNOSIS
        # ----------------------------------------------------

        if (
            train_metrics["accuracy"] < 0.70
            and
            val_metrics["accuracy"] < 0.70
        ):

            print(
                "  ⚠️ UNDERFITTING"
            )

        elif (
            train_metrics["accuracy"] >= 0.95
            and
            accuracy_gap > 0.10
        ):

            print(
                "  ⚠️ POSSIBLE OVERFITTING"
            )

        elif (
            abs(accuracy_gap) <= 0.08
            and
            val_metrics["accuracy"] >= 0.80
        ):

            print(
                "  ✓ HEALTHY GENERALIZATION"
            )

        else:

            print(
                "  • Learning in progress"
            )

        # ----------------------------------------------------
        # HISTORY
        # ----------------------------------------------------

        history.append({

            "epoch":
                epoch,

            "learning_rate":
                learning_rate,

            "train_loss":
                train_loss,

            "train_accuracy":
                train_metrics[
                    "accuracy"
                ],

            "train_precision":
                train_metrics[
                    "precision"
                ],

            "train_recall":
                train_metrics[
                    "recall"
                ],

            "train_f1":
                train_metrics[
                    "f1"
                ],

            "validation_loss":
                val_loss,

            "validation_accuracy":
                val_metrics[
                    "accuracy"
                ],

            "validation_precision":
                val_metrics[
                    "precision"
                ],

            "validation_recall":
                val_metrics[
                    "recall"
                ],

            "validation_f1":
                val_metrics[
                    "f1"
                ],

            "accuracy_gap":
                accuracy_gap,

            "f1_gap":
                f1_gap
        })

        # ----------------------------------------------------
        # BEST MODEL
        # ----------------------------------------------------

        if (
            val_metrics["f1"]
            > best_f1
        ):

            best_f1 = (
                val_metrics["f1"]
            )

            best_epoch = epoch

            best_metrics = (
                val_metrics
            )

            best_state = {
                key: value.detach()
                .cpu()
                .clone()

                for key, value
                in model.state_dict()
                .items()
            }

            patience_counter = 0

            print(
                "  🎯 NEW BEST MODEL"
            )

            print(
                f"     Validation F1: "
                f"{best_f1 * 100:.2f}%"
            )

        else:

            patience_counter += 1

            print(
                f"  No improvement: "
                f"{patience_counter}/"
                f"{EARLY_STOPPING_PATIENCE}"
            )

        # ----------------------------------------------------
        # EARLY STOP
        # ----------------------------------------------------

        if (
            patience_counter
            >= EARLY_STOPPING_PATIENCE
        ):

            print()
            print(
                "  🛑 EARLY STOPPING"
            )

            break

    # ========================================================
    # RESTORE BEST
    # ========================================================

    if best_state is not None:

        model.load_state_dict(
            best_state
        )

    # ========================================================
    # FINAL VALIDATION
    # ========================================================

    final_loss, final_metrics = (
        evaluate(
            model,
            val_loader,
            criterion
        )
    )

    # ========================================================
    # MODEL PATH
    # ========================================================

    model_path = os.path.join(
        MODEL_DIR,
        f"{category}_quality_model_v2.pth"
    )

    # ========================================================
    # SAVE
    # ========================================================

    save_checkpoint(
        model=model,
        category=category,
        class_names=class_names,
        metrics=final_metrics,
        history=history,
        epoch=best_epoch,
        model_path=model_path
    )

    # ========================================================
    # SUMMARY
    # ========================================================

    print()
    print("=" * 100)

    print(
        f"{category.upper()} COMPLETE"
    )

    print("=" * 100)

    print(
        f"Best epoch      : "
        f"{best_epoch}"
    )

    print(
        f"Validation loss : "
        f"{final_loss:.4f}"
    )

    print(
        f"Accuracy        : "
        f"{final_metrics['accuracy'] * 100:.2f}%"
    )

    print(
        f"Precision       : "
        f"{final_metrics['precision'] * 100:.2f}%"
    )

    print(
        f"Recall          : "
        f"{final_metrics['recall'] * 100:.2f}%"
    )

    print(
        f"F1              : "
        f"{final_metrics['f1'] * 100:.2f}%"
    )

    print()

    print(
        "Confusion Matrix:"
    )

    print(
        np.array(
            final_metrics[
                "confusion_matrix"
            ]
        )
    )

    print()

    print(
        "Saved:"
    )

    print(
        model_path
    )

    return {

        "category":
            category,

        "samples":
            len(samples),

        "train_samples":
            len(train_indices),

        "validation_samples":
            len(val_indices),

        "classes":
            class_names,

        "best_epoch":
            best_epoch,

        "accuracy":
            final_metrics[
                "accuracy"
            ],

        "precision":
            final_metrics[
                "precision"
            ],

        "recall":
            final_metrics[
                "recall"
            ],

        "f1":
            final_metrics[
                "f1"
            ],

        "confusion_matrix":
            final_metrics[
                "confusion_matrix"
            ],

        "model_path":
            model_path,

        "pretrained":
            False,

        "history":
            history
    }


# ============================================================
# MAIN
# ============================================================

def main():

    set_seed()

    print()
    print("=" * 100)
    print("VISIONINSPECT AI")
    print("CATEGORY-SPECIFIC QUALITY MODEL TRAINING V2")
    print("=" * 100)

    print()
    print(
        f"Device       : {DEVICE}"
    )

    print(
        f"Dataset      : {DATASET_ROOT}"
    )

    print(
        f"Model folder : {MODEL_DIR}"
    )

    print(
        f"Categories   : {len(CATEGORIES)}"
    )

    print(
        f"Epochs       : {EPOCHS}"
    )

    print(
        f"Batch size   : {BATCH_SIZE}"
    )

    print(
        f"Image size   : "
        f"{IMAGE_SIZE}x{IMAGE_SIZE}"
    )

    print()

    print(
        "PRETRAINED MODEL : NO"
    )

    print(
        "IMAGENET         : NO"
    )

    print(
        "TRANSFER LEARNING: NO"
    )

    print(
        "RESNET           : NO"
    )

    print(
        "TRAINING         : FROM SCRATCH"
    )

    print("=" * 100)

    results = {}

    # ========================================================
    # TRAIN ALL CATEGORIES
    # ========================================================

    for category in CATEGORIES:

        try:

            result = train_category(
                category
            )

            if result is not None:

                results[
                    category
                ] = result

        except KeyboardInterrupt:

            print()
            print(
                "Training interrupted by user."
            )

            break

        except Exception as error:

            print()
            print(
                f"❌ ERROR IN {category.upper()}"
            )

            print(
                str(error)
            )

            import traceback

            traceback.print_exc()

    # ========================================================
    # FINAL SUMMARY
    # ========================================================

    print()
    print("=" * 100)
    print("ALL TRAINING RESULTS")
    print("=" * 100)

    print()

    print(
        f"{'CATEGORY':<15}"
        f"{'SAMPLES':>10}"
        f"{'ACC':>12}"
        f"{'PREC':>12}"
        f"{'RECALL':>12}"
        f"{'F1':>12}"
    )

    print("-" * 75)

    for category in CATEGORIES:

        if category not in results:

            continue

        result = results[
            category
        ]

        print(
            f"{category:<15}"
            f"{result['samples']:>10}"
            f"{result['accuracy'] * 100:>11.2f}%"
            f"{result['precision'] * 100:>11.2f}%"
            f"{result['recall'] * 100:>11.2f}%"
            f"{result['f1'] * 100:>11.2f}%"
        )

    # ========================================================
    # SAVE RESULTS
    # ========================================================

    summary_path = os.path.join(
        RESULTS_DIR,
        "quality_training_v2_results.json"
    )

    with open(
        summary_path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            results,
            file,
            indent=4
        )

    print()
    print(
        "Results saved:"
    )

    print(
        summary_path
    )

    print()
    print("=" * 100)
    print("TRAINING COMPLETE")
    print("=" * 100)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()