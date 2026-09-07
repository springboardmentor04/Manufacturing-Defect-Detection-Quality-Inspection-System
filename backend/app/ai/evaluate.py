import torch

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

from app.ai.model import CustomCNN
from app.ai.dataloader import get_dataloaders


# ==========================================
# DEVICE
# ==========================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ==========================================
# LOAD MODEL
# ==========================================

model = CustomCNN().to(device)

model.load_state_dict(
    torch.load(
        "app/ai/saved_models/best_model.pth",
        map_location=device
    )
)

model.eval()


# ==========================================
# LOAD VALIDATION DATA
# ==========================================

_, val_loader, _, _ = get_dataloaders(
    batch_size=32
)


# ==========================================
# PREDICTIONS
# ==========================================

all_labels = []
all_predictions = []


with torch.no_grad():

    for images, labels in val_loader:

        images = images.to(device)

        outputs = model(images)

        _, predictions = torch.max(
            outputs,
            1
        )

        all_labels.extend(
            labels.tolist()
        )

        all_predictions.extend(
            predictions.cpu().tolist()
        )


# ==========================================
# METRICS
# ==========================================

accuracy = accuracy_score(
    all_labels,
    all_predictions
)

precision = precision_score(
    all_labels,
    all_predictions,
    zero_division=0
)

recall = recall_score(
    all_labels,
    all_predictions,
    zero_division=0
)

f1 = f1_score(
    all_labels,
    all_predictions,
    zero_division=0
)


# ==========================================
# CONFUSION MATRIX
# ==========================================

matrix = confusion_matrix(
    all_labels,
    all_predictions
)


# ==========================================
# RESULTS
# ==========================================

print("\n" + "=" * 60)

print(
    "VisionInspect AI - Model Evaluation"
)

print("=" * 60)


print(
    f"\nAccuracy  : "
    f"{accuracy * 100:.2f}%"
)

print(
    f"Precision : "
    f"{precision * 100:.2f}%"
)

print(
    f"Recall    : "
    f"{recall * 100:.2f}%"
)

print(
    f"F1 Score  : "
    f"{f1 * 100:.2f}%"
)


print("\n" + "-" * 60)

print("Confusion Matrix")

print("-" * 60)

print(matrix)


print("\n" + "-" * 60)

print("Classification Report")

print("-" * 60)

print(
    classification_report(
        all_labels,
        all_predictions,
        target_names=[
            "Normal",
            "Defective"
        ],
        zero_division=0
    )
)


print("=" * 60)