"""
===============================================================================
VISIONINSPECT AI
CABLE BINARY DEFECT DETECTOR V3.1
===============================================================================

FROM-SCRATCH TRAINING ONLY

Dataset:
    MVTec AD / cable

Classes:
    0 = Normal
    1 = Defective

Dataset construction:
    train/good          -> Normal
    test/good           -> EXCLUDED
    test/<defect>       -> Defective

NO:
    - Pretrained models
    - ImageNet
    - ResNet
    - Transfer learning

V3.1 goal:
    Improve the V2 model while avoiding the instability seen in V3.

Run:
    python -m app.ai.train_cable_binary_v31
===============================================================================
"""

import os
import random
from collections import Counter

import numpy as np
from PIL import Image

import torch
import torch.nn as nn
import torch.optim as optim

from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler

from torchvision import transforms

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)


# =============================================================================
# CONFIGURATION
# =============================================================================

SEED = 42

CATEGORY = "cable"

IMAGE_SIZE = 256

BATCH_SIZE = 8

EPOCHS = 25

LEARNING_RATE = 0.00025

WEIGHT_DECAY = 0.0003

VAL_RATIO = 0.20

PATIENCE = 7

NUM_WORKERS = 0

GRADIENT_CLIP = 1.0


# =============================================================================
# DEVICE
# =============================================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# =============================================================================
# PATHS
# =============================================================================

AI_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

BACKEND_DIR = os.path.abspath(
    os.path.join(AI_DIR, "../..")
)

DATASET_ROOT = os.path.join(
    BACKEND_DIR,
    "dataset",
    "mvtec_ad"
)

CATEGORY_ROOT = os.path.join(
    DATASET_ROOT,
    CATEGORY
)

MODEL_DIR = os.path.join(
    AI_DIR,
    "saved_models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "cable_binary_v31.pth"
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)


# =============================================================================
# IMAGE EXTENSIONS
# =============================================================================

IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".webp",
}


# =============================================================================
# REPRODUCIBILITY
# =============================================================================

def set_seed():

    random.seed(SEED)

    np.random.seed(SEED)

    torch.manual_seed(SEED)

    if torch.cuda.is_available():

        torch.cuda.manual_seed_all(SEED)

        torch.backends.cudnn.deterministic = True

        torch.backends.cudnn.benchmark = False


# =============================================================================
# TRANSFORMS
# =============================================================================
#
# IMPORTANT:
# Cable orientation can matter.
#
# Therefore we do NOT use vertical flipping.
#
# We also keep augmentation moderate because V3 showed that aggressive
# augmentation caused unstable learning.
# =============================================================================

