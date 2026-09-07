# ============================================================
# VISIONINSPECT AI
# BINARY DEFECT DETECTION V2
#
# IMPORTANT:
#   NO PRETRAINED MODEL
#   NO IMAGENET
#   NO TRANSFER LEARNING
#
# Classes:
#   0 = Normal
#   1 = Defective
#
# Architecture:
#   Custom Multi-Scale CNN
#   Full-image branch + detail branch
#
# Output:
#   app/ai/saved_models/binary_model_v2.pth
# ============================================================

import json
import random
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from PIL import Image

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)

from torch.utils.data import (
    Dataset,
    DataLoader,
    WeightedRandomSampler,
)

from torchvision import transforms


# ============================================================
# CONFIGURATION
# ============================================================

SEED = 42

IMAGE_SIZE = 256

BATCH_SIZE = 24

EPOCHS = 60

LEARNING_RATE = 0.0002

WEIGHT_DECAY = 0.0001

EARLY_STOPPING_PATIENCE = 10

NUM_WORKERS = 0


# ============================================================
# PATHS
# ============================================================

AI_DIR = Path(__file__).resolve().parent

BACKEND_DIR = AI_DIR.parent.parent

DATASET_DIR = (
    BACKEND_DIR
    / "dataset"
    / "mvtec_ad"
)

MODEL_DIR = (
    AI_DIR
    / "saved_models"
)

MODEL_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

MODEL_PATH = (
    MODEL_DIR
    / "binary_model_v2.pth"
)

HISTORY_PATH = (
    MODEL_DIR
    / "binary_training_history_v2.json"
)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
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
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".webp",
}


# ============================================================
# REPRODUCIBILITY
# ============================================================

def set_seed(
    seed=SEED,
):

    random.seed(seed)

    np.random.seed(seed)

    torch.manual_seed(seed)

    if torch.cuda.is_available():

        torch.cuda.manual_seed_all(seed)

    torch.backends.cudnn.deterministic = True

    torch.backends.cudnn.benchmark = False


# ============================================================
# DATA COLLECTION
# ============================================================

def collect_samples():

    samples = []

    print()
    print("=" * 90)
    print("COLLECTING DATASET")
    print("=" * 90)

    if not DATASET_DIR.exists():

        raise FileNotFoundError(
            f"Dataset not found:\n"
            f"{DATASET_DIR}"
        )

    for category in CATEGORIES:

        category_dir = (
            DATASET_DIR
            / category
        )

        if not category_dir.exists():

            print(
                f"WARNING: Missing category "
                f"{category}"
            )

            continue

        # ----------------------------------------------------
        # NORMAL
        # ----------------------------------------------------

        good_dir = (
            category_dir
            / "train"
            / "good"
        )

        if good_dir.exists():

            for path in sorted(
                good_dir.iterdir()
            ):

                if (
                    path.is_file()
                    and path.suffix.lower()
                    in IMAGE_EXTENSIONS
                ):

                    samples.append(
                        {
                            "path": str(path),
                            "label": 0,
                            "category": category,
                            "defect": "good",
                        }
                    )

        # ----------------------------------------------------
        # DEFECTIVE
        # ----------------------------------------------------

        test_dir = (
            category_dir
            / "test"
        )

        if not test_dir.exists():

            continue

        for defect_dir in sorted(
            test_dir.iterdir()
        ):

            if (
                not defect_dir.is_dir()
                or defect_dir.name == "good"
            ):

                continue

            for path in sorted(
                defect_dir.iterdir()
            ):

                if (
                    path.is_file()
                    and path.suffix.lower()
                    in IMAGE_EXTENSIONS
                ):

                    samples.append(
                        {
                            "path": str(path),
                            "label": 1,
                            "category": category,
                            "defect":
                                defect_dir.name,
                        }
                    )

    normal = sum(
        item["label"] == 0
        for item in samples
    )

    defective = sum(
        item["label"] == 1
        for item in samples
    )

    print(
        f"Total     : {len(samples)}"
    )

    print(
        f"Normal    : {normal}"
    )

    print(
        f"Defective : {defective}"
    )

    print("=" * 90)

    return samples


# ============================================================
# CATEGORY + CLASS STRATIFIED SPLIT
# ============================================================

