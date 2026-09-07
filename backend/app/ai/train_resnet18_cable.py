from pathlib import Path
import copy
import random

import numpy as np
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler

from torchvision import models, transforms

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
)


# ============================================================
# CONFIGURATION
# ============================================================

CATEGORY = "cable"

IMAGE_SIZE = 224
BATCH_SIZE = 16

HEAD_EPOCHS = 4
FINE_TUNE_EPOCHS = 16

TOTAL_EPOCHS = HEAD_EPOCHS + FINE_TUNE_EPOCHS

VAL_RATIO = 0.20
SEED = 42

HEAD_LR = 1e-3
BACKBONE_LR = 2e-5
CLASSIFIER_LR = 1e-4

WEIGHT_DECAY = 1e-4

PATIENCE = 5
MIN_DELTA = 0.002

NUM_WORKERS = 0

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# PATHS
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

DATASET_DIR = (
    BACKEND_DIR
    / "dataset"
    / "mvtec_ad"
    / CATEGORY
)

TRAIN_DIR = DATASET_DIR / "train"
TEST_DIR = DATASET_DIR / "test"

MODEL_DIR = (
    BACKEND_DIR
    / "app"
    / "ai"
    / "saved_models"
)

MODEL_DIR.mkdir(
    parents=True,
    exist_ok=True
)

MODEL_PATH = (
    MODEL_DIR
    / "cable_resnet18.pth"
)


# ============================================================
# CLASSES
# ============================================================

CLASS_NAMES = [
    "good",
    "bent_wire",
    "cable_swap",
    "combined",
    "cut_inner_insulation",
    "cut_outer_insulation",
    "missing_cable",
    "missing_wire",
    "poke_insulation",
]

CLASS_TO_INDEX = {
    name: i
    for i, name in enumerate(CLASS_NAMES)
}

NUM_CLASSES = len(CLASS_NAMES)

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


set_seed()


# ============================================================
# HEADER
# ============================================================

print()
print("=" * 90)
print("VISIONINSPECT AI")
print("CABLE DEFECT CLASSIFIER")
print("PRETRAINED RESNET18")
print("=" * 90)

print(f"Device              : {DEVICE}")
print(f"Category            : {CATEGORY}")
print(f"Image size          : {IMAGE_SIZE}x{IMAGE_SIZE}")
print(f"Batch size          : {BATCH_SIZE}")
print(f"Total epochs        : {TOTAL_EPOCHS}")

print()
print("MODEL")
print("  Architecture      : ResNet18")
print("  Pretrained        : YES")
print("  ImageNet          : YES")
print("  Transfer learning : YES")
print("  From scratch      : NO")

print()
print("TARGET")
print("  Validation Accuracy >= 90%")
print("  Validation Macro F1 >= 90%")

print("=" * 90)


# ============================================================
# DATASET VALIDATION
# ============================================================

if not TRAIN_DIR.exists():

    raise FileNotFoundError(
        f"Training directory not found:\n{TRAIN_DIR}"
    )

if not TEST_DIR.exists():

    raise FileNotFoundError(
        f"Test directory not found:\n{TEST_DIR}"
    )


# ============================================================
# COLLECT IMAGES
# ============================================================

print()
print("=" * 90)
print("DATASET COLLECTION")
print("=" * 90)

samples = []


# ------------------------------------------------------------
# NORMAL IMAGES
# ------------------------------------------------------------

good_dir = TRAIN_DIR / "good"

if not good_dir.exists():

    raise FileNotFoundError(
        f"Missing good directory:\n{good_dir}"
    )


for image_path in sorted(good_dir.iterdir()):

    if (
        image_path.is_file()
        and image_path.suffix.lower()
        in IMAGE_EXTENSIONS
    ):

        samples.append(
            (
                str(image_path),
                CLASS_TO_INDEX["good"]
            )
        )


print(
    f"{'good':<32}: "
    f"{sum(1 for _, y in samples if y == 0)}"
)


