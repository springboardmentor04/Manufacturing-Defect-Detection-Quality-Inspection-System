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


# ==========================================================
# DEVICE
# ==========================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ==========================================================
# SETTINGS
# ==========================================================

MODEL_PATH = "app/ai/saved_models/best_model.pth"


# ==========================================================
# HEADER
# ==========================================================

print("\n" + "=" * 65)
print("VISIONINSPECT AI - MODEL VALIDATION")
print("=" * 65)

print(f"Device      : {device}")
print(f"Model       : {MODEL_PATH}")


# ==========================================================
# LOAD VALIDATION DATA
# ==========================================================

print("\nLoading validation dataset...")

(
    train_loader,
    val_loader,
    normal_count,
    defect_count
) = get_dataloaders(
    batch_size=64
)


# ==========================================================
# LOAD MODEL
# ==========================================================

print("\nLoading trained model...")

model = CustomCNN().to(device)

model.load_state_dict(
    torch.load(
        MODEL_PATH,
        map_location=device
    )
)

model.eval()


# ==========================================================
# EVALUATION
# ==========================================================

all_labels = []
all_predictions = []

correct = 0
total = 0


print("\nRunning validation...")
print("-" * 65)


with torch.no_grad():

    for images, labels in val_loader:

        images = images.to(device)
        labels = labels.to(device)

        outputs = model(images)

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

        total += labels.size(0)

        correct += (
            predictions == labels
        ).sum().item()


# ==========================================================
# METRICS
# ==========================================================

accuracy = accuracy_score(
    all_labels,
    all_predictions
)

precision = precision_score(
    all_labels,
    all_predictions,
    pos_label=1,
    zero_division=0
)

recall = recall_score(
    all_labels,
    all_predictions,
    pos_label=1,
    zero_division=0
)

f1 = f1_score(
    all_labels,
    all_predictions,
    pos_label=1,
    zero_division=0
)


# ==========================================================
# CONFUSION MATRIX
# ==========================================================

cm = confusion_matrix(
    all_labels,
    all_predictions,
    labels=[0, 1]
)

true_normal = cm[0][0]
false_defect = cm[0][1]
false_normal = cm[1][0]
true_defect = cm[1][1]


# ==========================================================
# RESULTS
# ==========================================================

print("\n" + "=" * 65)
print("MODEL VALIDATION RESULTS")
print("=" * 65)

print(f"\nValidation Samples : {total}")

print("\nClassification Metrics")
print("-" * 65)

print(
    f"Accuracy           : {accuracy * 100:.2f}%"
)

print(
    f"Precision          : {precision * 100:.2f}%"
)

print(
    f"Recall             : {recall * 100:.2f}%"
)

print(
    f"F1 Score           : {f1 * 100:.2f}%"
)


# ==========================================================
# CONFUSION MATRIX
# ==========================================================

print("\n" + "=" * 65)
print("CONFUSION MATRIX")
print("=" * 65)

print("\n                 Predicted")
print("                 Normal  Defective")
print(
    f"Actual Normal    {true_normal:6d}  {false_defect:9d}"
)
print(
    f"Actual Defective {false_normal:6d}  {true_defect:9d}"
)


# ==========================================================
# CLASSIFICATION REPORT
# ==========================================================

print("\n" + "=" * 65)
print("CLASSIFICATION REPORT")
print("=" * 65)

print(
    classification_report(
        all_labels,
        all_predictions,
        labels=[0, 1],
        target_names=[
            "Normal",
            "Defective"
        ],
        zero_division=0
    )
)


# ==========================================================
# INTERPRETATION
# ==========================================================

print("=" * 65)
print("MODEL INTERPRETATION")
print("=" * 65)

print(
    f"\nCorrect Predictions : {correct}"
)

print(
    f"Incorrect Predictions: {total - correct}"
)

print(
    f"\nNormal Correctly Detected : {true_normal}"
)

print(
    f"Normal Incorrectly Marked : {false_defect}"
)

print(
    f"Defects Correctly Detected: {true_defect}"
)

print(
    f"Defects Missed             : {false_normal}"
)

print("\n" + "=" * 65)
print("VALIDATION COMPLETED")
print("=" * 65)