def split_samples(
    samples,
    validation_ratio=0.20,
):

    groups = {}

    for sample in samples:

        key = (
            sample["category"],
            sample["label"],
        )

        groups.setdefault(
            key,
            []
        )

        groups[key].append(
            sample
        )

    rng = random.Random(
        SEED
    )

    train_samples = []

    validation_samples = []

    for key in sorted(
        groups.keys()
    ):

        group = list(
            groups[key]
        )

        rng.shuffle(
            group
        )

        if len(group) < 2:

            train_samples.extend(
                group
            )

            continue

        validation_count = max(
            1,
            int(
                len(group)
                * validation_ratio
            ),
        )

        validation_count = min(
            validation_count,
            len(group) - 1,
        )

        validation_samples.extend(
            group[
                :validation_count
            ]
        )

        train_samples.extend(
            group[
                validation_count:
            ]
        )

    rng.shuffle(
        train_samples
    )

    rng.shuffle(
        validation_samples
    )

    return (
        train_samples,
        validation_samples,
    )


# ============================================================
# DATASET
# ============================================================

class BinaryDataset(
    Dataset
):

    def __init__(
        self,
        samples,
        transform=None,
    ):

        self.samples = samples

        self.transform = transform

    def __len__(self):

        return len(
            self.samples
        )

    def __getitem__(
        self,
        index,
    ):

        sample = (
            self.samples[index]
        )

        image = Image.open(
            sample["path"]
        ).convert("RGB")

        if self.transform:

            image = self.transform(
                image
            )

        label = torch.tensor(
            sample["label"],
            dtype=torch.long,
        )

        return (
            image,
            label,
        )


# ============================================================
# TRAIN TRANSFORM
#
# Controlled augmentation.
# We deliberately avoid aggressive crops because
# manufacturing defects can be very small.
# ============================================================