# ------------------------------------------------------------
# DEFECT IMAGES
# ------------------------------------------------------------

for class_name in CLASS_NAMES:

    if class_name == "good":
        continue

    defect_dir = TEST_DIR / class_name

    count = 0

    if defect_dir.exists():

        for image_path in sorted(
            defect_dir.iterdir()
        ):

            if (
                image_path.is_file()
                and image_path.suffix.lower()
                in IMAGE_EXTENSIONS
            ):

                samples.append(
                    (
                        str(image_path),
                        CLASS_TO_INDEX[class_name]
                    )
                )

                count += 1

    print(
        f"{class_name:<32}: {count}"
    )


# ============================================================
# DATASET COUNTS
# ============================================================

labels = np.array(
    [label for _, label in samples],
    dtype=np.int64
)

paths = np.array(
    [path for path, _ in samples]
)

print()
print("=" * 90)
print("DATASET VERIFICATION")
print("=" * 90)

class_counts = {}

for class_name in CLASS_NAMES:

    class_index = CLASS_TO_INDEX[class_name]

    count = int(
        np.sum(labels == class_index)
    )

    class_counts[class_name] = count

    print(
        f"{class_name:<32}: {count}"
    )


print()
print(f"TOTAL{'':<26}: {len(samples)}")


missing = [
    name
    for name in CLASS_NAMES
    if class_counts[name] == 0
]

if missing:

    raise RuntimeError(
        "Missing classes:\n"
        + "\n".join(
            f"  - {x}"
            for x in missing
        )
    )


print()
print("✓ ALL CLASSES PRESENT")


# ============================================================
# STRATIFIED SPLIT
# ============================================================

indices = np.arange(len(samples))

train_indices, val_indices = train_test_split(
    indices,
    test_size=VAL_RATIO,
    random_state=SEED,
    stratify=labels
)

train_paths = paths[train_indices]
train_labels = labels[train_indices]

val_paths = paths[val_indices]
val_labels = labels[val_indices]


print()
print("=" * 90)
print("STRATIFIED TRAIN / VALIDATION SPLIT")
print("=" * 90)

print(
    f"Training images     : {len(train_paths)}"
)

print(
    f"Validation images   : {len(val_paths)}"
)


# ============================================================
# TRANSFORMS
# ============================================================

