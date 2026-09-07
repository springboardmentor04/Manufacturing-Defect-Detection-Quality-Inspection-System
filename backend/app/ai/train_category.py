import os
import random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image

from app.ai.category_dataloader import (
    MVTecCategoryDataset,
    CATEGORIES,
)

from app.ai.category_model import CategoryCNN

from app.ai.category_split import (
    create_stratified_category_split,
)


# ============================================================
# SETTINGS
# ============================================================

SEED = 42

BATCH_SIZE = 32
LEARNING_RATE = 0.0003

EPOCHS = 12
EARLY_STOPPING_PATIENCE = 3

WEIGHT_DECAY = 0.0001

IMAGE_SIZE = 256

MODEL_DIR = os.path.join(
    os.path.dirname(__file__),
    "saved_models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "category_model.pth"
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
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available()
    else "cpu"
)

print(f"\nDevice: {DEVICE}")


# ============================================================
# TRANSFORMS
# ============================================================

TRAIN_TRANSFORM = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.RandomHorizontalFlip(
        p=0.5
    ),

    transforms.RandomRotation(
        degrees=8
    ),

    transforms.ColorJitter(
        brightness=0.10,
        contrast=0.10
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


VAL_TRANSFORM = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# ============================================================
# SPLIT DATASET
# ============================================================

class SplitDataset(Dataset):

    def __init__(
        self,
        samples,
        transform
    ):

        self.samples = samples
        self.transform = transform

    def __len__(self):

        return len(self.samples)

    def __getitem__(self, index):

        sample = self.samples[index]

        image = Image.open(
            sample["image_path"]
        ).convert("RGB")

        image = self.transform(image)

        label = sample["category_index"]

        return image, label


# ============================================================
# LOAD DATA
# ============================================================

print("\nLoading dataset...")

base_dataset = MVTecCategoryDataset()

train_samples, val_samples = (
    create_stratified_category_split(
        base_dataset
    )
)

train_dataset = SplitDataset(
    train_samples,
    TRAIN_TRANSFORM
)

val_dataset = SplitDataset(
    val_samples,
    VAL_TRANSFORM
)

print(
    f"Training samples   : {len(train_dataset)}"
)

print(
    f"Validation samples : {len(val_dataset)}"
)


# ============================================================
# DATA LOADERS
# ============================================================

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=0,
    pin_memory=torch.cuda.is_available()
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0,
    pin_memory=torch.cuda.is_available()
)


# ============================================================
# MODEL
# ============================================================

model = CategoryCNN(
    num_classes=len(CATEGORIES)
).to(DEVICE)


# ============================================================
# CLASS WEIGHTS
# ============================================================

train_category_counts = np.bincount(
    [
        sample["category_index"]
        for sample in train_samples
    ],
    minlength=len(CATEGORIES)
).astype(np.float64)

class_weights = (
    train_category_counts.sum()
    / (
        len(CATEGORIES)
        * np.maximum(train_category_counts, 1)
    )
)

class_weights = torch.tensor(
    class_weights,
    dtype=torch.float32,
    device=DEVICE
)

print("\nCategory training distribution:")

for index, category in enumerate(CATEGORIES):

    print(
        f"  {category:<15} : "
        f"{int(train_category_counts[index])} samples "
        f"| weight {class_weights[index].item():.4f}"
    )


# ============================================================
# LOSS
# ============================================================

criterion = nn.CrossEntropyLoss(
    weight=class_weights
)


# ============================================================
# OPTIMIZER
# ============================================================

optimizer = torch.optim.Adam(
    model.parameters(),
    lr=LEARNING_RATE,
    weight_decay=WEIGHT_DECAY
)


# ============================================================
# SCHEDULER
# ============================================================

scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer,
    mode="min",
    factor=0.5,
    patience=1
)


# ============================================================
# TRAINING
# ============================================================

best_val_accuracy = 0.0
patience_counter = 0

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

print("\n" + "=" * 70)
print("STARTING CATEGORY MODEL TRAINING")
print("=" * 70)


