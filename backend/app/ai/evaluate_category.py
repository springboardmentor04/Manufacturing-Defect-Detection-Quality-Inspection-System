import os
import json
import torch
import numpy as np
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

from app.ai.category_model import CategoryCNN
from app.ai.category_dataloader import MVTecCategoryDataset
from app.ai.category_split import create_stratified_category_split


# ============================================================
# CONFIGURATION
# ============================================================

SEED = 42
BATCH_SIZE = 32
IMAGE_SIZE = 256
NUM_CLASSES = 15

MODEL_PATH = "app/ai/saved_models/category_model.pth"
RESULTS_DIR = "app/ai/evaluation_results"

os.makedirs(RESULTS_DIR, exist_ok=True)

torch.manual_seed(SEED)
np.random.seed(SEED)

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# CATEGORY NAMES
# ============================================================

CATEGORIES = [
    "bottle",
    "cable",
    "capsule",
    "carpet",
    "grid",
    "hazelnut",
    "leather",
    "metal_nut",
    "pill",
    "screw",
    "tile",
    "toothbrush",
    "transistor",
    "wood",
    "zipper"
]


# ============================================================
# VALIDATION TRANSFORM
# ============================================================

val_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# ============================================================
# CUSTOM VALIDATION DATASET
# ============================================================

class CategoryValidationDataset(Dataset):

    def __init__(self, samples, transform=None):

        self.samples = samples
        self.transform = transform

    def __len__(self):

        return len(self.samples)

    def __getitem__(self, index):

        sample = self.samples[index]

        image = Image.open(
            sample["image_path"]
        ).convert("RGB")

        if self.transform:

            image = self.transform(image)

        label = sample["category_index"]

        return image, label


# ============================================================
# START
# ============================================================

print("=" * 70)
print("VISIONINSPECT AI - CATEGORY MODEL EVALUATION")
print("=" * 70)

print(f"\nDevice: {DEVICE}")
print(f"Model: {MODEL_PATH}")


# ============================================================
# LOAD ORIGINAL DATASET
# ============================================================

print("\nCreating validation split...")

dataset = MVTecCategoryDataset(
    transform=val_transform
)

train_samples, val_samples = create_stratified_category_split(
    dataset
)

print(f"Training samples: {len(train_samples)}")
print(f"Validation samples: {len(val_samples)}")


# ============================================================
# VALIDATION DATASET
# ============================================================

val_dataset = CategoryValidationDataset(
    samples=val_samples,
    transform=val_transform
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0
)

print(
    f"Validation loader samples: {len(val_dataset)}"
)


# ============================================================
# LOAD MODEL
# ============================================================

print("\nLoading category model...")

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE
)

model = CategoryCNN(
    num_classes=NUM_CLASSES
)

if (
    isinstance(checkpoint, dict)
    and "model_state_dict" in checkpoint
):

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

else:

    model.load_state_dict(checkpoint)

model.to(DEVICE)
model.eval()

print("Model loaded successfully.")


# ============================================================
# EVALUATION
# ============================================================

all_predictions = []
all_labels = []

total = 0
correct = 0

print("\nRunning evaluation...")

with torch.no_grad():

    for images, labels in val_loader:

        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        outputs = model(images)

        predictions = torch.argmax(
            outputs,
            dim=1
        )

        correct += (
            predictions == labels
        ).sum().item()

        total += labels.size(0)

        all_predictions.extend(
            predictions.cpu().numpy()
        )

        all_labels.extend(
            labels.cpu().numpy()
        )


# ============================================================
# CONVERT TO NUMPY
# ============================================================

all_labels = np.array(
    all_labels
)

all_predictions = np.array(
    all_predictions
)


# ============================================================
# OVERALL METRICS
# ============================================================

accuracy = accuracy_score(
    all_labels,
    all_predictions
)

precision = precision_score(
    all_labels,
    all_predictions,
    average="weighted",
    zero_division=0
)

recall = recall_score(
    all_labels,
    all_predictions,
    average="weighted",
    zero_division=0
)

f1 = f1_score(
    all_labels,
    all_predictions,
    average="weighted",
    zero_division=0
)


# ============================================================
# OVERALL RESULTS
# ============================================================

print("\n" + "=" * 70)
print("OVERALL RESULTS")
print("=" * 70)

print(
    f"Validation Samples : {total}"
)

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


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

print("\n" + "=" * 70)
print("PER-CATEGORY CLASSIFICATION REPORT")
print("=" * 70)

report = classification_report(
    all_labels,
    all_predictions,
    labels=list(range(NUM_CLASSES)),
    target_names=CATEGORIES,
    digits=4,
    zero_division=0
)

print(report)


# ============================================================
# CONFUSION MATRIX
# ============================================================

cm = confusion_matrix(
    all_labels,
    all_predictions,
    labels=list(range(NUM_CLASSES))
)

print("=" * 70)
print("CONFUSION MATRIX")
print("=" * 70)

print("\nRows = Actual")
print("Columns = Predicted\n")

print(
    f"{'Actual':<18}",
    end=""
)

for category in CATEGORIES:

    print(
        f"{category[:8]:>9}",
        end=""
    )

print()

for i, category in enumerate(CATEGORIES):

    print(
        f"{category[:16]:<18}",
        end=""
    )

    for j in range(NUM_CLASSES):

        print(
            f"{cm[i][j]:>9}",
            end=""
        )

    print()


# ============================================================
# PER-CATEGORY ACCURACY
# ============================================================

print("\n" + "=" * 70)
print("PER-CATEGORY ACCURACY")
print("=" * 70)

category_results = {}

for i, category in enumerate(CATEGORIES):

    total_category = cm[i].sum()

    correct_category = cm[i][i]

    if total_category > 0:

        category_accuracy = (
            correct_category /
            total_category
        )

    else:

        category_accuracy = 0.0

    category_results[category] = {
        "samples": int(total_category),
        "correct": int(correct_category),
        "accuracy": round(
            category_accuracy * 100,
            2
        )
    }

    print(
        f"{category:<15}"
        f"{correct_category:>4}/"
        f"{total_category:<4}"
        f"{category_accuracy * 100:>7.2f}%"
    )


# ============================================================
# SAVE RESULTS
# ============================================================

results = {

    "model": MODEL_PATH,

    "device": str(DEVICE),

    "validation_samples": int(total),

    "overall": {

        "accuracy": round(
            accuracy * 100,
            2
        ),

        "precision": round(
            precision * 100,
            2
        ),

        "recall": round(
            recall * 100,
            2
        ),

        "f1_score": round(
            f1 * 100,
            2
        )
    },

    "categories": category_results,

    "confusion_matrix": cm.tolist()
}


results_path = os.path.join(
    RESULTS_DIR,
    "category_evaluation.json"
)


with open(
    results_path,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        results,
        file,
        indent=4
    )


# ============================================================
# FINAL
# ============================================================

print("\n" + "=" * 70)
print("EVALUATION COMPLETE")
print("=" * 70)

print("\nResults saved to:")

print(results_path)

print(
    "\nCategory model evaluation "
    "finished successfully."
)