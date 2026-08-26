```python
import os
import torch
import torch.nn as nn
import torch.optim as optim

from sklearn.metrics import precision_score, recall_score, f1_score

from model import DefectCNN
from dataset import train_loader, val_loader, train_dataset


# ============================================================
# DEVICE
# ============================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("Using device:", device)


# ============================================================
# MODEL
# ============================================================

model = DefectCNN().to(device)


# ============================================================
# CALCULATE CLASS WEIGHTS
# ============================================================

# Count samples for each class
class_counts = torch.bincount(
    torch.tensor(train_dataset.targets)
)

print("\nClass distribution:")
for i, class_name in enumerate(train_dataset.classes):
    print(f"{class_name}: {class_counts[i].item()}")


# Weight = total samples / (number of classes * class samples)
total_samples = len(train_dataset)
num_classes = len(train_dataset.classes)

class_weights = total_samples / (
    num_classes * class_counts.float()
)

class_weights = class_weights.to(device)

print("\nClass weights:")
for i, class_name in enumerate(train_dataset.classes):
    print(
        f"{class_name}: "
        f"{class_weights[i].item():.4f}"
    )


# ============================================================
# LOSS FUNCTION
# ============================================================

criterion = nn.CrossEntropyLoss(
    weight=class_weights
)


# ============================================================
# OPTIMIZER
# ============================================================

optimizer = optim.Adam(
    model.parameters(),
    lr=0.001
)


# ============================================================
# TRAINING SETTINGS
# ============================================================

epochs = 30


# ============================================================
# TRAINING LOOP
# ============================================================

for epoch in range(epochs):

    # --------------------------------------------------------
    # TRAINING
    # --------------------------------------------------------

    model.train()

    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in train_loader:

        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(outputs, labels)

        loss.backward()

        optimizer.step()

        running_loss += loss.item()

        _, predicted = torch.max(outputs, 1)

        total += labels.size(0)

        correct += (
            predicted == labels
        ).sum().item()

    train_acc = 100 * correct / total


    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    model.eval()

    val_correct = 0
    val_total = 0

    all_labels = []
    all_predictions = []

    with torch.no_grad():

        for images, labels in val_loader:

            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)

            _, predicted = torch.max(
                outputs, 1
            )

            val_total += labels.size(0)

            val_correct += (
                predicted == labels
            ).sum().item()

            all_labels.extend(
                labels.cpu().numpy()
            )

            all_predictions.extend(
                predicted.cpu().numpy()
            )


    val_acc = 100 * val_correct / val_total


    # --------------------------------------------------------
    # PRECISION
    # --------------------------------------------------------

    precision = precision_score(
        all_labels,
        all_predictions,
        average="binary",
        pos_label=0,
        zero_division=0
    )


    # --------------------------------------------------------
    # RECALL
    # --------------------------------------------------------

    recall = recall_score(
        all_labels,
        all_predictions,
        average="binary",
        pos_label=0,
        zero_division=0
    )


    # --------------------------------------------------------
    # F1 SCORE
    # --------------------------------------------------------

    f1 = f1_score(
        all_labels,
        all_predictions,
        average="binary",
        pos_label=0,
        zero_division=0
    )


    # --------------------------------------------------------
    # DISPLAY RESULTS
    # --------------------------------------------------------

    print("----------------------------------------")

    print(
        f"Epoch [{epoch + 1}/{epochs}]"
    )

    print(
        f"Training Loss      : "
        f"{running_loss / len(train_loader):.4f}"
    )

    print(
        f"Train Accuracy     : "
        f"{train_acc:.2f}%"
    )

    print(
        f"Validation Accuracy: "
        f"{val_acc:.2f}%"
    )

    print(
        f"Precision          : "
        f"{precision * 100:.2f}%"
    )

    print(
        f"Recall             : "
        f"{recall * 100:.2f}%"
    )

    print(
        f"F1 Score           : "
        f"{f1 * 100:.2f}%"
    )

    print("----------------------------------------")


# ============================================================
# SAVE MODEL
# ============================================================

os.makedirs(
    "saved_models",
    exist_ok=True
)

model_path = "saved_models/model.pth"

torch.save(
    model.state_dict(),
    model_path
)

print("\n========================================")
print("TRAINING COMPLETED SUCCESSFULLY!")
print("========================================")
print(f"Model saved to: {model_path}")
```