train_transform = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.RandomHorizontalFlip(
        p=0.5
    ),

    transforms.RandomRotation(
        degrees=7
    ),

    transforms.ColorJitter(
        brightness=0.10,
        contrast=0.10,
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


val_transform = transforms.Compose([

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


# ============================================================
# DATASET CLASS
# ============================================================

class CableDataset(Dataset):

    def __init__(
        self,
        image_paths,
        image_labels,
        transform
    ):

        self.image_paths = list(
            image_paths
        )

        self.image_labels = list(
            image_labels
        )

        self.transform = transform


    def __len__(self):

        return len(
            self.image_paths
        )


    def __getitem__(self, index):

        image_path = (
            self.image_paths[index]
        )

        label = int(
            self.image_labels[index]
        )

        image = Image.open(
            image_path
        ).convert("RGB")

        image = self.transform(
            image
        )

        return image, label


# ============================================================
# DATASETS
# ============================================================

train_dataset = CableDataset(
    train_paths,
    train_labels,
    train_transform
)

val_dataset = CableDataset(
    val_paths,
    val_labels,
    val_transform
)


# ============================================================
# BALANCED SAMPLER
# ============================================================

train_counts = np.bincount(
    train_labels,
    minlength=NUM_CLASSES
)

sample_weights = np.zeros(
    len(train_labels),
    dtype=np.float64
)


for i, label in enumerate(
    train_labels
):

    count = train_counts[label]

    sample_weights[i] = (
        len(train_labels)
        /
        (
            NUM_CLASSES * count
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


# ============================================================
# DATALOADERS
# ============================================================

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    sampler=sampler,
    num_workers=NUM_WORKERS,
    pin_memory=DEVICE.type == "cuda"
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=NUM_WORKERS,
    pin_memory=DEVICE.type == "cuda"
)


# ============================================================
# LOAD PRETRAINED RESNET18
# ============================================================

print()
print("=" * 90)
print("LOADING IMAGENET PRETRAINED RESNET18")
print("=" * 90)


weights = models.ResNet18_Weights.DEFAULT

model = models.resnet18(
    weights=weights
)


# ============================================================
# REPLACE CLASSIFIER
# ============================================================

in_features = model.fc.in_features

model.fc = nn.Sequential(

    nn.Dropout(
        p=0.30
    ),

    nn.Linear(
        in_features,
        NUM_CLASSES
    )
)


model = model.to(
    DEVICE
)


print()
print("✓ ImageNet weights loaded")
print("✓ Original classifier replaced")
print("✓ 9 cable classes configured")


# ============================================================
# LOSS
# ============================================================

criterion = nn.CrossEntropyLoss(
    label_smoothing=0.05
)


# ============================================================
# METRICS
# ============================================================

def calculate_metrics(
    y_true,
    y_pred
):

    accuracy = accuracy_score(
        y_true,
        y_pred
    )

    precision, recall, f1, _ = (
        precision_recall_fscore_support(
            y_true,
            y_pred,
            average="macro",
            zero_division=0
        )
    )

    return (
        accuracy,
        precision,
        recall,
        f1
    )


# ============================================================
# EPOCH FUNCTION
# ============================================================

def run_epoch(
    model,
    loader,
    optimizer=None
):

    training = optimizer is not None

    if training:
        model.train()
    else:
        model.eval()

    total_loss = 0.0

    all_true = []
    all_pred = []

    for images, labels_batch in loader:

        images = images.to(
            DEVICE,
            non_blocking=True
        )

        labels_batch = labels_batch.to(
            DEVICE,
            non_blocking=True
        )


        if training:

            optimizer.zero_grad(
                set_to_none=True
            )


        with torch.set_grad_enabled(
            training
        ):

            outputs = model(
                images
            )

            loss = criterion(
                outputs,
                labels_batch
            )


            if training:

                loss.backward()

                torch.nn.utils.clip_grad_norm_(
                    model.parameters(),
                    max_norm=3.0
                )

                optimizer.step()


        total_loss += (
            loss.item()
            * images.size(0)
        )


        predictions = torch.argmax(
            outputs,
            dim=1
        )


        all_true.extend(
            labels_batch.detach()
            .cpu()
            .numpy()
            .tolist()
        )

        all_pred.extend(
            predictions.detach()
            .cpu()
            .numpy()
            .tolist()
        )


    loss_value = (
        total_loss
        / len(loader.dataset)
    )


    accuracy, precision, recall, f1 = (
        calculate_metrics(
            all_true,
            all_pred
        )
    )


    return (
        loss_value,
        accuracy,
        precision,
        recall,
        f1,
        all_true,
        all_pred
    )


# ============================================================
# BEST CHECKPOINT
# ============================================================

best_state = None

best_score = -float("inf")

best_accuracy = 0.0

best_f1 = 0.0

best_epoch = 0

epochs_without_improvement = 0


# ============================================================
# PHASE 1
# CLASSIFIER ONLY
# ============================================================

print()
print("=" * 90)
print("PHASE 1")
print("CLASSIFIER TRAINING")
print("=" * 90)

print(
    "Backbone: FROZEN"
)

print(
    "Classifier: TRAINABLE"
)


for parameter in model.parameters():

    parameter.requires_grad = False


for parameter in model.fc.parameters():

    parameter.requires_grad = True


optimizer = torch.optim.AdamW(
    model.fc.parameters(),
    lr=HEAD_LR,
    weight_decay=WEIGHT_DECAY
)


for local_epoch in range(
    1,
    HEAD_EPOCHS + 1
):

    epoch = local_epoch


    (
        train_loss,
        train_acc,
        train_prec,
        train_rec,
        train_f1,
        _,
        _
    ) = run_epoch(
        model,
        train_loader,
        optimizer
    )


    (
        val_loss,
        val_acc,
        val_prec,
        val_rec,
        val_f1,
        _,
        _
    ) = run_epoch(
        model,
        val_loader
    )


    print()
    print(
        f"Epoch {epoch:02d}/{TOTAL_EPOCHS}"
    )

    print(
        f"  TRAIN "
        f"Loss={train_loss:.4f} "
        f"Acc={train_acc * 100:.2f}% "
        f"F1={train_f1 * 100:.2f}%"
    )

    print(
        f"  VAL   "
        f"Loss={val_loss:.4f} "
        f"Acc={val_acc * 100:.2f}% "
        f"Prec={val_prec * 100:.2f}% "
        f"Recall={val_rec * 100:.2f}% "
        f"F1={val_f1 * 100:.2f}%"
    )


    # --------------------------------------------------------
    # BEST SCORE
    # --------------------------------------------------------

    score = (
        0.5 * val_acc
        + 0.5 * val_f1
    )


    if score > best_score + MIN_DELTA:

        best_score = score

        best_accuracy = val_acc

        best_f1 = val_f1

        best_state = copy.deepcopy(
            model.state_dict()
        )

        best_epoch = epoch

        epochs_without_improvement = 0

        print(
            "  🎯 BEST MODEL UPDATED"
        )

    else:

        epochs_without_improvement += 1


# ============================================================
# PHASE 2
# CONTROLLED FINE-TUNING
# ============================================================

print()
print("=" * 90)
print("PHASE 2")
print("CONTROLLED RESNET18 FINE-TUNING")
print("=" * 90)

print(
    "Unfreezing: layer3 + layer4 + classifier"
)


# Freeze everything.
for parameter in model.parameters():

    parameter.requires_grad = False


# Unfreeze layer3.
for parameter in model.layer3.parameters():

    parameter.requires_grad = True


# Unfreeze layer4.
for parameter in model.layer4.parameters():

    parameter.requires_grad = True


# Classifier.
for parameter in model.fc.parameters():

    parameter.requires_grad = True


trainable_params = sum(
    p.numel()
    for p in model.parameters()
    if p.requires_grad
)


print(
    f"Trainable parameters: "
    f"{trainable_params:,}"
)


optimizer = torch.optim.AdamW(
    [
        {
            "params":
                model.layer3.parameters(),
            "lr":
                BACKBONE_LR
        },

        {
            "params":
                model.layer4.parameters(),
            "lr":
                BACKBONE_LR
        },

        {
            "params":
                model.fc.parameters(),
            "lr":
                CLASSIFIER_LR
        }
    ],
    weight_decay=WEIGHT_DECAY
)


scheduler = (
    torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode="max",
        factor=0.5,
        patience=2,
        min_lr=1e-7
    )
)


epochs_without_improvement = 0


for local_epoch in range(
    1,
    FINE_TUNE_EPOCHS + 1
):

    epoch = (
        HEAD_EPOCHS
        + local_epoch
    )


    (
        train_loss,
        train_acc,
        train_prec,
        train_rec,
        train_f1,
        _,
        _
    ) = run_epoch(
        model,
        train_loader,
        optimizer
    )


    (
        val_loss,
        val_acc,
        val_prec,
        val_rec,
        val_f1,
        _,
        _
    ) = run_epoch(
        model,
        val_loader
    )


    scheduler.step(
        val_f1
    )


    # --------------------------------------------------------
    # GAP
    # --------------------------------------------------------

    accuracy_gap = (
        train_acc
        - val_acc
    )

    f1_gap = (
        train_f1
        - val_f1
    )


    print()
    print(
        f"Epoch {epoch:02d}/{TOTAL_EPOCHS}"
    )

    print(
        f"  LR     : "
        f"{optimizer.param_groups[-1]['lr']:.7f}"
    )

    print(
        f"  TRAIN "
        f"Loss={train_loss:.4f} "
        f"Acc={train_acc * 100:.2f}% "
        f"Prec={train_prec * 100:.2f}% "
        f"Recall={train_rec * 100:.2f}% "
        f"F1={train_f1 * 100:.2f}%"
    )

    print(
        f"  VAL   "
        f"Loss={val_loss:.4f} "
        f"Acc={val_acc * 100:.2f}% "
        f"Prec={val_prec * 100:.2f}% "
        f"Recall={val_rec * 100:.2f}% "
        f"F1={val_f1 * 100:.2f}%"
    )

    print(
        f"  GAP    "
        f"Acc={accuracy_gap * 100:.2f}% "
        f"F1={f1_gap * 100:.2f}%"
    )


    # ========================================================
    # TRAINING STATE
    # ========================================================

    if (
        train_acc < 0.80
        and val_acc < 0.80
    ):

        print(
            "  ⚠️ UNDERFITTING"
        )

    elif (
        accuracy_gap > 0.12
        or f1_gap > 0.15
    ):

        print(
            "  ⚠️ OVERFITTING PRESSURE"
        )

    elif (
        val_acc >= 0.90
        and val_f1 >= 0.90
        and accuracy_gap <= 0.10
        and f1_gap <= 0.10
    ):

        print(
            "  ✅ HEALTHY 90%+ RESULT"
        )

    else:

        print(
            "  • LEARNING / GENERALIZING"
        )


    # ========================================================
    # BEST MODEL
    # ========================================================

    score = (
        0.5 * val_acc
        + 0.5 * val_f1
    )


    if score > best_score + MIN_DELTA:

        best_score = score

        best_accuracy = val_acc

        best_f1 = val_f1

        best_state = copy.deepcopy(
            model.state_dict()
        )

        best_epoch = epoch

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


    # ========================================================
    # TARGET ACHIEVED
    # ========================================================

    if (
        val_acc >= 0.90
        and val_f1 >= 0.90
        and accuracy_gap <= 0.10
        and f1_gap <= 0.10
    ):

        print()
        print(
            "  🏆 TARGET ACHIEVED"
        )

        print(
            "  Accuracy >= 90%"
        )

        print(
            "  Macro F1 >= 90%"
        )

        print(
            "  Generalization gap acceptable"
        )

        # We have achieved the target
        # without obvious overfitting.
        break


    # ========================================================
    # EARLY STOPPING
    # ========================================================

    if (
        epochs_without_improvement
        >= PATIENCE
    ):

        print()
        print(
            "  🛑 EARLY STOPPING"
        )

        print(
            "  Best validation checkpoint "
            "will be restored."
        )

        break


# ============================================================
# RESTORE BEST MODEL
# ============================================================

if best_state is None:

    raise RuntimeError(
        "No valid checkpoint was created."
    )


model.load_state_dict(
    best_state
)


# ============================================================
# FINAL VALIDATION
# ============================================================

print()
print("=" * 90)
print("FINAL BEST MODEL VALIDATION")
print("=" * 90)


(
    final_loss,
    final_accuracy,
    final_precision,
    final_recall,
    final_f1,
    final_true,
    final_pred
) = run_epoch(
    model,
    val_loader
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

cm = confusion_matrix(
    final_true,
    final_pred,
    labels=list(
        range(NUM_CLASSES)
    )
)


print()
print(
    f"Best epoch : "
    f"{best_epoch}"
)

print(
    f"Accuracy   : "
    f"{final_accuracy * 100:.2f}%"
)

print(
    f"Precision  : "
    f"{final_precision * 100:.2f}%"
)

print(
    f"Recall     : "
    f"{final_recall * 100:.2f}%"
)

print(
    f"Macro F1   : "
    f"{final_f1 * 100:.2f}%"
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

print()
print("CONFUSION MATRIX")
print(
    "Rows = Actual"
)
print(
    "Columns = Predicted"
)
print()


header = (
    f"{'':<30}"
    + "".join(
        f"{i:>7}"
        for i in range(NUM_CLASSES)
    )
)

print(header)


for i, row in enumerate(cm):

    print(
        f"{CLASS_NAMES[i]:<30}"
        + "".join(
            f"{value:>7}"
            for value in row
        )
    )


# ============================================================
# PER-CLASS REPORT
# ============================================================

print()
print("=" * 90)
print("PER-CLASS PERFORMANCE")
print("=" * 90)

print(
    classification_report(
        final_true,
        final_pred,
        labels=list(
            range(NUM_CLASSES)
        ),
        target_names=CLASS_NAMES,
        digits=4,
        zero_division=0
    )
)


# ============================================================
# TARGET VERIFICATION
# ============================================================

print()
print("=" * 90)
print("FINAL TARGET CHECK")
print("=" * 90)


if (
    final_accuracy >= 0.90
    and final_f1 >= 0.90
):

    print(
        "✅ 90% TARGET ACHIEVED"
    )

    print(
        "✓ Accuracy >= 90%"
    )

    print(
        "✓ Macro F1 >= 90%"
    )

else:

    print(
        "⚠️ 90% TARGET NOT ACHIEVED"
    )

    print(
        "Accuracy and/or Macro F1 "
        "is below 90%."
    )


# ============================================================
# SAVE CHECKPOINT
# ============================================================

checkpoint = {

    "model_state_dict":
        model.state_dict(),

    "architecture":
        "resnet18",

    "backbone":
        "resnet18",

    "pretrained":
        True,

    "imagenet":
        True,

    "transfer_learning":
        True,

    "training_from_scratch":
        False,

    "fine_tuned":
        True,

    "category":
        CATEGORY,

    "class_names":
        CLASS_NAMES,

    "class_to_index":
        CLASS_TO_INDEX,

    "num_classes":
        NUM_CLASSES,

    "image_size":
        IMAGE_SIZE,

    "best_epoch":
        best_epoch,

    "validation_accuracy":
        float(final_accuracy),

    "validation_precision":
        float(final_precision),

    "validation_recall":
        float(final_recall),

    "validation_f1":
        float(final_f1),

    "dataset_total":
        len(samples),

    "dataset_distribution":
        class_counts,

    "confusion_matrix":
        cm.tolist(),

    "training_config":
        {
            "head_epochs":
                HEAD_EPOCHS,

            "fine_tune_epochs":
                FINE_TUNE_EPOCHS,

            "batch_size":
                BATCH_SIZE,

            "head_lr":
                HEAD_LR,

            "backbone_lr":
                BACKBONE_LR,

            "classifier_lr":
                CLASSIFIER_LR,

            "weight_decay":
                WEIGHT_DECAY,

            "seed":
                SEED,

            "patience":
                PATIENCE,

            "min_delta":
                MIN_DELTA
        }
}


torch.save(
    checkpoint,
    MODEL_PATH
)


# ============================================================
# FINAL OUTPUT
# ============================================================

print()
print("=" * 90)
print("CABLE RESNET18 TRAINING COMPLETE")
print("=" * 90)

print()
print(
    f"Architecture : ResNet18"
)

print(
    f"Pretrained   : YES"
)

print(
    f"ImageNet     : YES"
)

print(
    f"Best epoch   : {best_epoch}"
)

print(
    f"Accuracy     : "
    f"{final_accuracy * 100:.2f}%"
)

print(
    f"Precision    : "
    f"{final_precision * 100:.2f}%"
)

print(
    f"Recall       : "
    f"{final_recall * 100:.2f}%"
)

print(
    f"Macro F1     : "
    f"{final_f1 * 100:.2f}%"
)

print()
print(
    f"Saved model  : "
    f"{MODEL_PATH}"
)

print()
print("CLASS MAPPING")

for index, name in enumerate(
    CLASS_NAMES
):

    print(
        f"  {index} -> {name}"
    )

print()
print("=" * 90)