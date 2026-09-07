import os
import json
import copy
import random

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from PIL import Image

from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler

from torchvision import models, transforms

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)


# ============================================================
# CONFIG
# ============================================================

SEED = 42

CATEGORY = "zipper"

IMAGE_SIZE = 224
BATCH_SIZE = 16
NUM_WORKERS = 0

NUM_CLASSES = 8

STAGE1_EPOCHS = 5
STAGE2_EPOCHS = 25

STAGE1_LR = 1e-4
STAGE2_LR = 2e-5

PATIENCE = 8


CLASSES = [
    "good",
    "broken_teeth",
    "combined",
    "fabric_border",
    "fabric_interior",
    "rough",
    "split_teeth",
    "squeezed_teeth",
]


CLASS_TO_INDEX = {
    name: i
    for i, name in enumerate(CLASSES)
}


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
    )
)

DATASET_DIR = os.path.join(
    BASE_DIR,
    "dataset",
    "mvtec_ad",
    CATEGORY,
)

ORIGINAL_MODEL_PATH = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "saved_models",
    "zipper_resnet18.pth",
)

OUTPUT_MODEL_PATH = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "saved_models",
    "zipper_resnet18_targeted.pth",
)

RESULT_DIR = os.path.join(
    BASE_DIR,
    "app",
    "ai",
    "evaluation_results",
)

RESULT_PATH = os.path.join(
    RESULT_DIR,
    "zipper_targeted_finetuning.json",
)


# ============================================================
# SEED
# ============================================================

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


print("=" * 78)
print("VISIONINSPECT AI - TARGETED ZIPPER FINE-TUNING")
print("=" * 78)

print(f"Device   : {DEVICE}")
print(f"Dataset  : {DATASET_DIR}")
print(f"Original : {ORIGINAL_MODEL_PATH}")
print(f"Output   : {OUTPUT_MODEL_PATH}")


# ============================================================
# IMAGE HELPERS
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

    lower = filename.lower()

    return (
        lower.endswith(IMAGE_EXTENSIONS)
        and "_mask" not in lower
    )


# ============================================================
# TRANSFORMS
# ============================================================

