import torch
import numpy as np

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)

from app.ai.model import CustomCNN
from app.ai.dataloader import get_dataloaders


# ==========================================================
# SETTINGS
# ==========================================================

MODEL_PATH = "app/ai/saved_models/improved_model.pth"

THRESHOLDS = [
    0.50,
    0.55,
    0.60,
    0.65,
    0.70,
    0.75,
    0.80
]

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ==========================================================
# HEADER
# ==========================================================

print("=" * 70)
print("VISIONINSPECT AI - THRESHOLD EVALUATION")
print("=" * 70)

print(f"Device: {device}")
print(f"Model : {MODEL_PATH}")


# ==========================================================
# LOAD DATASET
# ==========================================================

print("\nLoading validation dataset...")

_, val_loader, _, _ = get_dataloaders(
    batch_size=16
)


# ==========================================================
# LOAD MODEL
# ==========================================================

model = CustomCNN().to(device)

model.load_state_dict(
    torch.load(
        MODEL_PATH,
        map_location=device
    )
)

model.eval()

print("Model loaded successfully.")


# ==========================================================
# COLLECT PROBABILITIES
# ==========================================================

all_labels = []
all_probabilities = []


print("\nRunning validation inference...")

with torch.no_grad():

    for images, labels in val_loader:

        images = images.to(device)

        outputs = model(images)

        probabilities = torch.softmax(
            outputs,
            dim=1
        )[:, 1]

        all_labels.extend(
            labels.numpy()
        )

        all_probabilities.extend(
            probabilities.cpu().numpy()
        )


all_labels = np.array(all_labels)
all_probabilities = np.array(all_probabilities)


# ==========================================================
# THRESHOLD TESTING
# ==========================================================

print("\n" + "=" * 70)
print("THRESHOLD RESULTS")
print("=" * 70)

print(
    f"{'Threshold':<12}"
    f"{'Accuracy':<12}"
    f"{'Precision':<12}"
    f"{'Recall':<12}"
    f"{'F1':<12}"
)

print("-" * 70)


best_threshold = None
best_f1 = -1


for threshold in THRESHOLDS:

    predictions = (
        all_probabilities >= threshold
    ).astype(int)

    accuracy = accuracy_score(
        all_labels,
        predictions
    )

    precision = precision_score(
        all_labels,
        predictions,
        pos_label=1,
        zero_division=0
    )

    recall = recall_score(
        all_labels,
        predictions,
        pos_label=1,
        zero_division=0
    )

    f1 = f1_score(
        all_labels,
        predictions,
        pos_label=1,
        zero_division=0
    )

    print(
        f"{threshold:<12.2f}"
        f"{accuracy * 100:<12.2f}"
        f"{precision * 100:<12.2f}"
        f"{recall * 100:<12.2f}"
        f"{f1 * 100:<12.2f}"
    )

    if f1 > best_f1:

        best_f1 = f1
        best_threshold = threshold


# ==========================================================
# BEST THRESHOLD
# ==========================================================

best_predictions = (
    all_probabilities >= best_threshold
).astype(int)


best_accuracy = accuracy_score(
    all_labels,
    best_predictions
)

best_precision = precision_score(
    all_labels,
    best_predictions,
    pos_label=1,
    zero_division=0
)

best_recall = recall_score(
    all_labels,
    best_predictions,
    pos_label=1,
    zero_division=0
)


# ==========================================================
# CONFUSION MATRIX
# ==========================================================

cm = confusion_matrix(
    all_labels,
    best_predictions
)


print("\n" + "=" * 70)
print("BEST THRESHOLD")
print("=" * 70)

print(
    f"Threshold : {best_threshold:.2f}"
)

print(
    f"Accuracy  : {best_accuracy * 100:.2f}%"
)

print(
    f"Precision : {best_precision * 100:.2f}%"
)

print(
    f"Recall    : {best_recall * 100:.2f}%"
)

print(
    f"F1 Score  : {best_f1 * 100:.2f}%"
)

print("\nConfusion Matrix:")
print(cm)

print("=" * 70)