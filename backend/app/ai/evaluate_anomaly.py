import os

import torch
import torch.nn.functional as F

from PIL import Image
from torchvision import transforms

from app.ai.anomaly_model import AnomalyAutoencoder


# ==================================================
# Device
# ==================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ==================================================
# Load Model
# ==================================================

model = AnomalyAutoencoder().to(device)

model.load_state_dict(
    torch.load(
        "app/ai/saved_models/bottle_anomaly_model.pth",
        map_location=device
    )
)

model.eval()


# ==================================================
# Transform
# ==================================================

transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.ToTensor()
])


# ==================================================
# Calculate Reconstruction Error
# ==================================================

def reconstruction_error(image_path):

    image = Image.open(
        image_path
    ).convert("RGB")

    image = transform(image)

    image = image.unsqueeze(0).to(device)

    with torch.no_grad():

        reconstructed = model(image)

        error = F.mse_loss(
            reconstructed,
            image
        ).item()

    return error


# ==================================================
# Normal Validation Images
# ==================================================

normal_folder = (
    "dataset/mvtec_ad/"
    "bottle/test/good"
)

normal_errors = []

for filename in os.listdir(normal_folder):

    filepath = os.path.join(
        normal_folder,
        filename
    )

    if os.path.isfile(filepath):

        error = reconstruction_error(filepath)

        normal_errors.append(error)


# ==================================================
# Defective Images
# ==================================================

defective_folder = (
    "dataset/mvtec_ad/"
    "bottle/test"
)

defective_errors = []

for defect_type in os.listdir(defective_folder):

    if defect_type == "good":
        continue

    folder = os.path.join(
        defective_folder,
        defect_type
    )

    if not os.path.isdir(folder):
        continue

    for filename in os.listdir(folder):

        filepath = os.path.join(
            folder,
            filename
        )

        if os.path.isfile(filepath):

            error = reconstruction_error(filepath)

            defective_errors.append(error)


# ==================================================
# Results
# ==================================================

normal_average = (
    sum(normal_errors) / len(normal_errors)
)

defective_average = (
    sum(defective_errors) / len(defective_errors)
)


normal_max = max(normal_errors)

threshold = normal_max


print("\n" + "=" * 50)
print("VisionInspect AI - Anomaly Evaluation")
print("=" * 50)

print(
    f"Normal Images Tested     : "
    f"{len(normal_errors)}"
)

print(
    f"Defective Images Tested  : "
    f"{len(defective_errors)}"
)

print(
    f"Average Normal Error     : "
    f"{normal_average:.6f}"
)

print(
    f"Maximum Normal Error     : "
    f"{normal_max:.6f}"
)

print(
    f"Average Defective Error  : "
    f"{defective_average:.6f}"
)

print(
    f"Anomaly Threshold        : "
    f"{threshold:.6f}"
)


# ==================================================
# Classification Test
# ==================================================

normal_correct = sum(
    error <= threshold
    for error in normal_errors
)

defective_correct = sum(
    error > threshold
    for error in defective_errors
)


normal_accuracy = (
    100 * normal_correct / len(normal_errors)
)

defective_recall = (
    100 * defective_correct / len(defective_errors)
)


print("\n" + "=" * 50)
print("Detection Results")
print("=" * 50)

print(
    f"Normal Detection Accuracy : "
    f"{normal_accuracy:.2f}%"
)

print(
    f"Defective Detection Recall: "
    f"{defective_recall:.2f}%"
)