train_transform = transforms.Compose([
    transforms.Resize((256, 256)),

    transforms.RandomResizedCrop(
        IMAGE_SIZE,
        scale=(0.88, 1.0),
        ratio=(0.92, 1.08),
    ),

    transforms.RandomHorizontalFlip(
        p=0.5
    ),

    transforms.RandomRotation(
        degrees=5
    ),

    transforms.ColorJitter(
        brightness=0.06,
        contrast=0.08,
        saturation=0.04,
        hue=0.01,
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


val_transform = transforms.Compose([
    transforms.Resize((256, 256)),

    transforms.CenterCrop(
        IMAGE_SIZE
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


# ============================================================
# DATASET
# ============================================================

class ZipperDataset(Dataset):

    def __init__(
        self,
        paths,
        labels,
        transform,
        weights=None,
    ):

        self.paths = paths
        self.labels = labels
        self.transform = transform
        self.weights = weights


    def __len__(self):

        return len(self.paths)


    def __getitem__(self, index):

        image = Image.open(
            self.paths[index]
        ).convert("RGB")

        image = self.transform(image)

        label = self.labels[index]

        if self.weights is None:
            return image, label

        return (
            image,
            label,
            float(self.weights[index]),
        )


# ============================================================
# COLLECT DATA
#
# SAME CONVENTION AS EXISTING ZIPPER TRAINING:
#
# train/good
# +
# test defects
#
# test/good is NOT used for training.
# ============================================================

def collect_data():

    paths = []
    labels = []


    good_dir = os.path.join(
        DATASET_DIR,
        "train",
        "good",
    )


    if not os.path.isdir(good_dir):

        raise FileNotFoundError(
            f"Missing:\n{good_dir}"
        )


    for filename in sorted(
        os.listdir(good_dir)
    ):

        if valid_image(filename):

            paths.append(
                os.path.join(
                    good_dir,
                    filename,
                )
            )

            labels.append(
                CLASS_TO_INDEX["good"]
            )


    test_dir = os.path.join(
        DATASET_DIR,
        "test",
    )


    for class_name in CLASSES:

        if class_name == "good":
            continue


        class_dir = os.path.join(
            test_dir,
            class_name,
        )


        if not os.path.isdir(class_dir):

            raise FileNotFoundError(
                f"Missing:\n{class_dir}"
            )


        for filename in sorted(
            os.listdir(class_dir)
        ):

            if valid_image(filename):

                paths.append(
                    os.path.join(
                        class_dir,
                        filename,
                    )
                )

                labels.append(
                    CLASS_TO_INDEX[class_name]
                )


    return paths, labels


all_paths, all_labels = collect_data()


print("\nDataset")
print("-" * 78)

for i, class_name in enumerate(CLASSES):

    print(
        f"{class_name:<20}: "
        f"{all_labels.count(i)}"
    )

print(
    f"{'TOTAL':<20}: "
    f"{len(all_labels)}"
)


# ============================================================
# STRATIFIED SPLIT
# ============================================================

(
    train_paths,
    val_paths,
    train_labels,
    val_labels,
) = train_test_split(
    all_paths,
    all_labels,
    test_size=0.20,
    random_state=SEED,
    stratify=all_labels,
)


print("\nSplit")
print("-" * 78)

print(
    f"Training   : {len(train_paths)}"
)

print(
    f"Validation : {len(val_paths)}"
)


# ============================================================
# MODEL
#
# EXACT SAME ARCHITECTURE AS ORIGINAL MODEL
# ============================================================

def build_model():

    model = models.resnet18(
        weights=None
    )

    model.fc = nn.Sequential(
        nn.Dropout(0.20),
        nn.Linear(
            512,
            NUM_CLASSES,
        ),
    )

    return model


model = build_model()


# ============================================================
# LOAD ORIGINAL CHECKPOINT
# ============================================================

checkpoint = torch.load(
    ORIGINAL_MODEL_PATH,
    map_location=DEVICE,
)


if isinstance(checkpoint, dict):

    if "state_dict" in checkpoint:
        checkpoint = checkpoint[
            "state_dict"
        ]

    elif "model_state_dict" in checkpoint:
        checkpoint = checkpoint[
            "model_state_dict"
        ]


clean_checkpoint = {}

for key, value in checkpoint.items():

    if key.startswith("module."):
        key = key[7:]

    clean_checkpoint[key] = value


missing, unexpected = model.load_state_dict(
    clean_checkpoint,
    strict=False,
)


print("\nOriginal checkpoint loaded")

print(
    f"Missing keys    : {len(missing)}"
)

print(
    f"Unexpected keys : {len(unexpected)}"
)


model = model.to(DEVICE)


# ============================================================
# BASELINE PREDICTIONS
#
# Use ONLY training split to discover hard examples.
# ============================================================

baseline_dataset = ZipperDataset(
    train_paths,
    train_labels,
    val_transform,
)


baseline_loader = DataLoader(
    baseline_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=NUM_WORKERS,
)


model.eval()

baseline_predictions = []
baseline_confidences = []


with torch.no_grad():

    for images, labels in baseline_loader:

        images = images.to(DEVICE)

        outputs = model(images)

        probabilities = torch.softmax(
            outputs,
            dim=1,
        )

        predictions = torch.argmax(
            probabilities,
            dim=1,
        )

        confidence = torch.max(
            probabilities,
            dim=1,
        ).values


        baseline_predictions.extend(
            predictions.cpu()
            .numpy()
            .tolist()
        )

        baseline_confidences.extend(
            confidence.cpu()
            .numpy()
            .tolist()
        )


# ============================================================
# HARD EXAMPLE WEIGHTS
#
# Known difficult classes:
#
# broken_teeth
# combined
# fabric_interior
# squeezed_teeth
#
# We emphasize errors only mildly.
# ============================================================

FOCUS_CLASSES = {
    CLASS_TO_INDEX["broken_teeth"],
    CLASS_TO_INDEX["combined"],
    CLASS_TO_INDEX["fabric_interior"],
    CLASS_TO_INDEX["squeezed_teeth"],
}


sample_weights = []


for true_label, prediction, confidence in zip(
    train_labels,
    baseline_predictions,
    baseline_confidences,
):

    weight = 1.0


    # Every baseline mistake gets attention.
    if prediction != true_label:

        weight *= 1.75


    # Known difficult classes get extra attention.
    if true_label in FOCUS_CLASSES:

        weight *= 1.20


    # High-confidence mistakes are particularly useful.
    if (
        prediction != true_label
        and confidence >= 0.75
    ):

        weight *= 1.20


    # Prevent extreme oversampling.
    weight = min(
        weight,
        2.8,
    )


    sample_weights.append(
        weight
    )


hard_count = sum(
    prediction != true_label
    for prediction, true_label
    in zip(
        baseline_predictions,
        train_labels,
    )
)


print("\nHard-example analysis")
print("-" * 78)

print(
    f"Baseline training errors : "
    f"{hard_count}"
)

print(
    f"Average sample weight    : "
    f"{np.mean(sample_weights):.3f}"
)

print(
    f"Maximum sample weight    : "
    f"{np.max(sample_weights):.3f}"
)


# ============================================================
# LOADERS
# ============================================================

train_dataset = ZipperDataset(
    train_paths,
    train_labels,
    train_transform,
    sample_weights,
)


val_dataset = ZipperDataset(
    val_paths,
    val_labels,
    val_transform,
)


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


val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=NUM_WORKERS,
    pin_memory=torch.cuda.is_available(),
)


# ============================================================
# FOCAL LOSS
# ============================================================

class FocalLoss(nn.Module):

    def __init__(
        self,
        class_weights,
        gamma=1.5,
    ):

        super().__init__()

        self.class_weights = class_weights
        self.gamma = gamma


    def forward(
        self,
        logits,
        targets,
    ):

        log_probs = torch.log_softmax(
            logits,
            dim=1,
        )

        log_pt = log_probs.gather(
            1,
            targets.unsqueeze(1),
        ).squeeze(1)

        pt = torch.exp(log_pt)

        focal_factor = (
            1.0 - pt
        ).pow(
            self.gamma
        )

        weights = self.class_weights[
            targets
        ]

        return (
            -log_pt
            * focal_factor
            * weights
        ).mean()


# ============================================================
# MILD CLASS WEIGHTS
# ============================================================

class_weights = torch.tensor(
    [
        1.00,  # good
        1.30,  # broken_teeth
        1.35,  # combined
        0.95,  # fabric_border
        1.30,  # fabric_interior
        0.95,  # rough
        1.05,  # split_teeth
        1.30,  # squeezed_teeth
    ],
    dtype=torch.float32,
).to(DEVICE)


criterion = FocalLoss(
    class_weights,
    gamma=1.5,
)


# ============================================================
# METRICS
# ============================================================

def get_metrics(
    y_true,
    y_pred,
):

    return {
        "accuracy": accuracy_score(
            y_true,
            y_pred,
        ),

        "precision": precision_score(
            y_true,
            y_pred,
            average="macro",
            zero_division=0,
        ),

        "recall": recall_score(
            y_true,
            y_pred,
            average="macro",
            zero_division=0,
        ),

        "f1": f1_score(
            y_true,
            y_pred,
            average="macro",
            zero_division=0,
        ),
    }


# ============================================================
# VALIDATION
# ============================================================

def evaluate():

    model.eval()

    y_true = []
    y_pred = []

    total_loss = 0.0
    total_count = 0


    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(DEVICE)
            labels = labels.to(DEVICE)

            outputs = model(images)

            loss = criterion(
                outputs,
                labels,
            )


            predictions = torch.argmax(
                outputs,
                dim=1,
            )


            total_loss += (
                loss.item()
                *
                images.size(0)
            )

            total_count += (
                images.size(0)
            )


            y_true.extend(
                labels.cpu()
                .numpy()
                .tolist()
            )

            y_pred.extend(
                predictions.cpu()
                .numpy()
                .tolist()
            )


    result = get_metrics(
        y_true,
        y_pred,
    )

    result["loss"] = (
        total_loss
        /
        max(total_count, 1)
    )


    return (
        result,
        y_true,
        y_pred,
    )


# ============================================================
# TRAINING STEP
# ============================================================

def train_one_epoch(
    optimizer,
):

    model.train()

    total_loss = 0.0
    total_count = 0

    y_true = []
    y_pred = []


    for (
        images,
        labels,
        weights,
    ) in train_loader:

        images = images.to(DEVICE)
        labels = labels.to(DEVICE)
        weights = weights.to(DEVICE)


        optimizer.zero_grad()


        outputs = model(
            images
        )


        focal_loss = criterion(
            outputs,
            labels,
        )


        # Explicit hard-example component.
        log_probs = torch.log_softmax(
            outputs,
            dim=1,
        )


        nll = -log_probs[
            torch.arange(
                labels.size(0),
                device=DEVICE,
            ),
            labels,
        ]


        normalized_weights = (
            weights
            /
            weights.mean()
        )


        hard_loss = torch.mean(
            nll
            *
            normalized_weights
        )


        # Blend the two objectives.
        loss = (
            0.70 * focal_loss
            +
            0.30 * hard_loss
        )


        loss.backward()


        torch.nn.utils.clip_grad_norm_(
            model.parameters(),
            max_norm=2.0,
        )


        optimizer.step()


        total_loss += (
            loss.item()
            *
            images.size(0)
        )

        total_count += (
            images.size(0)
        )


        predictions = torch.argmax(
            outputs,
            dim=1,
        )


        y_true.extend(
            labels.detach()
            .cpu()
            .numpy()
            .tolist()
        )

        y_pred.extend(
            predictions.detach()
            .cpu()
            .numpy()
            .tolist()
        )


    result = get_metrics(
        y_true,
        y_pred,
    )

    result["loss"] = (
        total_loss
        /
        max(total_count, 1)
    )


    return result


# ============================================================
# BEST MODEL TRACKING
# ============================================================

best_f1 = -1.0

best_state = copy.deepcopy(
    model.state_dict()
)

best_epoch = 0

no_improvement = 0


# ============================================================
# STAGE 1
#
# Only layer4 + classifier.
# This protects the useful original features.
# ============================================================

print("\n" + "=" * 78)
print("STAGE 1 - LOW-RISK TARGETED ADAPTATION")
print("=" * 78)


for parameter in model.parameters():

    parameter.requires_grad = False


for parameter in model.layer4.parameters():

    parameter.requires_grad = True


for parameter in model.fc.parameters():

    parameter.requires_grad = True


optimizer = optim.AdamW(
    filter(
        lambda p: p.requires_grad,
        model.parameters(),
    ),
    lr=STAGE1_LR,
    weight_decay=5e-5,
)


scheduler = optim.lr_scheduler.CosineAnnealingLR(
    optimizer,
    T_max=STAGE1_EPOCHS,
    eta_min=STAGE1_LR * 0.1,
)


for epoch in range(
    1,
    STAGE1_EPOCHS + 1,
):

    train_metrics = train_one_epoch(
        optimizer
    )

    val_metrics, _, _ = evaluate()


    print(
        f"\nEpoch "
        f"{epoch:02d}/{STAGE1_EPOCHS}"
    )

    print(
        f"Train Loss     : "
        f"{train_metrics['loss']:.4f}"
    )

    print(
        f"Train Accuracy : "
        f"{train_metrics['accuracy'] * 100:.2f}%"
    )

    print(
        f"Train Macro F1 : "
        f"{train_metrics['f1'] * 100:.2f}%"
    )

    print(
        f"Val Loss       : "
        f"{val_metrics['loss']:.4f}"
    )

    print(
        f"Val Accuracy   : "
        f"{val_metrics['accuracy'] * 100:.2f}%"
    )

    print(
        f"Val Precision  : "
        f"{val_metrics['precision'] * 100:.2f}%"
    )

    print(
        f"Val Recall     : "
        f"{val_metrics['recall'] * 100:.2f}%"
    )

    print(
        f"Val Macro F1   : "
        f"{val_metrics['f1'] * 100:.2f}%"
    )


    if (
        val_metrics["f1"]
        >
        best_f1 + 1e-5
    ):

        best_f1 = val_metrics["f1"]

        best_state = copy.deepcopy(
            model.state_dict()
        )

        best_epoch = epoch

        no_improvement = 0

        print(
            "  >>> NEW BEST"
        )

    else:

        no_improvement += 1


    scheduler.step()


# ============================================================
# RESTORE BEST STAGE 1
# ============================================================

model.load_state_dict(
    best_state
)


# ============================================================
# STAGE 2
#
# Full network, extremely low learning rate.
# ============================================================

print("\n" + "=" * 78)
print("STAGE 2 - FULL LOW-LR TARGETED FINE-TUNING")
print("=" * 78)


for parameter in model.parameters():

    parameter.requires_grad = True


optimizer = optim.AdamW(
    model.parameters(),
    lr=STAGE2_LR,
    weight_decay=5e-5,
)


scheduler = optim.lr_scheduler.CosineAnnealingLR(
    optimizer,
    T_max=STAGE2_EPOCHS,
    eta_min=STAGE2_LR * 0.1,
)


no_improvement = 0


for epoch in range(
    1,
    STAGE2_EPOCHS + 1,
):

    train_metrics = train_one_epoch(
        optimizer
    )

    val_metrics, _, _ = evaluate()


    print(
        f"\nEpoch "
        f"{epoch:02d}/{STAGE2_EPOCHS}"
    )

    print(
        f"Train Loss     : "
        f"{train_metrics['loss']:.4f}"
    )

    print(
        f"Train Accuracy : "
        f"{train_metrics['accuracy'] * 100:.2f}%"
    )

    print(
        f"Train Macro F1 : "
        f"{train_metrics['f1'] * 100:.2f}%"
    )

    print(
        f"Val Loss       : "
        f"{val_metrics['loss']:.4f}"
    )

    print(
        f"Val Accuracy   : "
        f"{val_metrics['accuracy'] * 100:.2f}%"
    )

    print(
        f"Val Precision  : "
        f"{val_metrics['precision'] * 100:.2f}%"
    )

    print(
        f"Val Recall     : "
        f"{val_metrics['recall'] * 100:.2f}%"
    )

    print(
        f"Val Macro F1   : "
        f"{val_metrics['f1'] * 100:.2f}%"
    )


    if (
        val_metrics["f1"]
        >
        best_f1 + 1e-5
    ):

        best_f1 = val_metrics["f1"]

        best_state = copy.deepcopy(
            model.state_dict()
        )

        best_epoch = (
            STAGE1_EPOCHS
            +
            epoch
        )

        no_improvement = 0

        print(
            "  >>> NEW BEST"
        )

    else:

        no_improvement += 1


    scheduler.step()


    if no_improvement >= PATIENCE:

        print(
            "\nEarly stopping."
        )

        break


# ============================================================
# RESTORE BEST MODEL
# ============================================================

model.load_state_dict(
    best_state
)


# ============================================================
# FINAL VALIDATION
# ============================================================

final_metrics, final_true, final_pred = (
    evaluate()
)


print("\n" + "=" * 78)
print("TARGETED ZIPPER FINE-TUNING FINAL")
print("=" * 78)


print(
    f"Best epoch       : "
    f"{best_epoch}"
)

print(
    f"Accuracy         : "
    f"{final_metrics['accuracy'] * 100:.2f}%"
)

print(
    f"Macro Precision  : "
    f"{final_metrics['precision'] * 100:.2f}%"
)

print(
    f"Macro Recall     : "
    f"{final_metrics['recall'] * 100:.2f}%"
)

print(
    f"Macro F1         : "
    f"{final_metrics['f1'] * 100:.2f}%"
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

final_cm = confusion_matrix(
    final_true,
    final_pred,
    labels=list(
        range(NUM_CLASSES)
    ),
)


print("\nConfusion matrix")
print(final_cm)


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

final_report = classification_report(
    final_true,
    final_pred,
    labels=list(
        range(NUM_CLASSES)
    ),
    target_names=CLASSES,
    digits=4,
    zero_division=0,
)


print("\nClassification report")
print(final_report)


# ============================================================
# SAVE NEW CHECKPOINT
# ============================================================

os.makedirs(
    os.path.dirname(
        OUTPUT_MODEL_PATH
    ),
    exist_ok=True,
)


torch.save(
    model.state_dict(),
    OUTPUT_MODEL_PATH,
)


# ============================================================
# SAVE JSON
# ============================================================

result = {

    "category": CATEGORY,

    "method": (
        "targeted_low_lr_finetuning"
        "_hard_example_weighting"
        "_focal_loss"
    ),

    "original_model":
        ORIGINAL_MODEL_PATH,

    "new_model":
        OUTPUT_MODEL_PATH,

    "classes":
        CLASSES,

    "dataset_total":
        len(all_labels),

    "training_size":
        len(train_paths),

    "validation_size":
        len(val_paths),

    "focus_classes": [
        "broken_teeth",
        "combined",
        "fabric_interior",
        "squeezed_teeth",
    ],

    "best_epoch":
        int(best_epoch),

    "validation": {

        "accuracy":
            float(
                final_metrics["accuracy"]
            ),

        "macro_precision":
            float(
                final_metrics["precision"]
            ),

        "macro_recall":
            float(
                final_metrics["recall"]
            ),

        "macro_f1":
            float(
                final_metrics["f1"]
            ),
    },

    "confusion_matrix":
        final_cm.tolist(),

    "classification_report":
        final_report,
}


os.makedirs(
    RESULT_DIR,
    exist_ok=True,
)


with open(
    RESULT_PATH,
    "w",
    encoding="utf-8",
) as file:

    json.dump(
        result,
        file,
        indent=4,
    )


# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 78)
print("TARGETED ZIPPER FINE-TUNING COMPLETE")
print("=" * 78)

print(
    "\nOriginal model preserved:"
)

print(
    ORIGINAL_MODEL_PATH
)

print(
    "\nNew experimental model:"
)

print(
    OUTPUT_MODEL_PATH
)

print(
    "\nResults:"
)

print(
    RESULT_PATH
)

print(
    "\nThe original zipper_resnet18.pth "
    "was NOT overwritten."
)

print("=" * 78)