TRAIN_TRANSFORM = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.RandomHorizontalFlip(
        p=0.35
    ),

    transforms.RandomRotation(
        degrees=3
    ),

    transforms.ColorJitter(
        brightness=0.05,
        contrast=0.05,
        saturation=0.03,
        hue=0.005
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


# =============================================================================
# DATASET COLLECTION
# =============================================================================

def collect_dataset():

    train_good_dir = os.path.join(
        CATEGORY_ROOT,
        "train",
        "good"
    )

    test_dir = os.path.join(
        CATEGORY_ROOT,
        "test"
    )

    if not os.path.isdir(train_good_dir):

        raise FileNotFoundError(
            f"Normal directory not found:\n{train_good_dir}"
        )

    if not os.path.isdir(test_dir):

        raise FileNotFoundError(
            f"Test directory not found:\n{test_dir}"
        )

    samples = []

    normal_count = 0

    defective_count = 0

    skipped_good = 0

    defect_counts = Counter()

    # =========================================================================
    # NORMAL
    # =========================================================================

    for filename in sorted(
        os.listdir(train_good_dir)
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
            and extension in IMAGE_EXTENSIONS
        ):

            samples.append(
                (path, 0)
            )

            normal_count += 1

    # =========================================================================
    # DEFECTIVE
    # =========================================================================

    for defect_name in sorted(
        os.listdir(test_dir)
    ):

        defect_dir = os.path.join(
            test_dir,
            defect_name
        )

        if not os.path.isdir(
            defect_dir
        ):

            continue

        # Never include test/good.
        if defect_name.lower() == "good":

            for filename in os.listdir(
                defect_dir
            ):

                extension = os.path.splitext(
                    filename
                )[1].lower()

                if extension in IMAGE_EXTENSIONS:

                    skipped_good += 1

            continue

        defect_count = 0

        for filename in sorted(
            os.listdir(defect_dir)
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
                and extension in IMAGE_EXTENSIONS
            ):

                samples.append(
                    (path, 1)
                )

                defective_count += 1

                defect_count += 1

        defect_counts[
            defect_name
        ] = defect_count

    # =========================================================================
    # REPORT
    # =========================================================================

    print()
    print("=" * 90)
    print("DATASET VERIFICATION")
    print("=" * 90)

    print(
        f"Category          : {CATEGORY}"
    )

    print(
        f"Normal            : {normal_count}"
    )

    print(
        f"Defective         : {defective_count}"
    )

    print(
        f"Total             : {len(samples)}"
    )

    print(
        f"test/good skipped : {skipped_good}"
    )

    print()
    print("DEFECT TYPES")

    for name, count in sorted(
        defect_counts.items()
    ):

        print(
            f"  {name:<32}{count:>5}"
        )

    print("=" * 90)

    # =========================================================================
    # DATASET SAFETY CHECK
    # =========================================================================

    if normal_count != 224:

        print(
            f"⚠️ WARNING: expected 224 normal, "
            f"found {normal_count}"
        )

    if defective_count != 92:

        print(
            f"⚠️ WARNING: expected 92 defective, "
            f"found {defective_count}"
        )

    if normal_count == 224 and defective_count == 92:

        print(
            "✓ DATASET COUNTS VERIFIED"
        )

    return (
        samples,
        defect_counts,
        skipped_good
    )


# =============================================================================
# STRATIFIED SPLIT
# =============================================================================

def stratified_split(
    samples
):

    normal = [
        sample
        for sample in samples
        if sample[1] == 0
    ]

    defective = [
        sample
        for sample in samples
        if sample[1] == 1
    ]

    rng = random.Random(
        SEED
    )

    rng.shuffle(normal)

    rng.shuffle(defective)

    normal_val = int(
        len(normal) * VAL_RATIO
    )

    defective_val = int(
        len(defective) * VAL_RATIO
    )

    normal_val = max(
        1,
        normal_val
    )

    defective_val = max(
        1,
        defective_val
    )

    validation = (
        normal[:normal_val]
        +
        defective[:defective_val]
    )

    training = (
        normal[normal_val:]
        +
        defective[defective_val:]
    )

    rng.shuffle(training)

    rng.shuffle(validation)

    return (
        training,
        validation
    )


# =============================================================================
# DATASET
# =============================================================================

class CableDataset(
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

        image = Image.open(
            path
        ).convert(
            "RGB"
        )

        image = self.transform(
            image
        )

        return (
            image,
            torch.tensor(
                label,
                dtype=torch.long
            )
        )


# =============================================================================
# CUSTOM CNN
# =============================================================================

class ConvBlock(
    nn.Module
):

    def __init__(
        self,
        in_channels,
        out_channels,
        dropout
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


class CableCNNV31(
    nn.Module
):

    def __init__(
        self
    ):

        super().__init__()

        self.features = nn.Sequential(

            ConvBlock(
                3,
                32,
                0.01
            ),

            ConvBlock(
                32,
                64,
                0.02
            ),

            ConvBlock(
                64,
                96,
                0.03
            ),

            ConvBlock(
                96,
                128,
                0.05
            )
        )

        self.pool = nn.AdaptiveAvgPool2d(
            1
        )

        self.classifier = nn.Sequential(

            nn.Flatten(),

            nn.Linear(
                128,
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

    def forward(
        self,
        x
    ):

        x = self.features(x)

        x = self.pool(x)

        x = self.classifier(x)

        return x


# =============================================================================
# METRICS
# =============================================================================

def metrics(
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


# =============================================================================
# TRAIN
# =============================================================================

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

        predicted = outputs.argmax(
            dim=1
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

    result = metrics(
        labels,
        predictions
    )

    result["loss"] = (
        total_loss
        /
        len(labels)
    )

    return result


# =============================================================================
# VALIDATE
# =============================================================================

@torch.no_grad()
def validate(
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

        probabilities_batch = torch.softmax(
            outputs,
            dim=1
        )[:, 1]

        predicted = outputs.argmax(
            dim=1
        )

        labels.extend(
            targets.cpu().tolist()
        )

        predictions.extend(
            predicted.cpu().tolist()
        )

        probabilities.extend(
            probabilities_batch.cpu().tolist()
        )

    result = metrics(
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
        )
    )

    result["labels"] = labels

    result["predictions"] = predictions

    result["probabilities"] = probabilities

    return result


# =============================================================================
# MAIN
# =============================================================================

def main():

    set_seed()

    print()
    print("=" * 90)
    print("VISIONINSPECT AI")
    print("CABLE BINARY DEFECT DETECTOR V3.1")
    print("=" * 90)

    print(
        f"Device       : {DEVICE}"
    )

    print(
        "Pretrained   : NO"
    )

    print(
        "ImageNet     : NO"
    )

    print(
        "ResNet       : NO"
    )

    print(
        "Transfer     : NO"
    )

    print(
        "Training     : FROM SCRATCH"
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

    print("=" * 90)

    # =========================================================================
    # COLLECT DATA
    # =========================================================================

    (
        samples,
        defect_counts,
        skipped_good
    ) = collect_dataset()

    class_counts = Counter(
        label
        for _, label in samples
    )

    # =========================================================================
    # SPLIT
    # =========================================================================

    (
        train_samples,
        val_samples
    ) = stratified_split(
        samples
    )

    train_counts = Counter(
        label
        for _, label in train_samples
    )

    val_counts = Counter(
        label
        for _, label in val_samples
    )

    print()
    print("=" * 90)
    print("TRAIN / VALIDATION SPLIT")
    print("=" * 90)

    print(
        f"Training images   : "
        f"{len(train_samples)}"
    )

    print(
        f"Validation images : "
        f"{len(val_samples)}"
    )

    print()

    print("TRAIN")

    print(
        f"  Normal     : "
        f"{train_counts[0]}"
    )

    print(
        f"  Defective  : "
        f"{train_counts[1]}"
    )

    print()

    print("VALIDATION")

    print(
        f"  Normal     : "
        f"{val_counts[0]}"
    )

    print(
        f"  Defective  : "
        f"{val_counts[1]}"
    )

    # =========================================================================
    # DATASETS
    # =========================================================================

    train_dataset = CableDataset(
        train_samples,
        TRAIN_TRANSFORM
    )

    val_dataset = CableDataset(
        val_samples,
        VAL_TRANSFORM
    )

    # =========================================================================
    # BALANCED SAMPLER
    # =========================================================================

    train_class_counts = Counter(
        label
        for _, label in train_samples
    )

    sample_weights = []

    for _, label in train_samples:

        sample_weights.append(
            1.0 /
            train_class_counts[label]
        )

    sample_weights = torch.tensor(
        sample_weights,
        dtype=torch.double
    )

    sampler = WeightedRandomSampler(
        sample_weights,
        num_samples=len(
            sample_weights
        ),
        replacement=True
    )

    print()
    print(
        "✓ Balanced sampler enabled"
    )

    # =========================================================================
    # LOADERS
    # =========================================================================

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        sampler=sampler,
        num_workers=NUM_WORKERS,
        pin_memory=(
            DEVICE.type == "cuda"
        )
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=(
            DEVICE.type == "cuda"
        )
    )

    # =========================================================================
    # MODEL
    # =========================================================================

    print()
    print("=" * 90)
    print("CREATING CUSTOM CNN V3.1")
    print("=" * 90)

    model = CableCNNV31().to(
        DEVICE
    )

    parameter_count = sum(
        p.numel()
        for p in model.parameters()
    )

    trainable_count = sum(
        p.numel()
        for p in model.parameters()
        if p.requires_grad
    )

    print(
        f"Parameters        : "
        f"{parameter_count:,}"
    )

    print(
        f"Trainable         : "
        f"{trainable_count:,}"
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

    # =========================================================================
    # LOSS
    # =========================================================================

    criterion = nn.CrossEntropyLoss(
        label_smoothing=0.02
    )

    # =========================================================================
    # OPTIMIZER
    # =========================================================================

    optimizer = optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY
    )

    # =========================================================================
    # SCHEDULER
    # =========================================================================

    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode="max",
        factor=0.5,
        patience=3,
        min_lr=1e-5
    )

    # =========================================================================
    # BEST MODEL
    # =========================================================================

    best_f1 = -1.0

    best_accuracy = -1.0

    best_epoch = 0

    best_state = None

    no_improvement = 0

    # =========================================================================
    # TRAINING LOOP
    # =========================================================================

    for epoch in range(
        1,
        EPOCHS + 1
    ):

        train_metrics = train_epoch(
            model,
            train_loader,
            criterion,
            optimizer
        )

        val_metrics = validate(
            model,
            val_loader,
            criterion
        )

        scheduler.step(
            val_metrics["f1"]
        )

        current_lr = (
            optimizer
            .param_groups[0]["lr"]
        )

        accuracy_gap = (
            train_metrics["accuracy"]
            -
            val_metrics["accuracy"]
        )

        f1_gap = (
            train_metrics["f1"]
            -
            val_metrics["f1"]
        )

        print()
        print(
            f"Epoch {epoch:02d}/{EPOCHS}"
        )

        print(
            f"  LR: {current_lr:.7f}"
        )

        print(
            f"  TRAIN "
            f"Loss={train_metrics['loss']:.4f} "
            f"Acc={train_metrics['accuracy'] * 100:.2f}% "
            f"Prec={train_metrics['precision'] * 100:.2f}% "
            f"Recall={train_metrics['recall'] * 100:.2f}% "
            f"F1={train_metrics['f1'] * 100:.2f}%"
        )

        print(
            f"  VAL   "
            f"Loss={val_metrics['loss']:.4f} "
            f"Acc={val_metrics['accuracy'] * 100:.2f}% "
            f"Prec={val_metrics['precision'] * 100:.2f}% "
            f"Recall={val_metrics['recall'] * 100:.2f}% "
            f"F1={val_metrics['f1'] * 100:.2f}%"
        )

        print(
            f"  GAP   "
            f"Acc={accuracy_gap * 100:.2f}% "
            f"F1={f1_gap * 100:.2f}%"
        )

        # =====================================================================
        # DIAGNOSIS
        # =====================================================================

        if (
            train_metrics["accuracy"] < 0.75
            and
            val_metrics["accuracy"] < 0.75
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
                "  ⚠️ OVERFITTING"
            )

        elif (
            val_metrics["accuracy"] >= 0.90
            and
            val_metrics["f1"] >= 0.90
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

        # =====================================================================
        # BEST CHECKPOINT
        # =====================================================================

        improved = False

        if val_metrics["f1"] > best_f1:

            improved = True

        elif (
            val_metrics["f1"] == best_f1
            and
            val_metrics["accuracy"] > best_accuracy
        ):

            improved = True

        if improved:

            best_f1 = val_metrics["f1"]

            best_accuracy = val_metrics["accuracy"]

            best_epoch = epoch

            best_state = {
                key: value.detach()
                .cpu()
                .clone()
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

        # =====================================================================
        # EARLY STOPPING
        # =====================================================================

        if no_improvement >= PATIENCE:

            print()
            print(
                "🛑 EARLY STOPPING"
            )

            break

    # =========================================================================
    # RESTORE BEST
    # =========================================================================

    if best_state is None:

        raise RuntimeError(
            "No valid checkpoint was produced."
        )

    model.load_state_dict(
        best_state
    )

    # =========================================================================
    # FINAL EVALUATION
    # =========================================================================

    final_metrics = validate(
        model,
        val_loader,
        criterion
    )

    # =========================================================================
    # SAVE CHECKPOINT
    # =========================================================================

    checkpoint = {

        "model_state_dict":
            model.state_dict(),

        "category":
            CATEGORY,

        "class_names":
            [
                "good",
                "defective"
            ],

        "num_classes":
            2,

        "architecture":
            "CableCNNV31",

        "image_size":
            IMAGE_SIZE,

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
            final_metrics["accuracy"],

        "validation_precision":
            final_metrics["precision"],

        "validation_recall":
            final_metrics["recall"],

        "validation_f1":
            final_metrics["f1"],

        "dataset_total":
            len(samples),

        "dataset_normal":
            class_counts[0],

        "dataset_defective":
            class_counts[1],

        "test_good_excluded":
            True,

        "test_good_skipped":
            skipped_good,

        "defect_types":
            dict(defect_counts),

        "batch_size":
            BATCH_SIZE,

        "learning_rate":
            LEARNING_RATE,

        "weight_decay":
            WEIGHT_DECAY,

        "seed":
            SEED
    }

    torch.save(
        checkpoint,
        MODEL_PATH
    )

    # =========================================================================
    # FINAL REPORT
    # =========================================================================

    print()
    print("=" * 90)
    print("FINAL CABLE V3.1 MODEL")
    print("=" * 90)

    print(
        f"Best epoch : "
        f"{best_epoch}"
    )

    print(
        f"Accuracy   : "
        f"{final_metrics['accuracy'] * 100:.2f}%"
    )

    print(
        f"Precision  : "
        f"{final_metrics['precision'] * 100:.2f}%"
    )

    print(
        f"Recall     : "
        f"{final_metrics['recall'] * 100:.2f}%"
    )

    print(
        f"F1         : "
        f"{final_metrics['f1'] * 100:.2f}%"
    )

    # =========================================================================
    # CONFUSION MATRIX
    # =========================================================================

    cm = final_metrics[
        "confusion_matrix"
    ]

    print()
    print("CONFUSION MATRIX")

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

    # =========================================================================
    # ERROR ANALYSIS
    # =========================================================================

    false_positives = cm[0][1]

    false_negatives = cm[1][0]

    print()
    print("ERROR ANALYSIS")

    print(
        f"False Positives : "
        f"{false_positives}"
    )

    print(
        f"False Negatives : "
        f"{false_negatives}"
    )

    # =========================================================================
    # TARGET
    # =========================================================================

    print()
    print("TARGET CHECK")

    if (
        final_metrics["accuracy"] >= 0.90
        and
        final_metrics["f1"] >= 0.90
    ):

        print(
            "✅ 90%+ ACCURACY AND F1 ACHIEVED"
        )

    elif (
        final_metrics["accuracy"] >= 0.90
    ):

        print(
            "🟡 90%+ ACCURACY ACHIEVED"
        )

        print(
            "⚠️ F1 IS BELOW 90%"
        )

    else:

        print(
            "⚠️ 90% TARGET NOT YET ACHIEVED"
        )

    # =========================================================================
    # DATASET
    # =========================================================================

    print()
    print("DATASET")

    print(
        f"Normal            : "
        f"{class_counts[0]}"
    )

    print(
        f"Defective         : "
        f"{class_counts[1]}"
    )

    print(
        f"Total             : "
        f"{len(samples)}"
    )

    print(
        f"test/good skipped : "
        f"{skipped_good}"
    )

    # =========================================================================
    # MODEL
    # =========================================================================

    print()
    print("MODEL")

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

    print(
        f"Parameters        : "
        f"{parameter_count:,}"
    )

    # =========================================================================
    # SAVED
    # =========================================================================

    print()
    print("SAVED MODEL")

    print(
        MODEL_PATH
    )

    print()
    print("=" * 90)
    print("CABLE V3.1 TRAINING COMPLETE")
    print("=" * 90)


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":

    main()