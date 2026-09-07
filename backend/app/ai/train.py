import os
import torch
import torch.nn as nn
import torch.optim as optim

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score
)

from app.ai.model import CustomCNN
from app.ai.dataloader import get_dataloaders


# ==========================================================
# DEVICE
# ==========================================================

device = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# ==========================================================
# HEADER
# ==========================================================

print("=" * 65)
print("VISIONINSPECT AI - IMPROVED CUSTOM CNN TRAINING")
print("=" * 65)

print(f"Device: {device}")


# ==========================================================
# TRAINING SETTINGS
# ==========================================================

BATCH_SIZE = 16

LEARNING_RATE = 0.0003

EPOCHS = 20

EARLY_STOPPING_PATIENCE = 5

WEIGHT_DECAY = 0.0001


# ==========================================================
# DATA
# ==========================================================

print("\nLoading dataset...")

(
    train_loader,
    val_loader,
    normal_count,
    defect_count
) = get_dataloaders(
    batch_size=BATCH_SIZE
)


# ==========================================================
# MODEL
# ==========================================================

model = CustomCNN().to(device)


# ==========================================================
# CLASS WEIGHTING
# ==========================================================
#
# The previous model detected only 30.59% of defects.
#
# We give the Defective class more importance during training
# so that missing defects becomes more costly.
#
# The weights are calculated automatically from the
# training-set class counts.
#
# ==========================================================

total_samples = normal_count + defect_count

normal_weight = total_samples / (
    2 * normal_count
)

defect_weight = total_samples / (
    2 * defect_count
)

class_weights = torch.tensor(
    [
        normal_weight,
        defect_weight
    ],
    dtype=torch.float32
).to(device)


print("\nClass Weights")
print("-" * 65)

print(
    f"Normal    : {normal_weight:.4f}"
)

print(
    f"Defective : {defect_weight:.4f}"
)


# ==========================================================
# LOSS
# ==========================================================

criterion = nn.CrossEntropyLoss(
    weight=class_weights
)


# ==========================================================
# OPTIMIZER
# ==========================================================

optimizer = optim.Adam(
    model.parameters(),
    lr=LEARNING_RATE,
    weight_decay=WEIGHT_DECAY
)


# ==========================================================
# SCHEDULER
# ==========================================================

scheduler = optim.lr_scheduler.ReduceLROnPlateau(
    optimizer,
    mode="max",
    factor=0.5,
    patience=2,
    min_lr=1e-6
)


# ==========================================================
# BEST MODEL TRACKING
# ==========================================================

best_f1 = 0.0

best_recall = 0.0

best_accuracy = 0.0

best_val_loss = float("inf")

early_stopping_counter = 0


# ==========================================================
# SAVE DIRECTORY
# ==========================================================

save_directory = "app/ai/saved_models"

os.makedirs(
    save_directory,
    exist_ok=True
)


# ==========================================================
# IMPORTANT:
# SAVE AS A NEW MODEL
# ==========================================================

save_path = os.path.join(
    save_directory,
    "improved_model.pth"
)


# ==========================================================
# TRAINING LOOP
# ==========================================================

for epoch in range(EPOCHS):

    # ======================================================
    # TRAIN
    # ======================================================

    model.train()

    train_loss = 0.0

    train_correct = 0

    train_total = 0


    for images, labels in train_loader:

        images = images.to(device)

        labels = labels.to(device)


        optimizer.zero_grad()


        outputs = model(images)


        loss = criterion(
            outputs,
            labels
        )


        loss.backward()


        torch.nn.utils.clip_grad_norm_(
            model.parameters(),
            max_norm=1.0
        )


        optimizer.step()


        train_loss += loss.item()


        predictions = torch.argmax(
            outputs,
            dim=1
        )


        train_total += labels.size(0)


        train_correct += (
            predictions == labels
        ).sum().item()


    # ======================================================
    # TRAIN METRICS
    # ======================================================

    train_loss /= len(
        train_loader
    )


    train_accuracy = (
        100.0
        * train_correct
        / train_total
    )


    # ======================================================
    # VALIDATION
    # ======================================================

    model.eval()

    val_loss = 0.0

    all_labels = []

    all_predictions = []


    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(device)

            labels = labels.to(device)


            outputs = model(images)


            loss = criterion(
                outputs,
                labels
            )


            val_loss += loss.item()


            predictions = torch.argmax(
                outputs,
                dim=1
            )


            all_labels.extend(
                labels.cpu().numpy()
            )


            all_predictions.extend(
                predictions.cpu().numpy()
            )


    # ======================================================
    # VALIDATION LOSS
    # ======================================================

    val_loss /= len(
        val_loader
    )


    # ======================================================
    # VALIDATION METRICS
    # ======================================================

    val_accuracy = accuracy_score(
        all_labels,
        all_predictions
    )


    val_precision = precision_score(
        all_labels,
        all_predictions,
        pos_label=1,
        zero_division=0
    )


    val_recall = recall_score(
        all_labels,
        all_predictions,
        pos_label=1,
        zero_division=0
    )


    val_f1 = f1_score(
        all_labels,
        all_predictions,
        pos_label=1,
        zero_division=0
    )


    # ======================================================
    # LEARNING RATE
    # ======================================================

    scheduler.step(
        val_f1
    )


    current_lr = optimizer.param_groups[0]["lr"]


    # ======================================================
    # OUTPUT
    # ======================================================

    print(
        f"\nEpoch {epoch + 1:02d}/{EPOCHS}"
        f" | LR: {current_lr:.6f}"
        f" | Train Loss: {train_loss:.4f}"
        f" | Train Acc: {train_accuracy:.2f}%"
        f" | Val Loss: {val_loss:.4f}"
        f" | Val Acc: {val_accuracy * 100:.2f}%"
        f" | Defect Precision: {val_precision * 100:.2f}%"
        f" | Defect Recall: {val_recall * 100:.2f}%"
        f" | Defect F1: {val_f1 * 100:.2f}%"
    )


    # ======================================================
    # BEST MODEL
    # ======================================================
    #
    # The model is selected using Defective F1.
    #
    # This is more appropriate than selecting only accuracy
    # because our previous model had high accuracy but very
    # poor defect recall.
    #
    # ======================================================

    if val_f1 > best_f1:

        best_f1 = val_f1

        best_recall = val_recall

        best_accuracy = val_accuracy

        best_val_loss = val_loss

        early_stopping_counter = 0


        torch.save(
            model.state_dict(),
            save_path
        )


        print(
            "   ✓ Improved model saved."
        )

    else:

        early_stopping_counter += 1


        print(
            f"   No F1 improvement "
            f"({early_stopping_counter}/"
            f"{EARLY_STOPPING_PATIENCE})"
        )


    # ======================================================
    # EARLY STOPPING
    # ======================================================

    if (
        early_stopping_counter
        >= EARLY_STOPPING_PATIENCE
    ):

        print(
            "\nEarly stopping triggered."
        )

        break


# ==========================================================
# FINAL RESULT
# ==========================================================

print("\n" + "=" * 65)

print(
    "IMPROVED TRAINING COMPLETED"
)

print("=" * 65)

print(
    f"Best Defect F1      : "
    f"{best_f1 * 100:.2f}%"
)

print(
    f"Best Defect Recall  : "
    f"{best_recall * 100:.2f}%"
)

print(
    f"Best Accuracy       : "
    f"{best_accuracy * 100:.2f}%"
)

print(
    f"Validation Loss     : "
    f"{best_val_loss:.4f}"
)

print(
    f"Model saved to      : "
    f"{save_path}"
)

print("=" * 65)