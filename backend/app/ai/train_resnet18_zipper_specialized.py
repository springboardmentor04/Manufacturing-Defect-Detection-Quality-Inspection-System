import os
import random
import copy
import numpy as np

import torch
import torch.nn as nn
import torch.optim as optim

from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import models, transforms
from PIL import Image

from sklearn.model_selection import train_test_split
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
CATEGORY = "zipper"

CLASS_NAMES = [
    "good",
    "broken_teeth",
    "combined",
    "fabric_border",
    "fabric_interior",
    "rough",
    "split_teeth",
    "squeezed_teeth",
]

NUM_CLASSES = len(CLASS_NAMES)
GOOD_INDEX = CLASS_NAMES.index("good")

IMAGE_SIZE = 224
BATCH_SIZE = 16
NUM_WORKERS = 0

BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)

DATASET_DIR = os.path.join(
    BASE_DIR,
    "dataset",
    "mvtec_ad",
    CATEGORY,
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "saved_models",
)

EXISTING_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "zipper_resnet18.pth",
)

SPECIALIZED_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "zipper_resnet18_specialized.pth",
)


# ============================================================
# REPRODUCIBILITY
# ============================================================

def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)

    torch.manual_seed(seed)

    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)

    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


set_seed(SEED)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("=" * 70)
print("SPECIALIZED ZIPPER RESNET18 TRAINING")
print("=" * 70)

print(f"Device       : {DEVICE}")
print(f"Dataset path : {DATASET_DIR}")
print(f"Old model    : {EXISTING_MODEL_PATH}")
print(f"New model    : {SPECIALIZED_MODEL_PATH}")


# ============================================================
# IMAGE EXTENSIONS
# ============================================================

IMAGE_EXTENSIONS = (
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".tif",
    ".tiff",
)


def valid_image(filename):
    return (
        filename.lower().endswith(IMAGE_EXTENSIONS)
        and "_mask" not in filename.lower()
    )


# ============================================================
# COLLECT DATASET
#
# Same structure used by your category training:
#
# train/good
# test/broken_teeth
# test/combined
# ...
#
# We DO NOT include test/good in training.
# ============================================================

def collect_dataset():
    image_paths = []
    labels = []

    train_good_dir = os.path.join(
        DATASET_DIR,
        "train",
        "good",
    )

    if not os.path.exists(train_good_dir):
        raise FileNotFoundError(
            f"Missing directory: {train_good_dir}"
        )

    # --------------------------------------------------------
    # GOOD IMAGES
    # --------------------------------------------------------

    for filename in os.listdir(train_good_dir):

        if valid_image(filename):
            image_paths.append(
                os.path.join(train_good_dir, filename)
            )

            labels.append(GOOD_INDEX)

    # --------------------------------------------------------
    # DEFECT IMAGES
    # --------------------------------------------------------

    test_dir = os.path.join(
        DATASET_DIR,
        "test",
    )

    for class_index, class_name in enumerate(CLASS_NAMES):

        if class_name == "good":
            continue

        class_dir = os.path.join(
            test_dir,
            class_name,
        )

        if not os.path.exists(class_dir):
            print(
                f"WARNING: Directory missing: {class_dir}"
            )
            continue

        for filename in os.listdir(class_dir):

            if valid_image(filename):

                image_paths.append(
                    os.path.join(
                        class_dir,
                        filename,
                    )
                )

                labels.append(class_index)

    return image_paths, labels


# ============================================================
# DATASET CLASS
# ============================================================

class ZipperDataset(Dataset):

    def __init__(
        self,
        image_paths,
        labels,
        transform=None,
    ):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, index):

        image_path = self.image_paths[index]
        label = self.labels[index]

        image = Image.open(
            image_path
        ).convert("RGB")

        if self.transform:
            image = self.transform(image)

        return image, label


# ============================================================
# TRANSFORMS
# ============================================================

