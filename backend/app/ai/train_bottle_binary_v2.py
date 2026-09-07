"""
============================================================
VISIONINSPECT AI
BOTTLE BINARY DEFECT DETECTOR V2
============================================================

0 = GOOD
1 = DEFECTIVE

DATA:
    bottle/train/good
    bottle/test/<defect>

IMPORTANT:
    bottle/test/good is excluded.

NO PRETRAINED MODEL
NO IMAGENET
NO RESNET
NO TRANSFER LEARNING

V2 CHANGES:
    - 256x256 input
    - Lower learning rate
    - Balanced batch sampling
    - NO class-weighted loss
    - Moderate augmentation
    - Gradient clipping
    - Early stopping
    - Best validation F1 checkpoint

============================================================
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


# ============================================================
# CONFIG
# ============================================================

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

BOTTLE_ROOT = os.path.join(
    DATASET_ROOT,
    "bottle"
)

MODEL_DIR = os.path.join(
    AI_DIR,
    "saved_models"
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "bottle_binary_v2.pth"
)


# ============================================================
# SEED
# ============================================================

random.seed(SEED)

np.random.seed(SEED)

torch.manual_seed(SEED)

if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)


# ============================================================
# EXTENSIONS
# ============================================================

EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}


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


# ============================================================
# DATA COLLECTION
# ============================================================

def collect_samples():

    samples = []

    train_good = os.path.join(
        BOTTLE_ROOT,
        "train",
        "good"
    )

    test_root = os.path.join(
        BOTTLE_ROOT,
        "test"
    )

    if not os.path.isdir(
        train_good
    ):
        raise FileNotFoundError(
            f"Missing directory:\n{train_good}"
        )

    if not os.path.isdir(
        test_root
    ):
        raise FileNotFoundError(
            f"Missing directory:\n{test_root}"
        )

    # --------------------------------------------------------
    # NORMAL
    # --------------------------------------------------------

    for filename in sorted(
        os.listdir(train_good)
    ):

        path = os.path.join(
            train_good,
            filename
        )

        if (
            os.path.isfile(path)
            and
            os.path.splitext(
                filename
            )[1].lower()
            in EXTENSIONS
        ):

            samples.append(
                (
                    path,
                    0
                )
            )

    # --------------------------------------------------------
    # DEFECTIVE
    # --------------------------------------------------------

    defect_counts = Counter()

    for defect_name in sorted(
        os.listdir(test_root)
    ):

        # ----------------------------------------------------
        # CRITICAL:
        # test/good = NORMAL
        # ----------------------------------------------------

        if defect_name.lower() == "good":
            continue

        defect_dir = os.path.join(
            test_root,
            defect_name
        )

        if not os.path.isdir(
            defect_dir
        ):
            continue

        count = 0

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
                in EXTENSIONS
            ):

                samples.append(
                    (
                        path,
                        1
                    )
                )

                count += 1

        defect_counts[
            defect_name
        ] = count

    return samples, defect_counts


# ============================================================
# STRATIFIED SPLIT
# ============================================================

def split_samples(
    samples
):

    normal = [
        x
        for x in samples
        if x[1] == 0
    ]

    defective = [
        x
        for x in samples
        if x[1] == 1
    ]

    random.shuffle(
        normal
    )

    random.shuffle(
        defective
    )

    normal_val = int(
        len(normal)
        *
        VAL_RATIO
    )

    defect_val = int(
        len(defective)
        *
        VAL_RATIO
    )

    normal_val = max(
        1,
        normal_val
    )

    defect_val = max(
        1,
        defect_val
    )

    val_samples = (
        normal[:normal_val]
        +
        defective[:defect_val]
    )

    train_samples = (
        normal[normal_val:]
        +
        defective[defect_val:]
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


# ============================================================
# DATASET
# ============================================================

class BottleDataset(
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
                f"Could not read:\n"
                f"{path}\n"
                f"{error}"
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


# ============================================================
# CNN BLOCK
# ============================================================

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
            ),
        )

    def forward(
        self,
        x
    ):

        return self.block(
            x
        )


# ============================================================
# CUSTOM CNN
# ============================================================

class BottleCNNV2(
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
            ),
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

        self._initialize_weights()

    def _initialize_weights(
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

        x = self.features(
            x
        )

        x = self.pool(
            x
        )

        return self.classifier(
            x
        )


# ============================================================
# METRICS
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
            ),
    }


# ============================================================
# TRAIN ONE EPOCH
# ============================================================

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
            labels=[0, 1]
        ).tolist()
    )

    result["labels"] = labels

    result["predictions"] = predictions

    result["probabilities"] = probabilities

    return result


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 90)
    print(
        "VISIONINSPECT AI"
    )
    print(
        "BOTTLE BINARY DEFECT DETECTOR V2"
    )
    print("=" * 90)

    print()
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

    # ========================================================
    # COLLECT
    # ========================================================

    samples, defect_counts = (
        collect_samples()
    )

    counts = Counter(
        label
        for _, label in samples
    )

    print()
    print("=" * 90)
    print(
        "DATASET VERIFICATION"
    )
    print("=" * 90)

    print(
        f"Normal       : "
        f"{counts[0]}"
    )

    print(
        f"Defective    : "
        f"{counts[1]}"
    )

    print(
        f"Total        : "
        f"{len(samples)}"
    )

    print()
    print(
        "Defect types:"
    )

    for (
        name,
        count
    ) in sorted(
        defect_counts.items()
    ):

        print(
            f"  {name:<20}"
            f"{count:>5}"
        )

    # --------------------------------------------------------
    # HARD DATASET CHECK
    # --------------------------------------------------------

    if (
        counts[0] != 209
        or
        counts[1] != 63
        or
        len(samples) != 272
    ):

        raise RuntimeError(
            "\nDataset mismatch.\n"
            f"Expected: 209 normal, "
            f"63 defective, 272 total.\n"
            f"Found: {counts[0]} normal, "
            f"{counts[1]} defective, "
            f"{len(samples)} total."
        )

    print()
    print(
        "✓ DATASET VERIFIED"
    )

    # ========================================================
    # SPLIT
    # ========================================================

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
    print("=" * 90)
    print(
        "STRATIFIED TRAIN / VALIDATION SPLIT"
    )
    print("=" * 90)

    print(
        f"Training     : "
        f"{len(train_samples)}"
    )

    print(
        f"Validation   : "
        f"{len(val_samples)}"
    )

    print()

    print(
        "TRAIN"
    )

    print(
        f"  Normal     : "
        f"{train_counts[0]}"
    )

    print(
        f"  Defective  : "
        f"{train_counts[1]}"
    )

    print()

    print(
        "VALIDATION"
    )

    print(
        f"  Normal     : "
        f"{val_counts[0]}"
    )

    print(
        f"  Defective  : "
        f"{val_counts[1]}"
    )

    # ========================================================
    # DATASETS
    # ========================================================

    train_dataset = BottleDataset(
        train_samples,
        TRAIN_TRANSFORM
    )

    val_dataset = BottleDataset(
        val_samples,
        VAL_TRANSFORM
    )

    # ========================================================
    # BALANCED SAMPLER
    # ========================================================

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

    sampler = (
        WeightedRandomSampler(
            weights=sample_weights,
            num_samples=len(
                sample_weights
            ),
            replacement=True
        )
    )

    print()
    print(
        "✓ Balanced sampler enabled"
    )

    print(
        "✓ Class-weighted loss disabled"
    )

    # ========================================================
    # LOADERS
    # ========================================================

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

    # ========================================================
    # MODEL
    # ========================================================

    print()
    print("=" * 90)
    print(
        "CUSTOM CNN V2"
    )
    print("=" * 90)

    model = BottleCNNV2().to(
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
        "Transfer learning : NO"
    )

    # ========================================================
    # LOSS
    # ========================================================

    criterion = nn.CrossEntropyLoss()

    # ========================================================
    # OPTIMIZER
    # ========================================================

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

    # ========================================================
    # BEST STATE
    # ========================================================

    best_f1 = -1.0

    best_accuracy = -1.0

    best_state = None

    best_epoch = 0

    no_improvement = 0

    # ========================================================
    # TRAINING
    # ========================================================

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

        train_f1 = (
            train["f1"]
        )

        val_f1 = (
            val["f1"]
        )

        acc_gap = (
            train_acc
            -
            val_acc
        )

        f1_gap = (
            train_f1
            -
            val_f1
        )

        lr = (
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
            f"{lr:.7f}"
        )

        print(
            f"  TRAIN "
            f"Loss={train['loss']:.4f} "
            f"Acc={train_acc * 100:.2f}% "
            f"Prec={train['precision'] * 100:.2f}% "
            f"Recall={train['recall'] * 100:.2f}% "
            f"F1={train_f1 * 100:.2f}%"
        )

        print(
            f"  VAL   "
            f"Loss={val['loss']:.4f} "
            f"Acc={val_acc * 100:.2f}% "
            f"Prec={val['precision'] * 100:.2f}% "
            f"Recall={val['recall'] * 100:.2f}% "
            f"F1={val_f1 * 100:.2f}%"
        )

        print(
            f"  GAP   "
            f"Acc={acc_gap * 100:.2f}% "
            f"F1={f1_gap * 100:.2f}%"
        )

        # ----------------------------------------------------
        # DIAGNOSIS
        # ----------------------------------------------------

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
            acc_gap > 0.10
        ):

            print(
                "  ⚠️ OVERFITTING"
            )

        elif (
            val_acc >= 0.90
            and
            abs(acc_gap) <= 0.08
        ):

            print(
                "  ✅ HEALTHY 90%+ RESULT"
            )

        else:

            print(
                "  • Learning..."
            )

        # ----------------------------------------------------
        # BEST MODEL
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # EARLY STOPPING
        # ----------------------------------------------------

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

    # ========================================================
    # RESTORE BEST
    # ========================================================

    if best_state is None:

        raise RuntimeError(
            "No valid model checkpoint "
            "was created."
        )

    model.load_state_dict(
        best_state
    )

    # ========================================================
    # FINAL VALIDATION
    # ========================================================

    final = evaluate(
        model,
        val_loader,
        criterion
    )

    # ========================================================
    # SAVE
    # ========================================================

    checkpoint = {

        "model_state_dict":
            model.state_dict(),

        "category":
            "bottle",

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
            "BottleCNNV2",

        "pretrained":
            False,

        "imagenet":
            False,

        "transfer_learning":
            False,

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
            272,

        "dataset_normal":
            209,

        "dataset_defective":
            63,

        "test_good_excluded":
            True,

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
        MODEL_PATH
    )

    # ========================================================
    # FINAL REPORT
    # ========================================================

    print()
    print("=" * 90)
    print(
        "FINAL BOTTLE MODEL"
    )
    print("=" * 90)

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
        "Confusion Matrix:"
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
        f"{cm[0][0]:>7}"
        f"{cm[0][1]:>7}"
    )

    print(
        f"Actual Defect "
        f"{cm[1][0]:>7}"
        f"{cm[1][1]:>7}"
    )

    print()

    print(
        "Dataset:"
    )

    print(
        "  Normal    : 209"
    )

    print(
        "  Defective : 63"
    )

    print(
        "  Total     : 272"
    )

    print()

    print(
        "Model:"
    )

    print(
        "  Pretrained        : NO"
    )

    print(
        "  ImageNet          : NO"
    )

    print(
        "  Transfer learning : NO"
    )

    print(
        "  ResNet            : NO"
    )

    print(
        "  Training          : FROM SCRATCH"
    )

    print()

    print(
        "Saved:"
    )

    print(
        MODEL_PATH
    )

    print()
    print("=" * 90)
    print(
        "BOTTLE V2 TRAINING COMPLETE"
    )
    print("=" * 90)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()