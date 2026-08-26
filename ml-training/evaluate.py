import torch
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

from model import DefectCNN
from dataset import test_loader


# =========================
# Device
# =========================

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("Using device:", device)


# =========================
# Load Model
# =========================

model = DefectCNN().to(device)

model.load_state_dict(
    torch.load(
        "saved_models/best_model.pth",
        map_location=device
    )
)

model.eval()

print("Model loaded successfully!")


# =========================
# Evaluation
# =========================

all_labels = []
all_predictions = []

with torch.no_grad():

    for images, labels in test_loader:

        images = images.to(device)

        outputs = model(images)

        _, predicted = torch.max(outputs, 1)

        all_labels.extend(labels.numpy())
        all_predictions.extend(predicted.cpu().numpy())


# =========================
# Metrics
# =========================

accuracy = accuracy_score(
    all_labels,
    all_predictions
)

precision = precision_score(
    all_labels,
    all_predictions,
    average="binary",
    zero_division=0
)

recall = recall_score(
    all_labels,
    all_predictions,
    average="binary",
    zero_division=0
)

f1 = f1_score(
    all_labels,
    all_predictions,
    average="binary",
    zero_division=0
)


# =========================
# Results
# =========================

print("\n========================================")
print("        FINAL MODEL EVALUATION")
print("========================================")

print(f"Accuracy  : {accuracy * 100:.2f}%")
print(f"Precision : {precision * 100:.2f}%")
print(f"Recall    : {recall * 100:.2f}%")
print(f"F1 Score  : {f1 * 100:.2f}%")

print("\n========================================")
print("        CONFUSION MATRIX")
print("========================================")

print(confusion_matrix(
    all_labels,
    all_predictions
))

print("\n========================================")
print("        CLASSIFICATION REPORT")
print("========================================")

print(classification_report(
    all_labels,
    all_predictions,
    zero_division=0
))