TRAIN_TRANSFORM = transforms.Compose(
    [

        transforms.Resize(
            (
                IMAGE_SIZE,
                IMAGE_SIZE,
            )
        ),

        transforms.RandomHorizontalFlip(
            p=0.50
        ),

        transforms.RandomRotation(
            degrees=7
        ),

        transforms.ColorJitter(
            brightness=0.10,
            contrast=0.12,
            saturation=0.08,
            hue=0.01,
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
# VALIDATION TRANSFORM
# ============================================================

VAL_TRANSFORM = transforms.Compose(
    [

        transforms.Resize(
            (
                IMAGE_SIZE,
                IMAGE_SIZE,
            )
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
# DATALOADERS
# ============================================================

def create_dataloaders(
    train_samples,
    validation_samples,
):

    train_dataset = BinaryDataset(
        train_samples,
        TRAIN_TRANSFORM,
    )

    validation_dataset = BinaryDataset(
        validation_samples,
        VAL_TRANSFORM,
    )

    labels = [
        sample["label"]
        for sample in train_samples
    ]

    class_counts = np.bincount(
        labels,
        minlength=2,
    )

    normal_count = int(
        class_counts[0]
    )

    defective_count = int(
        class_counts[1]
    )

    print()
    print("=" * 90)
    print("DATA SPLIT")
    print("=" * 90)

    print(
        f"Training images   : "
        f"{len(train_samples)}"
    )

    print(
        f"Validation images : "
        f"{len(validation_samples)}"
    )

    print(
        f"Train Normal      : "
        f"{normal_count}"
    )

    print(
        f"Train Defective   : "
        f"{defective_count}"
    )

    val_normal = sum(
        sample["label"] == 0
        for sample in validation_samples
    )

    val_defective = sum(
        sample["label"] == 1
        for sample in validation_samples
    )

    print(
        f"Val Normal        : "
        f"{val_normal}"
    )

    print(
        f"Val Defective     : "
        f"{val_defective}"
    )

    print("=" * 90)

    # --------------------------------------------------------
    # BALANCED SAMPLER
    # --------------------------------------------------------

    class_weights = np.zeros(
        2,
        dtype=np.float64,
    )

    for class_id in range(2):

        if class_counts[class_id] > 0:

            class_weights[
                class_id
            ] = (
                1.0
                / class_counts[class_id]
            )

    sample_weights = [
        class_weights[label]
        for label in labels
    ]

    sampler = WeightedRandomSampler(
        torch.tensor(
            sample_weights,
            dtype=torch.double,
        ),
        num_samples=len(
            sample_weights
        ),
        replacement=True,
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        sampler=sampler,
        num_workers=NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
    )

    validation_loader = DataLoader(
        validation_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
    )

    return (
        train_loader,
        validation_loader,
        normal_count,
        defective_count,
    )


# ============================================================
# CONVOLUTION BLOCK
# ============================================================

class ConvBlock(
    nn.Module
):

    def __init__(
        self,
        in_channels,
        out_channels,
        dropout=0.0,
    ):

        super().__init__()

        self.block = nn.Sequential(

            nn.Conv2d(
                in_channels,
                out_channels,
                kernel_size=3,
                padding=1,
                bias=False,
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
                bias=False,
            ),

            nn.BatchNorm2d(
                out_channels
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.MaxPool2d(
                kernel_size=2,
                stride=2,
            ),

            nn.Dropout2d(
                p=dropout
            ),
        )

    def forward(
        self,
        x,
    ):

        return self.block(x)


# ============================================================
# MULTI-SCALE CUSTOM CNN
#
# Everything is randomly initialized.
# ============================================================

class BinaryCNNV2(
    nn.Module
):

    def __init__(
        self,
        num_classes=2,
    ):

        super().__init__()

        # ----------------------------------------------------
        # MAIN IMAGE BRANCH
        # ----------------------------------------------------

        self.main_branch = nn.Sequential(

            ConvBlock(
                3,
                32,
                dropout=0.02,
            ),

            ConvBlock(
                32,
                64,
                dropout=0.04,
            ),

            ConvBlock(
                64,
                96,
                dropout=0.06,
            ),

            ConvBlock(
                96,
                128,
                dropout=0.08,
            ),

            ConvBlock(
                128,
                192,
                dropout=0.10,
            ),
        )

        # ----------------------------------------------------
        # DETAIL BRANCH
        #
        # Uses a high-resolution feature path.
        # ----------------------------------------------------

        self.detail_branch = nn.Sequential(

            nn.Conv2d(
                3,
                32,
                kernel_size=5,
                padding=2,
                bias=False,
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
                bias=False,
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
                dropout=0.05,
            ),

            ConvBlock(
                96,
                128,
                dropout=0.08,
            ),
        )

        # ----------------------------------------------------
        # GLOBAL POOLING
        # ----------------------------------------------------

        self.main_pool = (
            nn.AdaptiveAvgPool2d(
                (1, 1)
            )
        )

        self.detail_pool = (
            nn.AdaptiveAvgPool2d(
                (1, 1)
            )
        )

        # ----------------------------------------------------
        # CLASSIFIER
        #
        # Main = 192
        # Detail = 128
        # Combined = 320
        # ----------------------------------------------------

        self.classifier = nn.Sequential(

            nn.Linear(
                320,
                160,
            ),

            nn.BatchNorm1d(
                160
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                0.35
            ),

            nn.Linear(
                160,
                80,
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                0.20
            ),

            nn.Linear(
                80,
                num_classes,
            ),
        )

        self._initialize_weights()

    # --------------------------------------------------------
    # WEIGHT INITIALIZATION
    # --------------------------------------------------------

    def _initialize_weights(
        self
    ):

        for module in self.modules():

            if isinstance(
                module,
                nn.Conv2d,
            ):

                nn.init.kaiming_normal_(
                    module.weight,
                    mode="fan_out",
                    nonlinearity="relu",
                )

                if module.bias is not None:

                    nn.init.zeros_(
                        module.bias
                    )

            elif isinstance(
                module,
                nn.Linear,
            ):

                nn.init.kaiming_normal_(
                    module.weight,
                    nonlinearity="relu",
                )

                if module.bias is not None:

                    nn.init.zeros_(
                        module.bias
                    )

            elif isinstance(
                module,
                (
                    nn.BatchNorm1d,
                    nn.BatchNorm2d,
                ),
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
        x,
    ):

        main_features = (
            self.main_branch(x)
        )

        detail_features = (
            self.detail_branch(x)
        )

        main_features = (
            self.main_pool(
                main_features
            )
        )

        detail_features = (
            self.detail_pool(
                detail_features
            )
        )

        main_features = (
            main_features.flatten(
                1
            )
        )

        detail_features = (
            detail_features.flatten(
                1
            )
        )

        combined = torch.cat(
            [
                main_features,
                detail_features,
            ],
            dim=1,
        )

        output = self.classifier(
            combined
        )

        return output


# ============================================================
# MODEL CREATION
# ============================================================

def create_model():

    print()
    print("=" * 90)
    print("CREATING BINARY CNN V2")
    print("=" * 90)

    print(
        "Architecture       : Custom Multi-Scale CNN"
    )

    print(
        "Pretrained         : NO"
    )

    print(
        "ImageNet           : NO"
    )

    print(
        "Transfer Learning  : NO"
    )

    print(
        "Training            : FROM SCRATCH"
    )

    model = BinaryCNNV2(
        num_classes=2
    )

    model = model.to(
        DEVICE
    )

    total_parameters = sum(
        parameter.numel()
        for parameter
        in model.parameters()
    )

    print(
        f"Total parameters   : "
        f"{total_parameters:,}"
    )

    print("=" * 90)

    return model


# ============================================================
# TRAIN ONE EPOCH
# ============================================================

def train_one_epoch(
    model,
    loader,
    criterion,
    optimizer,
):

    model.train()

    total_loss = 0.0

    labels_all = []

    predictions_all = []

    for images, labels in loader:

        images = images.to(
            DEVICE
        )

        labels = labels.to(
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
            labels,
        )

        loss.backward()

        torch.nn.utils.clip_grad_norm_(
            model.parameters(),
            max_norm=2.0,
        )

        optimizer.step()

        total_loss += (
            loss.item()
            * images.size(0)
        )

        predictions = torch.argmax(
            outputs,
            dim=1,
        )

        labels_all.extend(
            labels.detach()
            .cpu()
            .tolist()
        )

        predictions_all.extend(
            predictions.detach()
            .cpu()
            .tolist()
        )

    loss = (
        total_loss
        / len(loader.dataset)
    )

    accuracy = accuracy_score(
        labels_all,
        predictions_all,
    )

    precision = precision_score(
        labels_all,
        predictions_all,
        zero_division=0,
    )

    recall = recall_score(
        labels_all,
        predictions_all,
        zero_division=0,
    )

    f1 = f1_score(
        labels_all,
        predictions_all,
        zero_division=0,
    )

    return {
        "loss": float(loss),
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
    }


# ============================================================
# VALIDATION
# ============================================================

@torch.no_grad()
def evaluate(
    model,
    loader,
    criterion,
):

    model.eval()

    total_loss = 0.0

    labels_all = []

    predictions_all = []

    probabilities_all = []

    for images, labels in loader:

        images = images.to(
            DEVICE
        )

        labels = labels.to(
            DEVICE
        )

        outputs = model(
            images
        )

        loss = criterion(
            outputs,
            labels,
        )

        total_loss += (
            loss.item()
            * images.size(0)
        )

        probabilities = torch.softmax(
            outputs,
            dim=1,
        )

        defective_probability = (
            probabilities[:, 1]
        )

        predictions = (
            defective_probability
            >= 0.50
        ).long()

        labels_all.extend(
            labels.cpu()
            .tolist()
        )

        predictions_all.extend(
            predictions.cpu()
            .tolist()
        )

        probabilities_all.extend(
            defective_probability
            .cpu()
            .tolist()
        )

    loss = (
        total_loss
        / len(loader.dataset)
    )

    accuracy = accuracy_score(
        labels_all,
        predictions_all,
    )

    precision = precision_score(
        labels_all,
        predictions_all,
        zero_division=0,
    )

    recall = recall_score(
        labels_all,
        predictions_all,
        zero_division=0,
    )

    f1 = f1_score(
        labels_all,
        predictions_all,
        zero_division=0,
    )

    matrix = confusion_matrix(
        labels_all,
        predictions_all,
        labels=[0, 1],
    )

    return {
        "loss": float(loss),
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "confusion_matrix":
            matrix.tolist(),
        "labels":
            labels_all,
        "probabilities":
            probabilities_all,
    }


# ============================================================
# SAVE CHECKPOINT
# ============================================================

def save_checkpoint(
    model,
    optimizer,
    scheduler,
    epoch,
    metrics,
):

    checkpoint = {

        "model_state_dict":
            model.state_dict(),

        "optimizer_state_dict":
            optimizer.state_dict(),

        "scheduler_state_dict":
            scheduler.state_dict(),

        "epoch":
            epoch,

        "validation_metrics":
            metrics,

        "architecture":
            "VisionInspect_BinaryCNN_V2",

        "pretrained":
            False,

        "imagenet":
            False,

        "transfer_learning":
            False,

        "num_classes":
            2,

        "class_names":
            [
                "Normal",
                "Defective",
            ],

        "normal_class":
            0,

        "defective_class":
            1,

        "image_size":
            IMAGE_SIZE,

        "threshold":
            0.50,

        "categories":
            CATEGORIES,
    }

    torch.save(
        checkpoint,
        MODEL_PATH,
    )


# ============================================================
# MAIN
# ============================================================

def main():

    set_seed()

    print()
    print("=" * 100)
    print("VISIONINSPECT AI")
    print("BINARY DEFECT DETECTION V2")
    print("=" * 100)

    print(
        f"Device : {DEVICE}"
    )

    print(
        f"Dataset: {DATASET_DIR}"
    )

    print()
    print(
        "NO PRETRAINED MODEL"
    )

    print(
        "NO IMAGENET WEIGHTS"
    )

    print(
        "NO TRANSFER LEARNING"
    )

    print("=" * 100)

    # --------------------------------------------------------
    # DATA
    # --------------------------------------------------------

    samples = collect_samples()

    (
        train_samples,
        validation_samples,
    ) = split_samples(
        samples
    )

    (
        train_loader,
        validation_loader,
        normal_count,
        defective_count,
    ) = create_dataloaders(
        train_samples,
        validation_samples,
    )

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    model = create_model()

    # --------------------------------------------------------
    # LOSS
    #
    # Balanced sampler handles class imbalance.
    # Mild label smoothing improves generalization.
    # --------------------------------------------------------

    criterion = nn.CrossEntropyLoss(
        label_smoothing=0.03
    )

    # --------------------------------------------------------
    # OPTIMIZER
    # --------------------------------------------------------

    optimizer = optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
    )

    # --------------------------------------------------------
    # SCHEDULER
    # --------------------------------------------------------

    scheduler = (
        optim.lr_scheduler.ReduceLROnPlateau(
            optimizer,
            mode="max",
            factor=0.5,
            patience=3,
            min_lr=1e-6,
        )
    )

    # --------------------------------------------------------
    # TRACKING
    # --------------------------------------------------------

    best_f1 = -1.0

    best_epoch = 0

    best_metrics = None

    patience_counter = 0

    history = []

    # ========================================================
    # TRAINING LOOP
    # ========================================================

    for epoch in range(
        1,
        EPOCHS + 1,
    ):

        train_metrics = (
            train_one_epoch(
                model,
                train_loader,
                criterion,
                optimizer,
            )
        )

        validation_metrics = (
            evaluate(
                model,
                validation_loader,
                criterion,
            )
        )

        scheduler.step(
            validation_metrics["f1"]
        )

        current_lr = (
            optimizer
            .param_groups[0]
            ["lr"]
        )

        f1_gap = (
            train_metrics["f1"]
            - validation_metrics["f1"]
        )

        accuracy_gap = (
            train_metrics["accuracy"]
            - validation_metrics["accuracy"]
        )

        # ----------------------------------------------------
        # PRINT METRICS
        # ----------------------------------------------------

        print()
        print("=" * 100)

        print(
            f"Epoch {epoch:02d}/{EPOCHS}"
        )

        print(
            f"Learning Rate : "
            f"{current_lr:.7f}"
        )

        print()

        print(
            "TRAIN"
        )

        print(
            f"  Loss      : "
            f"{train_metrics['loss']:.4f}"
        )

        print(
            f"  Accuracy  : "
            f"{train_metrics['accuracy'] * 100:.2f}%"
        )

        print(
            f"  Precision : "
            f"{train_metrics['precision'] * 100:.2f}%"
        )

        print(
            f"  Recall    : "
            f"{train_metrics['recall'] * 100:.2f}%"
        )

        print(
            f"  F1        : "
            f"{train_metrics['f1'] * 100:.2f}%"
        )

        print()

        print(
            "VALIDATION"
        )

        print(
            f"  Loss      : "
            f"{validation_metrics['loss']:.4f}"
        )

        print(
            f"  Accuracy  : "
            f"{validation_metrics['accuracy'] * 100:.2f}%"
        )

        print(
            f"  Precision : "
            f"{validation_metrics['precision'] * 100:.2f}%"
        )

        print(
            f"  Recall    : "
            f"{validation_metrics['recall'] * 100:.2f}%"
        )

        print(
            f"  F1        : "
            f"{validation_metrics['f1'] * 100:.2f}%"
        )

        print()

        print(
            f"F1 Gap      : "
            f"{f1_gap * 100:.2f}%"
        )

        print(
            f"Accuracy Gap: "
            f"{accuracy_gap * 100:.2f}%"
        )

        # ----------------------------------------------------
        # GENERALIZATION DIAGNOSIS
        # ----------------------------------------------------

        if (
            train_metrics["f1"] >= 0.85
            and f1_gap > 0.15
        ):

            print(
                "⚠️ POSSIBLE OVERFITTING"
            )

        elif (
            train_metrics["f1"] < 0.70
            and validation_metrics["f1"] < 0.70
        ):

            print(
                "⚠️ POSSIBLE UNDERFITTING"
            )

        else:

            print(
                "✓ GENERALIZATION LOOKS REASONABLE"
            )

        # ----------------------------------------------------
        # HISTORY
        # ----------------------------------------------------

        history.append(
            {
                "epoch": epoch,
                "learning_rate":
                    current_lr,

                "train":
                    train_metrics,

                "validation": {
                    key: value
                    for key, value
                    in validation_metrics.items()
                    if key not in [
                        "labels",
                        "probabilities",
                    ]
                },

                "f1_gap":
                    f1_gap,

                "accuracy_gap":
                    accuracy_gap,
            }
        )

        # ----------------------------------------------------
        # BEST CHECKPOINT
        # ----------------------------------------------------

        if (
            validation_metrics["f1"]
            > best_f1
        ):

            best_f1 = (
                validation_metrics["f1"]
            )

            best_epoch = epoch

            best_metrics = (
                validation_metrics
            )

            patience_counter = 0

            save_checkpoint(
                model,
                optimizer,
                scheduler,
                epoch,
                {
                    key: value
                    for key, value
                    in validation_metrics.items()
                    if key not in [
                        "labels",
                        "probabilities",
                    ]
                },
            )

            print()
            print(
                "🎯 NEW BEST CHECKPOINT"
            )

            print(
                f"   Val F1: "
                f"{best_f1 * 100:.2f}%"
            )

        else:

            patience_counter += 1

            print()
            print(
                f"No improvement: "
                f"{patience_counter}/"
                f"{EARLY_STOPPING_PATIENCE}"
            )

        # ----------------------------------------------------
        # EARLY STOPPING
        # ----------------------------------------------------

        if (
            patience_counter
            >= EARLY_STOPPING_PATIENCE
        ):

            print()
            print(
                "🛑 EARLY STOPPING"
            )

            break

    # ========================================================
    # SAVE HISTORY
    # ========================================================

    with open(
        HISTORY_PATH,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            history,
            file,
            indent=2,
        )

    # ========================================================
    # FINAL RESULTS
    # ========================================================

    print()
    print("=" * 100)
    print("TRAINING COMPLETE")
    print("=" * 100)

    print(
        f"Best Epoch      : "
        f"{best_epoch}"
    )

    print(
        f"Best Val Acc    : "
        f"{best_metrics['accuracy'] * 100:.2f}%"
    )

    print(
        f"Best Val Prec   : "
        f"{best_metrics['precision'] * 100:.2f}%"
    )

    print(
        f"Best Val Recall : "
        f"{best_metrics['recall'] * 100:.2f}%"
    )

    print(
        f"Best Val F1     : "
        f"{best_metrics['f1'] * 100:.2f}%"
    )

    print()

    print(
        "Confusion Matrix:"
    )

    print(
        np.array(
            best_metrics[
                "confusion_matrix"
            ]
        )
    )

    print()

    print(
        f"Model saved to:"
    )

    print(
        MODEL_PATH
    )

    print()

    print(
        f"History saved to:"
    )

    print(
        HISTORY_PATH
    )

    print()

    print(
        "Pretrained       : NO"
    )

    print(
        "ImageNet         : NO"
    )

    print(
        "Transfer learning: NO"
    )

    print("=" * 100)

    if (
        best_metrics["accuracy"]
        >= 0.90
        and
        best_metrics["precision"]
        >= 0.90
        and
        best_metrics["recall"]
        >= 0.90
        and
        best_metrics["f1"]
        >= 0.90
    ):

        print(
            "🎯 90% TARGET ACHIEVED"
        )

    else:

        print(
            "⚠️ 90% TARGET NOT YET ACHIEVED"
        )

        print(
            "Do not connect this model "
            "to production yet."
        )

    print("=" * 100)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()