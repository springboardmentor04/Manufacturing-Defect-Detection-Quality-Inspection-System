import torch

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score
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
# COLLECT PROBABILITIES
# ==========================================

all_labels = []
all_probabilities = []


with torch.no_grad():

    for images, labels in val_loader:

        images = images.to(device)

        outputs = model(images)

        probabilities = torch.softmax(
            outputs,
            dim=1
        )

        defective_probability = (
            probabilities[:, 1]
            .cpu()
            .tolist()
        )

        all_probabilities.extend(
            defective_probability
        )

        all_labels.extend(
            labels.tolist()
        )


# ==========================================
# TEST THRESHOLDS
# ==========================================

thresholds = [
    0.30,
    0.35,
    0.40,
    0.45,
    0.50,
    0.55,
    0.60,
    0.65,
    0.70,
    0.75,
    0.80,
    0.85,
    0.90
]


best_threshold = 0.50
best_f1 = 0.0


print("\n" + "=" * 80)

print(
    "VisionInspect AI - Threshold Optimization"
)

print("=" * 80)


print(
    "\nThreshold | Accuracy | Precision | Recall | F1"
)

print("-" * 60)


for threshold in thresholds:

    predictions = [

        1
        if probability >= threshold
        else 0

        for probability
        in all_probabilities
    ]


    accuracy = accuracy_score(
        all_labels,
        predictions
    )

    precision = precision_score(
        all_labels,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        all_labels,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        all_labels,
        predictions,
        zero_division=0
    )


    print(
        f"{threshold:8.2f} | "
        f"{accuracy * 100:8.2f}% | "
        f"{precision * 100:9.2f}% | "
        f"{recall * 100:6.2f}% | "
        f"{f1 * 100:6.2f}%"
    )


    # ======================================
    # BEST THRESHOLD
    # ======================================

    if f1 > best_f1:

        best_f1 = f1

        best_threshold = threshold


# ==========================================
# FINAL RESULT
# ==========================================

print("\n" + "=" * 80)

print(
    f"Best Threshold : "
    f"{best_threshold:.2f}"
)

print(
    f"Best F1 Score  : "
    f"{best_f1 * 100:.2f}%"
)

print("=" * 80)