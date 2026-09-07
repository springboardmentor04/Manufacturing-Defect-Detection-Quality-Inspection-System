"""
===============================================================================
VISIONINSPECT AI
CABLE BINARY DEFECT DETECTOR V3
===============================================================================

Purpose:
    Improve Cable V2 while remaining completely FROM SCRATCH.

Classification:
    0 = NORMAL / GOOD
    1 = DEFECTIVE

Dataset:
    MVTec AD - cable

IMPORTANT:
    train/good              -> NORMAL
    test/good               -> EXCLUDED
    test/<defect_type>      -> DEFECTIVE

MODEL RESTRICTIONS:
    NO pretrained model
    NO ImageNet
    NO ResNet
    NO transfer learning

V3 improvements:
    - 320x320 input resolution
    - controlled augmentation
    - balanced sampler
    - AdamW optimizer
    - cosine learning-rate schedule
    - label smoothing
    - dropout
    - weight decay
    - gradient clipping
    - early stopping
    - best F1 checkpoint
    - detailed validation metrics

Run:
    python -m app.ai.train_cable_binary_v3
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


# =============================================================================
# CONFIGURATION
# =============================================================================

SEED = 42

CATEGORY = "cable"

IMAGE_SIZE = 320

BATCH_SIZE = 6

EPOCHS = 30

LEARNING_RATE = 0.00025

WEIGHT_DECAY = 0.0005

VAL_RATIO = 0.20

PATIENCE = 7

NUM_WORKERS = 0

GRADIENT_CLIP = 1.0

LABEL_SMOOTHING = 0.05


# =============================================================================
# DEVICE
# =============================================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# =============================================================================
# PATHS
# =============================================================================

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

CABLE_ROOT = os.path.join(
    DATASET_ROOT,
    CATEGORY
)

MODEL_DIR = os.path.join(
    AI_DIR,
    "saved_models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "cable_binary_v3.pth"
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

    transforms.RandomVerticalFlip(
        p=0.15
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


# =============================================================================
# DATA COLLECTION
# =============================================================================

def collect_dataset():

    train_good_dir = os.path.join(
        CABLE_ROOT,
        "train",
        "good"
    )

    test_dir = os.path.join(
        CABLE_ROOT,
        "test"
    )

    if not os.path.isdir(
        train_good_dir
    ):

        raise FileNotFoundError(
            f"Normal directory not found:\n"
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

    defect_counts = Counter()

    normal_count = 0

    defective_count = 0

    skipped_good = 0

    # =========================================================================
    # NORMAL DATA
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
            and
            extension in IMAGE_EXTENSIONS
        ):

            samples.append(
                (
                    path,
                    0
                )
            )

            normal_count += 1

    # =========================================================================
    # DEFECTIVE DATA
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

        # ---------------------------------------------------------------------
        # CRITICAL:
        # test/good is NORMAL and must NOT be included in defective class.
        # We exclude it completely because normal training data already comes
        # from train/good.
        # ---------------------------------------------------------------------

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

        count = 0

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
                and
                extension in IMAGE_EXTENSIONS
            ):

                samples.append(
                    (
                        path,
                        1
                    )
                )

                defective_count += 1

                count += 1

        defect_counts[
            defect_name
        ] = count

    # =========================================================================
    # REPORT
    # =========================================================================

    print()
    print(
        "=" * 90
    )

    print(
        "DATASET VERIFICATION"
    )

    print(
        "=" * 90
    )

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

    print(
        "DEFECT DISTRIBUTION"
    )

    for defect_name, count in sorted(
        defect_counts.items()
    ):

        print(
            f"  {defect_name:<30}"
            f"{count:>6}"
        )

    print(
        "=" * 90
    )

    # =========================================================================
    # EXPECTED CABLE DATASET CHECK
    # =========================================================================

    if normal_count != 224:

        print(
            f"⚠️ WARNING: Expected 224 normal images, "
            f"found {normal_count}"
        )

    if defective_count != 92:

        print(
            f"⚠️ WARNING: Expected 92 defective images, "
            f"found {defective_count}"
        )

    if normal_count == 224 and defective_count == 92:

        print(
            "✓ CABLE DATASET COUNT VERIFIED"
        )

    return samples, defect_counts, skipped_good


# =============================================================================
# STRATIFIED SPLIT
# =============================================================================

def stratified_split(
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

    # -------------------------------------------------------------------------
    # Deterministic split
    # -------------------------------------------------------------------------

    random.seed(SEED)

    random.shuffle(normal)

    random.shuffle(defective)

    normal_val_count = max(
        1,
        int(
            len(normal)
            *
            VAL_RATIO
        )
    )

    defective_val_count = max(
        1,
        int(
            len(defective)
            *
            VAL_RATIO
        )
    )

    validation = (
        normal[:normal_val_count]
        +
        defective[:defective_val_count]
    )

    training = (
        normal[normal_val_count:]
        +
        defective[defective_val_count:]
    )

    random.shuffle(training)

    random.shuffle(validation)

    return training, validation


# =============================================================================
# DATASET CLASS
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

        try:

            image = Image.open(
                path
            ).convert(
                "RGB"
            )

        except Exception as error:

            raise RuntimeError(
                f"Could not read image:\n"
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


# =============================================================================
# CUSTOM CNN V3
# =============================================================================

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

        layers = [

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
        ]

        if dropout > 0:

            layers.append(
                nn.Dropout2d(
                    dropout
                )
            )

        self.block = nn.Sequential(
            *layers
        )

    def forward(
        self,
        x
    ):

        return self.block(
            x
        )


class CableCNNV3(
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
                0.02
            ),

            ConvBlock(
                32,
                64,
                0.04
            ),

            ConvBlock(
                64,
                96,
                0.06
            ),

            ConvBlock(
                96,
                128,
                0.08
            ),

            ConvBlock(
                128,
                160,
                0.10
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
                96
            ),

            nn.BatchNorm1d(
                96
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                0.40
            ),

            nn.Linear(
                96,
                32
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                0.25
            ),

            nn.Linear(
                32,
                2
            )
        )

        self.initialize_weights()

    # =========================================================================
    # WEIGHT INITIALIZATION
    # =========================================================================

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

            elif isinstance(
                module,
                nn.BatchNorm1d
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

        x = self.features(
            x
        )

        x = self.pool(
            x
        )

        x = self.classifier(
            x
        )

        return x


# =============================================================================
# METRICS
# =============================================================================

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


# =============================================================================
# TRAIN ONE EPOCH
# =============================================================================

def train_epoch(
    model,
    loader,
    criterion,
    optimizer
):

    model.train()

    running_loss = 0.0

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

        running_loss += (
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

    metrics = calculate_metrics(
        labels,
        predictions
    )

    metrics["loss"] = (
        running_loss
        /
        len(labels)
    )

    return metrics


# =============================================================================
# VALIDATION
# =============================================================================

@torch.no_grad()
def evaluate(
    model,
    loader,
    criterion
):

    model.eval()

    running_loss = 0.0

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

        running_loss += (
            loss.item()
            *
            images.size(0)
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

        labels.extend(
            targets.cpu().tolist()
        )

        predictions.extend(
            predicted.cpu().tolist()
        )

        probabilities.extend(
            probs[:, 1]
            .cpu()
            .tolist()
        )

    metrics = calculate_metrics(
        labels,
        predictions
    )

    metrics["loss"] = (
        running_loss
        /
        len(labels)
    )

    metrics["confusion_matrix"] = (
        confusion_matrix(
            labels,
            predictions,
            labels=[
                0,
                1
            ]
        )
    )

    metrics["labels"] = labels

    metrics["predictions"] = predictions

    metrics["probabilities"] = probabilities

    return metrics


# =============================================================================
# MAIN TRAINING
# =============================================================================

def main():

    set_seed()

    print()
    print(
        "=" * 90
    )

    print(
        "VISIONINSPECT AI"
    )

    print(
        "CABLE BINARY DEFECT DETECTOR V3"
    )

    print(
        "=" * 90
    )

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

    print(
        "=" * 90
    )

    # =========================================================================
    # DATA
    # =========================================================================

    (
        samples,
        defect_counts,
        skipped_good
    ) = collect_dataset()

    counts = Counter(
        label
        for _, label
        in samples
    )

    if counts[0] == 0:

        raise RuntimeError(
            "No normal images found."
        )

    if counts[1] == 0:

        raise RuntimeError(
            "No defective images found."
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
        "STRATIFIED TRAIN / VALIDATION SPLIT"
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
    print(
        "=" * 90
    )

    print(
        "CREATING CUSTOM CNN V3"
    )

    print(
        "=" * 90
    )

    model = CableCNNV3().to(
        DEVICE
    )

    parameter_count = sum(
        parameter.numel()
        for parameter in model.parameters()
    )

    trainable_count = sum(
        parameter.numel()
        for parameter in model.parameters()
        if parameter.requires_grad
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
        label_smoothing=LABEL_SMOOTHING
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
    # COSINE SCHEDULER
    # =========================================================================

    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=EPOCHS,
        eta_min=1e-5
    )

    # =========================================================================
    # BEST CHECKPOINT
    # =========================================================================

    best_f1 = -1.0

    best_accuracy = -1.0

    best_state = None

    best_epoch = 0

    epochs_without_improvement = 0

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

        val_metrics = evaluate(
            model,
            val_loader,
            criterion
        )

        scheduler.step()

        train_accuracy = (
            train_metrics["accuracy"]
        )

        val_accuracy = (
            val_metrics["accuracy"]
        )

        train_precision = (
            train_metrics["precision"]
        )

        val_precision = (
            val_metrics["precision"]
        )

        train_recall = (
            train_metrics["recall"]
        )

        val_recall = (
            val_metrics["recall"]
        )

        train_f1 = (
            train_metrics["f1"]
        )

        val_f1 = (
            val_metrics["f1"]
        )

        accuracy_gap = (
            train_accuracy
            -
            val_accuracy
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
            f"Epoch {epoch:02d}/{EPOCHS}"
        )

        print(
            f"  LR: {current_lr:.7f}"
        )

        print(
            f"  TRAIN "
            f"Loss={train_metrics['loss']:.4f} "
            f"Acc={train_accuracy * 100:.2f}% "
            f"Prec={train_precision * 100:.2f}% "
            f"Recall={train_recall * 100:.2f}% "
            f"F1={train_f1 * 100:.2f}%"
        )

        print(
            f"  VAL   "
            f"Loss={val_metrics['loss']:.4f} "
            f"Acc={val_accuracy * 100:.2f}% "
            f"Prec={val_precision * 100:.2f}% "
            f"Recall={val_recall * 100:.2f}% "
            f"F1={val_f1 * 100:.2f}%"
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
            train_accuracy < 0.75
            and
            val_accuracy < 0.75
        ):

            print(
                "  ⚠️ UNDERFITTING"
            )

        elif (
            train_accuracy >= 0.95
            and
            accuracy_gap > 0.10
        ):

            print(
                "  ⚠️ OVERFITTING"
            )

        elif (
            val_accuracy >= 0.90
            and
            val_f1 >= 0.90
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
        # BEST MODEL
        # =====================================================================

        if (
            val_f1 > best_f1
            or
            (
                val_f1 == best_f1
                and
                val_accuracy > best_accuracy
            )
        ):

            best_f1 = val_f1

            best_accuracy = val_accuracy

            best_epoch = epoch

            best_state = {
                key: value.detach()
                .cpu()
                .clone()
                for key, value
                in model.state_dict()
                .items()
            }

            epochs_without_improvement = 0

            print(
                "  🎯 BEST MODEL UPDATED"
            )

        else:

            epochs_without_improvement += 1

            print(
                f"  No improvement: "
                f"{epochs_without_improvement}/"
                f"{PATIENCE}"
            )

        # =====================================================================
        # EARLY STOPPING
        # =====================================================================

        if (
            epochs_without_improvement
            >=
            PATIENCE
        ):

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
            "Training did not produce a valid checkpoint."
        )

    model.load_state_dict(
        best_state
    )

    # =========================================================================
    # FINAL VALIDATION
    # =========================================================================

    final_metrics = evaluate(
        model,
        val_loader,
        criterion
    )

    # =========================================================================
    # SAVE MODEL
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
            "CableCNNV3",

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
            counts[0],

        "dataset_defective":
            counts[1],

        "test_good_excluded":
            True,

        "test_good_skipped":
            skipped_good,

        "defect_types":
            dict(
                defect_counts
            ),

        "input_size":
            IMAGE_SIZE,

        "batch_size":
            BATCH_SIZE,

        "learning_rate":
            LEARNING_RATE,

        "weight_decay":
            WEIGHT_DECAY,

        "label_smoothing":
            LABEL_SMOOTHING,

        "training_method":
            "weighted_random_sampler",

        "seed":
            SEED,
    }

    torch.save(
        checkpoint,
        MODEL_PATH
    )

    # =========================================================================
    # FINAL REPORT
    # =========================================================================

    print()
    print(
        "=" * 90
    )

    print(
        "FINAL CABLE V3 MODEL"
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

    # =========================================================================
    # ERROR COUNTS
    # =========================================================================

    false_positives = cm[0][1]

    false_negatives = cm[1][0]

    print()
    print(
        "ERRORS"
    )

    print(
        f"False Positives : "
        f"{false_positives}"
    )

    print(
        f"False Negatives : "
        f"{false_negatives}"
    )

    # =========================================================================
    # DATASET
    # =========================================================================

    print()
    print(
        "DATASET"
    )

    print(
        f"Normal            : "
        f"{counts[0]}"
    )

    print(
        f"Defective         : "
        f"{counts[1]}"
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
    # MODEL INFORMATION
    # =========================================================================

    print()
    print(
        "MODEL"
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

    print(
        f"Parameters        : "
        f"{parameter_count:,}"
    )

    # =========================================================================
    # TARGET
    # =========================================================================

    print()
    print(
        "TARGET CHECK"
    )

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
    # SAVED
    # =========================================================================

    print()
    print(
        "SAVED MODEL"
    )

    print(
        MODEL_PATH
    )

    print()
    print(
        "=" * 90
    )

    print(
        "CABLE V3 TRAINING COMPLETE"
    )

    print(
        "=" * 90
    )


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":

    main()