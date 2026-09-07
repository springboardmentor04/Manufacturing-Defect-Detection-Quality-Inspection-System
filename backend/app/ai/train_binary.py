# ============================================================
# VISIONINSPECT AI
# BINARY DEFECT DETECTION
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
# Model:
#   Custom CNN trained completely from scratch
#
# Output:
#   app/ai/saved_models/binary_model.pth
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

IMAGE_SIZE = 224

BATCH_SIZE = 32

EPOCHS = 50

LEARNING_RATE = 0.0003

WEIGHT_DECAY = 0.0001

EARLY_STOPPING_PATIENCE = 8

NUM_WORKERS = 0

DROPOUT = 0.35


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
    / "binary_model.pth"
)

HISTORY_PATH = (
    MODEL_DIR
    / "binary_training_history.json"
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
# DEFECT FOLDERS
# ============================================================

DEFECT_FOLDERS = {
    "bottle": [
        "broken_large",
        "broken_small",
        "contamination",
    ],

    "cable": [
        "bent_wire",
        "cable_swap",
        "combined",
        "cut_inner_insulation",
        "cut_outer_insulation",
        "missing_cable",
        "missing_wire",
        "poke_insulation",
    ],

    "capsule": [
        "crack",
        "faulty_imprint",
        "poke",
        "scratch",
        "squeeze",
    ],

    "carpet": [
        "color",
        "cut",
        "hole",
        "metal_contamination",
        "thread",
    ],

    "grid": [
        "bent",
        "broken",
        "glue",
        "metal_contamination",
        "thread",
    ],

    "hazelnut": [
        "crack",
        "cut",
        "hole",
        "print",
    ],

    "leather": [
        "color",
        "cut",
        "fold",
        "glue",
        "poke",
    ],

    "metal_nut": [
        "bent",
        "color",
        "flip",
        "scratch",
    ],

    "pill": [
        "color",
        "combined",
        "contamination",
        "crack",
        "faulty_imprint",
        "pill_type",
        "scratch",
    ],

    "screw": [
        "manipulated_front",
        "scratch_head",
        "scratch_neck",
        "thread_side",
        "thread_top",
    ],

    "tile": [
        "crack",
        "glue_strip",
        "gray_stroke",
        "oil",
        "rough",
    ],

    "toothbrush": [
        "defective",
    ],

    "transistor": [
        "bent_lead",
        "cut_lead",
        "damaged_case",
        "misplaced",
    ],

    "wood": [
        "color",
        "combined",
        "hole",
        "liquid",
        "scratch",
    ],

    "zipper": [
        "broken_teeth",
        "combined",
        "fabric_border",
        "fabric_interior",
        "rough",
        "squeezed_teeth",
    ],
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
# DATA COLLECTION
# ============================================================

def collect_samples():

    samples = []

    print()
    print("=" * 80)
    print("COLLECTING BINARY DATASET")
    print("=" * 80)

    print(
        f"Dataset path:\n{DATASET_DIR}"
    )

    if not DATASET_DIR.exists():

        raise FileNotFoundError(
            f"\nDataset not found:\n"
            f"{DATASET_DIR}\n\n"
            f"Expected structure:\n"
            f"backend/dataset/mvtec_ad/"
        )

    for category in CATEGORIES:

        category_dir = (
            DATASET_DIR
            / category
        )

        if not category_dir.exists():

            print(
                f"WARNING: Missing category: "
                f"{category}"
            )

            continue

        # ----------------------------------------------------
        # NORMAL IMAGES
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
                    in [
                        ".png",
                        ".jpg",
                        ".jpeg",
                        ".bmp",
                        ".webp",
                    ]
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
        # DEFECTIVE IMAGES
        # ----------------------------------------------------

        test_dir = (
            category_dir
            / "test"
        )

        if not test_dir.exists():

            continue

        for defect_name in DEFECT_FOLDERS.get(
            category,
            [],
        ):

            defect_dir = (
                test_dir
                / defect_name
            )

            if not defect_dir.exists():

                continue

            for path in sorted(
                defect_dir.iterdir()
            ):

                if (
                    path.is_file()
                    and path.suffix.lower()
                    in [
                        ".png",
                        ".jpg",
                        ".jpeg",
                        ".bmp",
                        ".webp",
                    ]
                ):

                    samples.append(
                        {
                            "path": str(path),
                            "label": 1,
                            "category": category,
                            "defect": defect_name,
                        }
                    )

    normal_count = sum(
        sample["label"] == 0
        for sample in samples
    )

    defect_count = sum(
        sample["label"] == 1
        for sample in samples
    )

    print()
    print(
        f"Total samples     : {len(samples)}"
    )

    print(
        f"Normal samples    : {normal_count}"
    )

    print(
        f"Defective samples : {defect_count}"
    )

    print("=" * 80)

    if normal_count == 0:

        raise RuntimeError(
            "No normal images were found."
        )

    if defect_count == 0:

        raise RuntimeError(
            "No defective images were found."
        )

    return samples


# ============================================================
# CATEGORY-AWARE STRATIFIED SPLIT
#
# Each category/class combination is split separately.
# ============================================================

def split_samples(
    samples,
    validation_ratio=0.20,
):

    grouped = {}

    for sample in samples:

        key = (
            sample["category"],
            sample["label"],
        )

        if key not in grouped:

            grouped[key] = []

        grouped[key].append(
            sample
        )

    rng = random.Random(
        SEED
    )

    train_samples = []

    val_samples = []

    for key in sorted(
        grouped.keys()
    ):

        group = list(
            grouped[key]
        )

        rng.shuffle(group)

        if len(group) <= 1:

            train_samples.extend(
                group
            )

            continue

        validation_count = max(
            1,
            round(
                len(group)
                * validation_ratio
            ),
        )

        # Never remove every sample
        # from training.

        if validation_count >= len(group):

            validation_count = (
                len(group) - 1
            )

        val_part = group[
            :validation_count
        ]

        train_part = group[
            validation_count:
        ]

        train_samples.extend(
            train_part
        )

        val_samples.extend(
            val_part
        )

    rng.shuffle(
        train_samples
    )

    rng.shuffle(
        val_samples
    )

    return (
        train_samples,
        val_samples,
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
# DATA AUGMENTATION
#
# Controlled augmentation.
# We avoid aggressive transformations because
# small industrial defects can be orientation-sensitive.
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
            degrees=8
        ),

        transforms.ColorJitter(
            brightness=0.12,
            contrast=0.12,
            saturation=0.08,
            hue=0.015,
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
    val_samples,
):

    train_dataset = BinaryDataset(
        train_samples,
        TRAIN_TRANSFORM,
    )

    val_dataset = BinaryDataset(
        val_samples,
        VAL_TRANSFORM,
    )

    train_labels = [
        sample["label"]
        for sample in train_samples
    ]

    class_counts = np.bincount(
        train_labels,
        minlength=2,
    )

    normal_count = int(
        class_counts[0]
    )

    defect_count = int(
        class_counts[1]
    )

    print()
    print("=" * 80)
    print("TRAIN / VALIDATION SPLIT")
    print("=" * 80)

    print(
        f"Training images    : "
        f"{len(train_samples)}"
    )

    print(
        f"Validation images  : "
        f"{len(val_samples)}"
    )

    print(
        f"Training Normal    : "
        f"{normal_count}"
    )

    print(
        f"Training Defective : "
        f"{defect_count}"
    )

    val_normal = sum(
        sample["label"] == 0
        for sample in val_samples
    )

    val_defect = sum(
        sample["label"] == 1
        for sample in val_samples
    )

    print(
        f"Validation Normal  : "
        f"{val_normal}"
    )

    print(
        f"Validation Defect  : "
        f"{val_defect}"
    )

    print("=" * 80)

    # --------------------------------------------------------
    # BALANCED SAMPLING
    # --------------------------------------------------------

    class_sample_weights = np.zeros(
        2,
        dtype=np.float64,
    )

    for class_id in range(2):

        if class_counts[class_id] > 0:

            class_sample_weights[
                class_id
            ] = (
                1.0
                / class_counts[class_id]
            )

    sample_weights = np.array(
        [
            class_sample_weights[
                label
            ]
            for label in train_labels
        ],
        dtype=np.float64,
    )

    sampler = WeightedRandomSampler(
        weights=torch.tensor(
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

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
    )

    return (
        train_loader,
        val_loader,
        normal_count,
        defect_count,
    )


# ============================================================
# CUSTOM CNN
#
# IMPORTANT:
# Completely randomly initialized.
# No pretrained weights.
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


class CustomDefectCNN(
    nn.Module
):

    def __init__(
        self,
        num_classes=2,
    ):

        super().__init__()

        self.features = nn.Sequential(

            ConvBlock(
                3,
                32,
                dropout=0.03,
            ),

            ConvBlock(
                32,
                64,
                dropout=0.05,
            ),

            ConvBlock(
                64,
                128,
                dropout=0.08,
            ),

            ConvBlock(
                128,
                256,
                dropout=0.10,
            ),
        )

        self.pool = (
            nn.AdaptiveAvgPool2d(
                (1, 1)
            )
        )

        self.classifier = nn.Sequential(

            nn.Flatten(),

            nn.Linear(
                256,
                128,
            ),

            nn.BatchNorm1d(
                128
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                p=DROPOUT
            ),

            nn.Linear(
                128,
                64,
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                p=0.20
            ),

            nn.Linear(
                64,
                num_classes,
            ),
        )

        self._initialize_weights()

    def _initialize_weights(
        self
    ):

        # Explicitly initialize all weights
        # so this model is completely
        # trained from scratch.

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
                    nn.BatchNorm2d,
                    nn.BatchNorm1d,
                ),
            ):

                nn.init.ones_(
                    module.weight
                )

                nn.init.zeros_(
                    module.bias
                )

    def forward(
        self,
        x,
    ):

        x = self.features(x)

        x = self.pool(x)

        x = self.classifier(x)

        return x


# ============================================================
# MODEL FACTORY
# ============================================================

def create_model():

    print()
    print("=" * 80)
    print("CREATING CUSTOM CNN")
    print("=" * 80)

    print(
        "Pretrained model : NO"
    )

    print(
        "ImageNet weights  : NO"
    )

    print(
        "Transfer learning : NO"
    )

    print(
        "Training mode     : FROM SCRATCH"
    )

    model = CustomDefectCNN(
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

    trainable_parameters = sum(
        parameter.numel()
        for parameter
        in model.parameters()
        if parameter.requires_grad
    )

    print(
        f"Total parameters     : "
        f"{total_parameters:,}"
    )

    print(
        f"Trainable parameters : "
        f"{trainable_parameters:,}"
    )

    print("=" * 80)

    return model


# ============================================================
# TRAINING
# ============================================================

def train_one_epoch(
    model,
    loader,
    criterion,
    optimizer,
):

    model.train()

    running_loss = 0.0

    all_labels = []

    all_predictions = []

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

        running_loss += (
            loss.item()
            * images.size(0)
        )

        predictions = torch.argmax(
            outputs,
            dim=1,
        )

        all_labels.extend(
            labels.detach()
            .cpu()
            .tolist()
        )

        all_predictions.extend(
            predictions.detach()
            .cpu()
            .tolist()
        )

    epoch_loss = (
        running_loss
        / len(loader.dataset)
    )

    accuracy = accuracy_score(
        all_labels,
        all_predictions,
    )

    precision = precision_score(
        all_labels,
        all_predictions,
        zero_division=0,
    )

    recall = recall_score(
        all_labels,
        all_predictions,
        zero_division=0,
    )

    f1 = f1_score(
        all_labels,
        all_predictions,
        zero_division=0,
    )

    return {
        "loss": float(
            epoch_loss
        ),
        "accuracy": float(
            accuracy
        ),
        "precision": float(
            precision
        ),
        "recall": float(
            recall
        ),
        "f1": float(
            f1
        ),
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

    running_loss = 0.0

    all_labels = []

    all_predictions = []

    all_probabilities = []

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

        running_loss += (
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

        all_labels.extend(
            labels.cpu()
            .tolist()
        )

        all_predictions.extend(
            predictions.cpu()
            .tolist()
        )

        all_probabilities.extend(
            defective_probability
            .cpu()
            .tolist()
        )

    epoch_loss = (
        running_loss
        / len(loader.dataset)
    )

    accuracy = accuracy_score(
        all_labels,
        all_predictions,
    )

    precision = precision_score(
        all_labels,
        all_predictions,
        zero_division=0,
    )

    recall = recall_score(
        all_labels,
        all_predictions,
        zero_division=0,
    )

    f1 = f1_score(
        all_labels,
        all_predictions,
        zero_division=0,
    )

    matrix = confusion_matrix(
        all_labels,
        all_predictions,
        labels=[0, 1],
    )

    return {
        "loss": float(
            epoch_loss
        ),
        "accuracy": float(
            accuracy
        ),
        "precision": float(
            precision
        ),
        "recall": float(
            recall
        ),
        "f1": float(
            f1
        ),
        "confusion_matrix":
            matrix.tolist(),
        "labels":
            all_labels,
        "probabilities":
            all_probabilities,
    }


# ============================================================
# CHECKPOINT
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
            "VisionInspect_CustomCNN_v2",

        "pretrained":
            False,

        "transfer_learning":
            False,

        "imagenet_weights":
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

        "recommended_threshold":
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
    print("=" * 90)
    print("VISIONINSPECT AI")
    print("BINARY DEFECT MODEL — FROM SCRATCH")
    print("=" * 90)

    print(
        f"Device : {DEVICE}"
    )

    print(
        f"Dataset: {DATASET_DIR}"
    )

    print()
    print(
        "PRETRAINED MODEL: NO"
    )

    print(
        "TRANSFER LEARNING: NO"
    )

    print(
        "IMAGENET WEIGHTS: NO"
    )

    print("=" * 90)

    # --------------------------------------------------------
    # DATA
    # --------------------------------------------------------

    samples = collect_samples()

    (
        train_samples,
        val_samples,
    ) = split_samples(
        samples
    )

    (
        train_loader,
        val_loader,
        normal_count,
        defect_count,
    ) = create_dataloaders(
        train_samples,
        val_samples,
    )

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    model = create_model()

    # --------------------------------------------------------
    # LOSS
    #
    # Weighted sampler already balances batches.
    # Therefore we use a lightly smoothed,
    # unweighted CE loss to avoid over-correcting
    # the minority class.
    # --------------------------------------------------------

    criterion = nn.CrossEntropyLoss(
        label_smoothing=0.05
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

    best_accuracy = 0.0

    best_precision = 0.0

    best_recall = 0.0

    best_epoch = 0

    patience_counter = 0

    history = []

    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

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

        val_metrics = evaluate(
            model,
            val_loader,
            criterion,
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
            - val_metrics["f1"]
        )

        accuracy_gap = (
            train_metrics["accuracy"]
            - val_metrics["accuracy"]
        )

        # ----------------------------------------------------
        # PRINT
        # ----------------------------------------------------

        print()
        print(
            "=" * 90
        )

        print(
            f"Epoch {epoch:02d}/{EPOCHS}"
        )

        print(
            f"Learning Rate : "
            f"{learning_rate:.7f}"
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
            f"{val_metrics['loss']:.4f}"
        )

        print(
            f"  Accuracy  : "
            f"{val_metrics['accuracy'] * 100:.2f}%"
        )

        print(
            f"  Precision : "
            f"{val_metrics['precision'] * 100:.2f}%"
        )

        print(
            f"  Recall    : "
            f"{val_metrics['recall'] * 100:.2f}%"
        )

        print(
            f"  F1        : "
            f"{val_metrics['f1'] * 100:.2f}%"
        )

        print()

        print(
            f"F1 Gap     : "
            f"{f1_gap * 100:.2f}%"
        )

        print(
            f"Accuracy Gap: "
            f"{accuracy_gap * 100:.2f}%"
        )

        # ----------------------------------------------------
        # OVERFITTING WARNING
        # ----------------------------------------------------

        if (
            f1_gap > 0.15
            and train_metrics["f1"]
            > 0.85
        ):

            print(
                "⚠️ WARNING: "
                "Possible overfitting."
            )

        elif (
            train_metrics["f1"] < 0.70
            and val_metrics["f1"] < 0.70
        ):

            print(
                "⚠️ WARNING: "
                "Possible underfitting."
            )

        else:

            print(
                "✓ Generalization looks reasonable."
            )

        # ----------------------------------------------------
        # HISTORY
        # ----------------------------------------------------

        history_item = {

            "epoch":
                epoch,

            "learning_rate":
                learning_rate,

            "train":
                train_metrics,

            "validation": {

                key: value

                for key, value
                in val_metrics.items()

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

        history.append(
            history_item
        )

        # ----------------------------------------------------
        # BEST MODEL
        #
        # Primary selection:
        # Validation F1
        # ----------------------------------------------------

        if (
            val_metrics["f1"]
            > best_f1
        ):

            best_f1 = (
                val_metrics["f1"]
            )

            best_accuracy = (
                val_metrics["accuracy"]
            )

            best_precision = (
                val_metrics["precision"]
            )

            best_recall = (
                val_metrics["recall"]
            )

            best_epoch = epoch

            patience_counter = 0

            save_checkpoint(
                model,
                optimizer,
                scheduler,
                epoch,
                {
                    key: value
                    for key, value
                    in val_metrics.items()
                    if key not in [
                        "labels",
                        "probabilities",
                    ]
                },
            )

            print()
            print(
                "🎯 NEW BEST MODEL SAVED"
            )

            print(
                f"   Validation F1: "
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

            print(
                "Validation F1 has not "
                "improved."
            )

            break

    # --------------------------------------------------------
    # SAVE HISTORY
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # FINAL REPORT
    # --------------------------------------------------------

    print()
    print("=" * 90)
    print("TRAINING COMPLETE")
    print("=" * 90)

    print(
        f"Best Epoch       : "
        f"{best_epoch}"
    )

    print(
        f"Best Val Accuracy: "
        f"{best_accuracy * 100:.2f}%"
    )

    print(
        f"Best Val Precision: "
        f"{best_precision * 100:.2f}%"
    )

    print(
        f"Best Val Recall  : "
        f"{best_recall * 100:.2f}%"
    )

    print(
        f"Best Val F1      : "
        f"{best_f1 * 100:.2f}%"
    )

    print()
    print(
        "Model:"
    )

    print(
        MODEL_PATH
    )

    print()
    print(
        "Training history:"
    )

    print(
        HISTORY_PATH
    )

    print()
    print(
        "Pretrained       : NO"
    )

    print(
        "Transfer learning: NO"
    )

    print(
        "ImageNet          : NO"
    )

    print("=" * 90)

    if best_f1 >= 0.90:

        print(
            "🎯 TARGET ACHIEVED"
        )

        print(
            "Validation F1 >= 90%"
        )

    else:

        print(
            "⚠️ 90% TARGET NOT YET ACHIEVED"
        )

        print(
            "Do NOT replace the production "
            "model yet."
        )

    print("=" * 90)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()