for epoch in range(EPOCHS):

    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

    model.train()

    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in train_loader:

        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(
            outputs,
            labels
        )

        loss.backward()

        optimizer.step()

        running_loss += (
            loss.item() * images.size(0)
        )

        predictions = torch.argmax(
            outputs,
            dim=1
        )

        correct += (
            predictions == labels
        ).sum().item()

        total += labels.size(0)

    train_loss = (
        running_loss / total
    )

    train_accuracy = (
        correct / total
    ) * 100


    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    model.eval()

    val_loss_total = 0.0
    val_correct = 0
    val_total = 0

    # Rows = actual
    # Columns = predicted

    val_confusion = np.zeros(
        (
            len(CATEGORIES),
            len(CATEGORIES)
        ),
        dtype=np.int64
    )

    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(DEVICE)
            labels = labels.to(DEVICE)

            outputs = model(images)

            loss = criterion(
                outputs,
                labels
            )

            val_loss_total += (
                loss.item() * images.size(0)
            )

            predictions = torch.argmax(
                outputs,
                dim=1
            )

            val_correct += (
                predictions == labels
            ).sum().item()

            val_total += labels.size(0)

            for actual, predicted in zip(
                labels.cpu().numpy(),
                predictions.cpu().numpy()
            ):

                val_confusion[
                    actual,
                    predicted
                ] += 1


    val_loss = (
        val_loss_total / val_total
    )

    val_accuracy = (
        val_correct / val_total
    ) * 100


    # --------------------------------------------------------
    # PER-CATEGORY METRICS
    # --------------------------------------------------------

    category_metrics = []

    for index, category in enumerate(CATEGORIES):

        true_positive = (
            val_confusion[
                index,
                index
            ]
        )

        false_positive = (
            val_confusion[:, index].sum()
            - true_positive
        )

        false_negative = (
            val_confusion[index, :].sum()
            - true_positive
        )

        precision = (
            true_positive
            / (true_positive + false_positive)
            if (
                true_positive
                + false_positive
            ) > 0
            else 0.0
        )

        recall = (
            true_positive
            / (true_positive + false_negative)
            if (
                true_positive
                + false_negative
            ) > 0
            else 0.0
        )

        f1 = (
            2
            * precision
            * recall
            / (precision + recall)
            if (
                precision + recall
            ) > 0
            else 0.0
        )

        category_metrics.append(
            (
                category,
                precision,
                recall,
                f1
            )
        )


    # --------------------------------------------------------
    # LEARNING RATE
    # --------------------------------------------------------

    scheduler.step(val_loss)

    current_lr = (
        optimizer.param_groups[0]["lr"]
    )


    # --------------------------------------------------------
    # PRINT RESULTS
    # --------------------------------------------------------

    print(
        f"\nEpoch {epoch + 1:02d}/{EPOCHS}"
        f" | LR: {current_lr:.6f}"
    )

    print(
        f"Train Loss: {train_loss:.4f}"
        f" | Train Acc: {train_accuracy:.2f}%"
    )

    print(
        f"Val Loss: {val_loss:.4f}"
        f" | Val Acc: {val_accuracy:.2f}%"
    )


    # --------------------------------------------------------
    # PER-CATEGORY RESULTS
    # --------------------------------------------------------

    print("\nPer-category validation metrics:")

    print(
        f"{'Category':<15}"
        f"{'Precision':>12}"
        f"{'Recall':>12}"
        f"{'F1':>12}"
    )

    print("-" * 51)

    for (
        category,
        precision,
        recall,
        f1
    ) in category_metrics:

        print(
            f"{category:<15}"
            f"{precision * 100:>11.2f}%"
            f"{recall * 100:>11.2f}%"
            f"{f1 * 100:>11.2f}%"
        )


    # --------------------------------------------------------
    # CONFUSION MATRIX
    # --------------------------------------------------------

    print("\nValidation confusion matrix:")

    print(
        "Rows = Actual | Columns = Predicted"
    )

    print(
        " " * 18
        + " ".join(
            f"{i:>4}"
            for i in range(
                len(CATEGORIES)
            )
        )
    )

    for i, category in enumerate(CATEGORIES):

        print(
            f"{i:>2} {category:<14}"
            + " ".join(
                f"{value:>4}"
                for value in val_confusion[i]
            )
        )


    # --------------------------------------------------------
    # SAVE BEST MODEL
    # --------------------------------------------------------

    if val_accuracy > best_val_accuracy:

        best_val_accuracy = val_accuracy

        torch.save(
            {
                "model_state_dict":
                    model.state_dict(),

                "categories":
                    CATEGORIES,

                "num_classes":
                    len(CATEGORIES),

                "image_size":
                    IMAGE_SIZE
            },
            MODEL_PATH
        )

        patience_counter = 0

        print(
            "\n   ✓ Best category model saved."
        )

    else:

        patience_counter += 1

        print(
            f"   No improvement "
            f"({patience_counter}/"
            f"{EARLY_STOPPING_PATIENCE})"
        )

        if patience_counter >= (
            EARLY_STOPPING_PATIENCE
        ):

            print(
                "\nEarly stopping triggered."
            )

            break


# ============================================================
# FINAL RESULT
# ============================================================

print("\n" + "=" * 70)
print("CATEGORY MODEL TRAINING COMPLETE")
print("=" * 70)

print(
    f"Best validation accuracy : "
    f"{best_val_accuracy:.2f}%"
)

print(
    f"Model saved to           : "
    f"{MODEL_PATH}"
)

print(
    "\nThe saved model is ready "
    "for the evaluation stage."
)

print(
    "Do NOT use it for production "
    "inference until evaluation passes."
)

print("=" * 70)