train_transform = transforms.Compose(
    [
        transforms.Resize((256, 256)),

        transforms.RandomResizedCrop(
            IMAGE_SIZE,
            scale=(0.82, 1.0),
            ratio=(0.90, 1.10),
        ),

        transforms.RandomHorizontalFlip(
            p=0.5
        ),

        transforms.RandomRotation(
            degrees=8
        ),

        transforms.ColorJitter(
            brightness=0.12,
            contrast=0.12,
            saturation=0.08,
            hue=0.02,
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


val_transform = transforms.Compose(
    [
        transforms.Resize((256, 256)),

        transforms.CenterCrop(
            IMAGE_SIZE
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
# LOAD DATA
# ============================================================

image_paths, labels = collect_dataset()

print("\nDataset class distribution")
print("-" * 70)

for index, class_name in enumerate(CLASS_NAMES):

    count = labels.count(index)

    print(
        f"{class_name:<20} : {count}"
    )

print("-" * 70)
print(f"Total images          : {len(labels)}")


# ============================================================
# TRAIN / VALIDATION SPLIT
# ============================================================

train_paths, val_paths, train_labels, val_labels = train_test_split(
    image_paths,
    labels,
    test_size=0.20,
    random_state=SEED,
    stratify=labels,
)


print("\nSplit")
print("-" * 70)

print(
    f"Training images       : {len(train_paths)}"
)

print(
    f"Validation images     : {len(val_paths)}"
)


train_dataset = ZipperDataset(
    train_paths,
    train_labels,
    transform=train_transform,
)

val_dataset = ZipperDataset(
    val_paths,
    val_labels,
    transform=val_transform,
)


# ============================================================
# SPECIALIZED SAMPLING
#
# We slightly oversample difficult defect classes.
#
# IMPORTANT:
# We are NOT using extreme equal-class balancing because that
# can cause too many GOOD -> DEFECT false positives.
# ============================================================

train_class_counts = np.bincount(
    train_labels,
    minlength=NUM_CLASSES,
).astype(np.float32)


sampling_focus = np.array(
    [
        0.75,   # good
        1.45,   # broken_teeth
        1.15,   # combined
        1.00,   # fabric_border
        1.30,   # fabric_interior
        1.00,   # rough
        1.00,   # split_teeth
        1.40,   # squeezed_teeth
    ],
    dtype=np.float32,
)


mean_count = np.mean(
    train_class_counts
)


class_sampling_weights = (
    np.sqrt(
        mean_count
        /
        np.maximum(
            train_class_counts,
            1,
        )
    )
    *
    sampling_focus
)


sample_weights = np.array(
    [
        class_sampling_weights[label]
        for label in train_labels
    ],
    dtype=np.float32,
)


sampler = WeightedRandomSampler(
    weights=torch.tensor(
        sample_weights,
        dtype=torch.double,
    ),
    num_samples=len(sample_weights),
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


# ============================================================
# MODEL
#
# Must remain EXACTLY compatible with your evaluator:
#
# ResNet18
# fc =
# Sequential(
#     Dropout(0.20),
#     Linear(512, 8)
# )
# ============================================================

def build_model():

    model = models.resnet18(
        weights=None
    )

    model.fc = nn.Sequential(
        nn.Dropout(0.20),

        nn.Linear(
            model.fc.in_features,
            NUM_CLASSES,
        ),
    )

    return model


model = build_model()


# ============================================================
# LOAD EXISTING ZIPPER CHECKPOINT
# ============================================================

if os.path.exists(EXISTING_MODEL_PATH):

    print("\nLoading existing zipper checkpoint...")

    checkpoint = torch.load(
        EXISTING_MODEL_PATH,
        map_location=DEVICE,
        weights_only=False,
    )

    # Handles either raw state_dict or wrapped checkpoint
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:

        model.load_state_dict(
            checkpoint["model_state_dict"]
        )

    else:

        model.load_state_dict(
            checkpoint
        )

    print("Existing model loaded successfully.")

else:

    print("\nWARNING:")
    print(
        "Existing zipper model not found."
    )

    print(
        "Starting from ImageNet weights instead."
    )

    model = models.resnet18(
        weights=models.ResNet18_Weights.DEFAULT
    )

    model.fc = nn.Sequential(
        nn.Dropout(0.20),

        nn.Linear(
            model.fc.in_features,
            NUM_CLASSES,
        ),
    )


model = model.to(DEVICE)


# ============================================================
# SPECIALIZED CLASS WEIGHTS
#
# Focus extra attention on:
#
# broken_teeth
# fabric_interior
# squeezed_teeth
#
# while keeping GOOD important enough to prevent excessive
# false positives.
# ============================================================

CLASS_LOSS_WEIGHTS = torch.tensor(
    [
        1.10,   # good
        1.75,   # broken_teeth
        1.20,   # combined
        1.00,   # fabric_border
        1.40,   # fabric_interior
        1.00,   # rough
        1.00,   # split_teeth
        1.60,   # squeezed_teeth
    ],
    dtype=torch.float32,
).to(DEVICE)


multiclass_criterion = nn.CrossEntropyLoss(
    weight=CLASS_LOSS_WEIGHTS,
    label_smoothing=0.03,
)


binary_criterion = nn.BCELoss()


# ============================================================
# COMBINED MULTICLASS + DEFECT DETECTION LOSS
# ============================================================

def calculate_loss(outputs, labels):

    multiclass_loss = multiclass_criterion(
        outputs,
        labels,
    )

    probabilities = torch.softmax(
        outputs,
        dim=1,
    )

    good_probability = probabilities[
        :,
        GOOD_INDEX
    ]

    defect_probability = (
        1.0 - good_probability
    )

    binary_targets = (
        labels != GOOD_INDEX
    ).float()

    defect_probability = torch.clamp(
        defect_probability,
        min=1e-6,
        max=1.0 - 1e-6,
    )

    binary_loss = binary_criterion(
        defect_probability,
        binary_targets,
    )

    total_loss = (
        multiclass_loss
        +
        0.20 * binary_loss
    )

    return (
        total_loss,
        multiclass_loss,
        binary_loss,
    )


# ============================================================
# METRICS
# ============================================================

def calculate_metrics(
    y_true,
    y_pred,
):

    accuracy = accuracy_score(
        y_true,
        y_pred,
    )

    precision = precision_score(
        y_true,
        y_pred,
        average="macro",
        zero_division=0,
    )

    recall = recall_score(
        y_true,
        y_pred,
        average="macro",
        zero_division=0,
    )

    f1 = f1_score(
        y_true,
        y_pred,
        average="macro",
        zero_division=0,
    )

    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
    }


# ============================================================
# VALIDATION
# ============================================================

def validate(model):

    model.eval()

    total_loss = 0.0

    all_labels = []
    all_predictions = []

    with torch.no_grad():

        for images, labels_batch in val_loader:

            images = images.to(DEVICE)

            labels_batch = labels_batch.to(
                DEVICE
            )

            outputs = model(images)

            loss, _, _ = calculate_loss(
                outputs,
                labels_batch,
            )

            total_loss += (
                loss.item()
                *
                images.size(0)
            )

            predictions = torch.argmax(
                outputs,
                dim=1,
            )

            all_labels.extend(
                labels_batch
                .cpu()
                .numpy()
                .tolist()
            )

            all_predictions.extend(
                predictions
                .cpu()
                .numpy()
                .tolist()
            )

    metrics = calculate_metrics(
        all_labels,
        all_predictions,
    )

    average_loss = (
        total_loss
        /
        len(val_dataset)
    )

    return (
        average_loss,
        metrics,
        all_labels,
        all_predictions,
    )


# ============================================================
# TRAIN ONE EPOCH
# ============================================================

def train_one_epoch(
    model,
    optimizer,
):

    model.train()

    total_loss = 0.0

    all_labels = []
    all_predictions = []

    for images, labels_batch in train_loader:

        images = images.to(DEVICE)

        labels_batch = labels_batch.to(
            DEVICE
        )

        optimizer.zero_grad()

        outputs = model(images)

        loss, _, _ = calculate_loss(
            outputs,
            labels_batch,
        )

        loss.backward()

        torch.nn.utils.clip_grad_norm_(
            model.parameters(),
            max_norm=5.0,
        )

        optimizer.step()

        total_loss += (
            loss.item()
            *
            images.size(0)
        )

        predictions = torch.argmax(
            outputs,
            dim=1,
        )

        all_labels.extend(
            labels_batch
            .detach()
            .cpu()
            .numpy()
            .tolist()
        )

        all_predictions.extend(
            predictions
            .detach()
            .cpu()
            .numpy()
            .tolist()
        )

    metrics = calculate_metrics(
        all_labels,
        all_predictions,
    )

    average_loss = (
        total_loss
        /
        len(train_dataset)
    )

    return (
        average_loss,
        metrics,
    )


# ============================================================
# FREEZE HELPERS
# ============================================================

def freeze_all(model):

    for parameter in model.parameters():
        parameter.requires_grad = False


def unfreeze_fc(model):

    for parameter in model.fc.parameters():
        parameter.requires_grad = True


def unfreeze_layer4(model):

    for parameter in model.layer4.parameters():
        parameter.requires_grad = True


def unfreeze_layer3(model):

    for parameter in model.layer3.parameters():
        parameter.requires_grad = True


# ============================================================
# BASELINE VALIDATION BEFORE SPECIALIZED TRAINING
# ============================================================

print("\n" + "=" * 70)
print("BASELINE VALIDATION")
print("=" * 70)

baseline_loss, baseline_metrics, baseline_true, baseline_pred = validate(
    model
)

print(
    f"Validation Loss      : {baseline_loss:.4f}"
)

print(
    f"Validation Accuracy  : {baseline_metrics['accuracy'] * 100:.2f}%"
)

print(
    f"Macro Precision      : {baseline_metrics['precision'] * 100:.2f}%"
)

print(
    f"Macro Recall         : {baseline_metrics['recall'] * 100:.2f}%"
)

print(
    f"Macro F1             : {baseline_metrics['f1'] * 100:.2f}%"
)


best_f1 = baseline_metrics["f1"]

best_accuracy = baseline_metrics["accuracy"]

best_state = copy.deepcopy(
    model.state_dict()
)

best_stage = "baseline"

best_epoch = 0


# ============================================================
# SAVE BEST MODEL
# ============================================================

def update_best(
    stage_name,
    epoch,
    metrics,
):

    global best_f1
    global best_accuracy
    global best_state
    global best_stage
    global best_epoch

    current_f1 = metrics["f1"]

    current_accuracy = metrics["accuracy"]

    improved = False

    if current_f1 > best_f1 + 1e-5:

        improved = True

    elif (
        abs(current_f1 - best_f1)
        <= 1e-5
        and
        current_accuracy > best_accuracy
    ):

        improved = True

    if improved:

        best_f1 = current_f1

        best_accuracy = current_accuracy

        best_state = copy.deepcopy(
            model.state_dict()
        )

        best_stage = stage_name

        best_epoch = epoch

        print(
            "  >>> NEW BEST MODEL SAVED IN MEMORY"
        )

        return True

    return False


# ============================================================
# TRAINING STAGE FUNCTION
# ============================================================

def run_training_stage(
    stage_name,
    epochs,
    optimizer,
    scheduler=None,
    patience=6,
):

    print("\n" + "=" * 70)
    print(stage_name)
    print("=" * 70)

    no_improvement = 0

    for epoch in range(
        1,
        epochs + 1,
    ):

        train_loss, train_metrics = train_one_epoch(
            model,
            optimizer,
        )

        val_loss, val_metrics, _, _ = validate(
            model
        )

        print(
            f"\nEpoch {epoch:02d}/{epochs}"
        )

        print(
            f"Train Loss           : {train_loss:.4f}"
        )

        print(
            f"Train Accuracy       : {train_metrics['accuracy'] * 100:.2f}%"
        )

        print(
            f"Train Macro F1       : {train_metrics['f1'] * 100:.2f}%"
        )

        print(
            f"Validation Loss      : {val_loss:.4f}"
        )

        print(
            f"Validation Accuracy  : {val_metrics['accuracy'] * 100:.2f}%"
        )

        print(
            f"Validation Precision : {val_metrics['precision'] * 100:.2f}%"
        )

        print(
            f"Validation Recall    : {val_metrics['recall'] * 100:.2f}%"
        )

        print(
            f"Validation Macro F1  : {val_metrics['f1'] * 100:.2f}%"
        )

        improved = update_best(
            stage_name,
            epoch,
            val_metrics,
        )

        if improved:
            no_improvement = 0
        else:
            no_improvement += 1

        if scheduler is not None:
            scheduler.step()

        if no_improvement >= patience:

            print(
                f"\nEarly stopping {stage_name}"
            )

            break


# ============================================================
# STAGE 1
#
# Recalibrate classifier head only.
# ============================================================

freeze_all(model)
unfreeze_fc(model)


optimizer_stage1 = optim.AdamW(
    model.fc.parameters(),
    lr=3e-4,
    weight_decay=1e-4,
)


scheduler_stage1 = optim.lr_scheduler.CosineAnnealingLR(
    optimizer_stage1,
    T_max=4,
    eta_min=3e-5,
)


run_training_stage(
    stage_name="STAGE 1 - CLASSIFIER RECALIBRATION",
    epochs=4,
    optimizer=optimizer_stage1,
    scheduler=scheduler_stage1,
    patience=4,
)


# ============================================================
# Restore best model before next stage
# ============================================================

model.load_state_dict(
    best_state
)


# ============================================================
# STAGE 2
#
# Fine-tune Layer 4 + classifier.
# ============================================================

freeze_all(model)

unfreeze_layer4(model)
unfreeze_fc(model)


optimizer_stage2 = optim.AdamW(
    [
        {
            "params": model.layer4.parameters(),
            "lr": 4e-5,
        },
        {
            "params": model.fc.parameters(),
            "lr": 1.5e-4,
        },
    ],
    weight_decay=1e-4,
)


scheduler_stage2 = optim.lr_scheduler.CosineAnnealingLR(
    optimizer_stage2,
    T_max=18,
    eta_min=5e-6,
)


run_training_stage(
    stage_name="STAGE 2 - LAYER4 FINE TUNING",
    epochs=18,
    optimizer=optimizer_stage2,
    scheduler=scheduler_stage2,
    patience=7,
)


# ============================================================
# Restore best model before final stage
# ============================================================

model.load_state_dict(
    best_state
)


# ============================================================
# STAGE 3
#
# Fine-tune Layer 3 + Layer 4 + classifier using very small LR.
# ============================================================

freeze_all(model)

unfreeze_layer3(model)
unfreeze_layer4(model)
unfreeze_fc(model)


optimizer_stage3 = optim.AdamW(
    [
        {
            "params": model.layer3.parameters(),
            "lr": 8e-6,
        },
        {
            "params": model.layer4.parameters(),
            "lr": 1.8e-5,
        },
        {
            "params": model.fc.parameters(),
            "lr": 7e-5,
        },
    ],
    weight_decay=1.5e-4,
)


scheduler_stage3 = optim.lr_scheduler.CosineAnnealingLR(
    optimizer_stage3,
    T_max=12,
    eta_min=2e-6,
)


run_training_stage(
    stage_name="STAGE 3 - DEEP SPECIALIZED FINE TUNING",
    epochs=12,
    optimizer=optimizer_stage3,
    scheduler=scheduler_stage3,
    patience=6,
)


# ============================================================
# LOAD BEST STATE
# ============================================================

model.load_state_dict(
    best_state
)


# ============================================================
# FINAL VALIDATION
# ============================================================

final_loss, final_metrics, final_true, final_pred = validate(
    model
)


print("\n" + "=" * 70)
print("FINAL SPECIALIZED VALIDATION")
print("=" * 70)

print(
    f"Best stage           : {best_stage}"
)

print(
    f"Best epoch           : {best_epoch}"
)

print(
    f"Validation Loss      : {final_loss:.4f}"
)

print(
    f"Accuracy             : {final_metrics['accuracy'] * 100:.2f}%"
)

print(
    f"Macro Precision      : {final_metrics['precision'] * 100:.2f}%"
)

print(
    f"Macro Recall         : {final_metrics['recall'] * 100:.2f}%"
)

print(
    f"Macro F1             : {final_metrics['f1'] * 100:.2f}%"
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

matrix = confusion_matrix(
    final_true,
    final_pred,
    labels=list(
        range(NUM_CLASSES)
    ),
)


print("\nValidation Confusion Matrix")
print("-" * 70)

print(
    "Classes:"
)

for index, class_name in enumerate(CLASS_NAMES):

    print(
        f"{index}: {class_name}"
    )


print("\nMatrix:")

print(matrix)


# ============================================================
# SAVE SPECIALIZED CHECKPOINT
#
# IMPORTANT:
# Saves separately.
# Existing zipper_resnet18.pth is NOT overwritten.
# ============================================================

os.makedirs(
    MODEL_DIR,
    exist_ok=True,
)


torch.save(
    model.state_dict(),
    SPECIALIZED_MODEL_PATH,
)


print("\n" + "=" * 70)

print(
    "SPECIALIZED TRAINING COMPLETE"
)

print("=" * 70)

print(
    f"\nSaved specialized model:\n{SPECIALIZED_MODEL_PATH}"
)

print(
    "\nOriginal zipper_resnet18.pth remains unchanged."
)

print(
    "\nNext step: evaluate zipper_resnet18_specialized.pth"
)

print("=" * 70)