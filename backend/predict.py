from pathlib import Path

import torch
import torch.nn as nn

from torchvision import models, transforms

from PIL import Image


# ============================================================
# MODEL PATH
# ============================================================

MODEL_PATH = (
    Path(__file__).parent
    / "models"
    / "defect_classifier_resnet18_best.pth"
)


# ============================================================
# DEVICE
# ============================================================

device = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

print(f"ResNet18 Prediction Device: {device}")


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

transform = transforms.Compose([

    transforms.Resize(
        (224, 224)
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[
            0.485,
            0.456,
            0.406
        ],

        std=[
            0.229,
            0.224,
            0.225
        ]
    )
])


# ============================================================
# CREATE RESNET18
# ============================================================

model = models.resnet18(
    weights=None
)


# ============================================================
# MODEL ARCHITECTURE
# ============================================================

for param in model.parameters():

    param.requires_grad = False


for param in model.layer3.parameters():

    param.requires_grad = True


for param in model.layer4.parameters():

    param.requires_grad = True


model.fc = nn.Sequential(

    nn.Linear(
        model.fc.in_features,
        256
    ),

    nn.BatchNorm1d(256),

    nn.ReLU(
        inplace=True
    ),

    nn.Dropout(0.35),

    nn.Linear(
        256,
        2
    )
)


# ============================================================
# LOAD TRAINED MODEL
# ============================================================

if not MODEL_PATH.exists():

    raise FileNotFoundError(
        f"Model not found: {MODEL_PATH}"
    )


checkpoint = torch.load(
    MODEL_PATH,
    map_location=device
)


# Support both checkpoint formats

if isinstance(checkpoint, dict):

    if "model_state_dict" in checkpoint:

        model.load_state_dict(
            checkpoint["model_state_dict"]
        )

    else:

        model.load_state_dict(
            checkpoint

        )

else:

    model.load_state_dict(
        checkpoint
    )


model = model.to(device)

model.eval()


# ============================================================
# CLASS ORDER
# ============================================================

CLASS_NAMES = [
    "GOOD",
    "DEFECT"
]


# ============================================================
# PREDICT IMAGE
# ============================================================

def predict_image(image_path):

    image = Image.open(
        image_path
    ).convert("RGB")


    image_tensor = transform(
        image
    )


    image_tensor = image_tensor.unsqueeze(
        0
    )


    image_tensor = image_tensor.to(
        device
    )


    with torch.no_grad():

        outputs = model(
            image_tensor
        )


        probabilities = torch.softmax(
            outputs,
            dim=1
        )


        confidence, predicted = torch.max(
            probabilities,
            dim=1
        )


    predicted_class = CLASS_NAMES[
        predicted.item()
    ]


    confidence_value = (
        confidence.item() * 100
    )


    # --------------------------------------------------------
    # Convert model output to application's PASS / FAIL
    # --------------------------------------------------------

    if predicted_class == "GOOD":

        prediction = "PASS"

    else:

        prediction = "FAIL"


    return {

        "prediction": prediction,

        "confidence": round(
            confidence_value,
            2
        )

    }


# ============================================================
# DIRECT TEST
# ============================================================

if __name__ == "__main__":

    test_image = (
        Path(__file__).parent.parent
        / "processed_dataset"
        / "screw"
        / "test"
        / "good"
        / "000.png"
    )


    if test_image.exists():

        result = predict_image(
            test_image
        )

        print(
            "\nPrediction Result"
        )

        print(
            "================="
        )

        print(
            "Prediction :",
            result["prediction"]
        )

        print(
            "Confidence :",
            result["confidence"],
            "%"
        )

    else:

        print(
            f"Test image not found: {test_image}"
        )