"""
============================================================
VISIONINSPECT AI
BOTTLE BINARY DEFECT DETECTOR
CORRECTED VALIDATION VERSION
============================================================

Classes:
    0 = GOOD
    1 = DEFECTIVE

DATA:
    bottle/train/good
    bottle/test/<defect>

IMPORTANT:
    bottle/test/good is NORMAL and MUST NOT be included
    in the defective class.

NO PRETRAINED MODEL
NO IMAGENET
NO RESNET
NO TRANSFER LEARNING

Purpose:
    Validate the category-specific binary approach.
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

from torch.utils.data import Dataset, DataLoader

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

IMAGE_SIZE = 192

BATCH_SIZE = 16

EPOCHS = 12

LEARNING_RATE = 0.001

WEIGHT_DECAY = 1e-4

VAL_RATIO = 0.20

PATIENCE = 4

NUM_WORKERS = 0


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
    "bottle_binary_fast.pth"
)


# ============================================================
# REPRODUCIBILITY
# ============================================================

random.seed(SEED)

np.random.seed(SEED)

torch.manual_seed(SEED)

if torch.cuda.is_available():

    torch.cuda.manual_seed_all(SEED)


# ============================================================
# IMAGE EXTENSIONS
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
        5
    ),

    transforms.ColorJitter(
        brightness=0.08,
        contrast=0.08
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


# ============================================================
# DATASET VALIDATION
# ============================================================

EXPECTED_NORMAL = 209

EXPECTED_DEFECTIVE = 63

EXPECTED_TOTAL = (
    EXPECTED_NORMAL
    +
    EXPECTED_DEFECTIVE
)


# ============================================================
# COLLECT BOTTLE DATA
# ============================================================

def collect_samples():

    samples = []

    # --------------------------------------------------------
    # CHECK ROOT DIRECTORIES
    # --------------------------------------------------------

    train_dir = os.path.join(
        BOTTLE_ROOT,
        "train"
    )

    good_dir = os.path.join(
        train_dir,
        "good"
    )

    test_dir = os.path.join(
        BOTTLE_ROOT,
        "test"
    )

    if not os.path.isdir(
        good_dir
    ):

        raise FileNotFoundError(
            f"Normal directory not found:\n"
            f"{good_dir}"
        )

    if not os.path.isdir(
        test_dir
    ):

        raise FileNotFoundError(
            f"Test directory not found:\n"
            f"{test_dir}"
        )

    # --------------------------------------------------------
    # NORMAL
    # --------------------------------------------------------

    print()
    print(
        "COLLECTING NORMAL IMAGES"
    )

    normal_files = []

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
            in EXTENSIONS
        ):

            normal_files.append(
                path
            )

            samples.append(
                (
                    path,
                    0
                )
            )

    print(
        f"Normal images found: "
        f"{len(normal_files)}"
    )

    # --------------------------------------------------------
    # DEFECTIVE
    # --------------------------------------------------------

    print()
    print(
        "COLLECTING DEFECTIVE IMAGES"
    )

    defective_files = []

    defect_counts = Counter()

    test_entries = sorted(
        os.listdir(test_dir)
    )

    for defect_name in test_entries:

        # ====================================================
        # CRITICAL FIX
        # ====================================================
        #
        # MVTec may contain:
        #
        #     test/good
        #
        # Those are NORMAL images.
        #
        # They must NEVER be assigned label 1.
        # ====================================================

        if defect_name.lower() == "good":

            print(
                "  SKIPPING test/good "
                "(NORMAL)"
            )

            continue

        defect_dir = os.path.join(
            test_dir,
            defect_name
        )

        if not os.path.isdir(
            defect_dir
        ):

            continue

        current_count = 0

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

                defective_files.append(
                    path
                )

                samples.append(
                    (
                        path,
                        1
                    )
                )

                current_count += 1

        defect_counts[
            defect_name
        ] = current_count

    print()

    print(
        "DEFECT DISTRIBUTION"
    )

    for (
        defect_name,
        count
    ) in sorted(
        defect_counts.items()
    ):

        print(
            f"  {defect_name:<20}"
            f"{count:>6}"
        )

    print()

    print(
        f"Defective images found: "
        f"{len(defective_files)}"
    )

    # --------------------------------------------------------
    # FINAL COUNT
    # --------------------------------------------------------

    normal_count = len(
        normal_files
    )

    defective_count = len(
        defective_files
    )

    total_count = (
        normal_count
        +
        defective_count
    )

    print()
    print(
        "=" * 80
    )

    print(
        "DATASET COUNT VERIFICATION"
    )

    print(
        "=" * 80
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
        f"{total_count}"
    )

    print()

    # --------------------------------------------------------
    # STRICT SAFETY CHECK
    # --------------------------------------------------------

    if (
        normal_count != EXPECTED_NORMAL
        or
        defective_count != EXPECTED_DEFECTIVE
        or
        total_count != EXPECTED_TOTAL
    ):

        print(
            "❌ DATASET COUNT MISMATCH"
        )

        print()

        print(
            "Expected:"
        )

        print(
            f"  Normal    : "
            f"{EXPECTED_NORMAL}"
        )

        print(
            f"  Defective : "
            f"{EXPECTED_DEFECTIVE}"
        )

        print(
            f"  Total     : "
            f"{EXPECTED_TOTAL}"
        )

        print()

        print(
            "Found:"
        )

        print(
            f"  Normal    : "
            f"{normal_count}"
        )

        print(
            f"  Defective : "
            f"{defective_count}"
        )

        print(
            f"  Total     : "
            f"{total_count}"
        )

        print()

        raise RuntimeError(
            "Training stopped because the "
            "Bottle dataset does not match "
            "the audited dataset."
        )

    print(
        "✓ DATASET VERIFIED"
    )

    print(
        "✓ 209 normal images"
    )

    print(
        "✓ 63 defective images"
    )

    print(
        "✓ 272 total images"
    )

    print(
        "✓ test/good excluded from defective class"
    )

    print(
        "=" * 80
    )

    return samples


# ============================================================
# STRATIFIED SPLIT
# ============================================================

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

    defect_val = max(
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
                f"Could not read image:\n"
                f"{path}\n"
                f"Error: {error}"
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

class Block(
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
                3,
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
                3,
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
            ),

            nn.Dropout2d(
                0.05
            )
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

class BottleCNN(
    nn.Module
):

    def __init__(
        self
    ):

        super().__init__()

        self.features = nn.Sequential(

            Block(
                3,
                32
            ),

            Block(
                32,
                64
            ),

            Block(
                64,
                96
            ),

            Block(
                96,
                128
            )
        )

        self.pool = (
            nn.AdaptiveAvgPool2d(
                (1, 1)
            )
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
                0.25
            ),

            nn.Linear(
                64,
                2
            )
        )

        self.initialize()

    def initialize(
        self
    ):

        for module in self.modules():

            if isinstance(
                module,
                nn.Conv2d
            ):

                nn.init.kaiming_normal_(
                    module.weight,
                    nonlinearity="relu"
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


# ============================================================
# TRAIN
# ============================================================

def train_epoch(
    model,
    loader,
    criterion,
    optimizer
):

    model.train()

    total_loss = 0

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
            targets.cpu().tolist()
        )

        predictions.extend(
            predicted.cpu().tolist()
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


# ============================================================
# EVALUATE
# ============================================================

@torch.no_grad()
def evaluate(
    model,
    loader,
    criterion
):

    model.eval()

    total_loss = 0

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
            *
            images.size(0)
        )

        predicted = outputs.argmax(
            dim=1
        )

        labels.extend(
            targets.cpu().tolist()
        )

        predictions.extend(
            predicted.cpu().tolist()
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
            labels=[0, 1]
        ).tolist()
    )

    return result


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print(
        "=" * 80
    )

    print(
        "VISIONINSPECT AI"
    )

    print(
        "CORRECTED BOTTLE BINARY TRAINING"
    )

    print(
        "=" * 80
    )

    print()

    print(
        f"Device       : "
        f"{DEVICE}"
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
        f"Epochs       : "
        f"{EPOCHS}"
    )

    # --------------------------------------------------------
    # DATA
    # --------------------------------------------------------

    samples = collect_samples()

    counts = Counter(
        label
        for _, label in samples
    )

    # --------------------------------------------------------
    # SPLIT
    # --------------------------------------------------------

    (
        train_samples,
        val_samples
    ) = split_samples(
        samples
    )

    print()
    print(
        "=" * 80
    )

    print(
        "TRAIN / VALIDATION SPLIT"
    )

    print(
        "=" * 80
    )

    print(
        f"Training     : "
        f"{len(train_samples)}"
    )

    print(
        f"Validation   : "
        f"{len(val_samples)}"
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
        "TRAIN:"
    )

    print(
        f"  Normal    : "
        f"{train_counts[0]}"
    )

    print(
        f"  Defective : "
        f"{train_counts[1]}"
    )

    print()
    print(
        "VALIDATION:"
    )

    print(
        f"  Normal    : "
        f"{val_counts[0]}"
    )

    print(
        f"  Defective : "
        f"{val_counts[1]}"
    )

    # --------------------------------------------------------
    # DATASETS
    # --------------------------------------------------------

    train_dataset = BottleDataset(
        train_samples,
        TRAIN_TRANSFORM
    )

    val_dataset = BottleDataset(
        val_samples,
        VAL_TRANSFORM
    )

    # --------------------------------------------------------
    # BALANCED WEIGHTS
    # --------------------------------------------------------

    normal_count = train_counts[0]

    defective_count = train_counts[1]

    total = (
        normal_count
        +
        defective_count
    )

    weight_normal = (
        total
        /
        (
            2
            *
            normal_count
        )
    )

    weight_defective = (
        total
        /
        (
            2
            *
            defective_count
        )
    )

    class_weights = torch.tensor(
        [
            weight_normal,
            weight_defective
        ],
        dtype=torch.float32,
        device=DEVICE
    )

    print()
    print(
        "CLASS WEIGHTS"
    )

    print(
        f"  Normal    : "
        f"{weight_normal:.4f}"
    )

    print(
        f"  Defective : "
        f"{weight_defective:.4f}"
    )

    # --------------------------------------------------------
    # LOADERS
    # --------------------------------------------------------

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=NUM_WORKERS
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS
    )

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    print()
    print(
        "=" * 80
    )

    print(
        "CREATING CUSTOM CNN"
    )

    print(
        "=" * 80
    )

    model = BottleCNN().to(
        DEVICE
    )

    parameters = sum(
        p.numel()
        for p in model.parameters()
    )

    print(
        f"Model parameters: "
        f"{parameters:,}"
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

    # --------------------------------------------------------
    # LOSS
    # --------------------------------------------------------

    criterion = nn.CrossEntropyLoss(
        weight=class_weights
    )

    # --------------------------------------------------------
    # OPTIMIZER
    # --------------------------------------------------------

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
            patience=2
        )
    )

    # --------------------------------------------------------
    # BEST MODEL
    # --------------------------------------------------------

    best_f1 = -1

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

        current_lr = (
            optimizer.param_groups[0]["lr"]
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
            f"F1={train_f1 * 100:.2f}%"
        )

        print(
            f"  VAL   "
            f"Loss={val['loss']:.4f} "
            f"Acc={val_acc * 100:.2f}% "
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
        # SAVE BEST
        # ----------------------------------------------------

        if val_f1 > best_f1:

            best_f1 = val_f1

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
        # EARLY STOP
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

    if best_state is not None:

        model.load_state_dict(
            best_state
        )

    # ========================================================
    # FINAL EVALUATION
    # ========================================================

    final = evaluate(
        model,
        val_loader,
        criterion
    )

    # ========================================================
    # SAVE
    # ========================================================

    torch.save(
        {
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
                "BottleCNN",

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
                EXPECTED_TOTAL,

            "dataset_normal":
                EXPECTED_NORMAL,

            "dataset_defective":
                EXPECTED_DEFECTIVE,

            "defective_source":
                "bottle/test/<defect>",

            "test_good_excluded":
                True,
        },
        MODEL_PATH
    )

    # ========================================================
    # FINAL REPORT
    # ========================================================

    print()
    print(
        "=" * 80
    )

    print(
        "FINAL BOTTLE MODEL"
    )

    print(
        "=" * 80
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
        "Confusion Matrix:"
    )

    print(
        np.array(
            final[
                "confusion_matrix"
            ]
        )
    )

    print()

    print(
        "Dataset used:"
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
        "Saved model:"
    )

    print(
        MODEL_PATH
    )

    print()
    print(
        "=" * 80
    )

    print(
        "BOTTLE TRAINING COMPLETE"
    )

    print(
        "=" * 80
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()