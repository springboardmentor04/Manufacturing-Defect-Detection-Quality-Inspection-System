from pathlib import Path
import sys

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


# ============================================================
# CONFIG
# ============================================================

IMAGE_SIZE = 224

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

BACKEND_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    BACKEND_DIR
    / "app"
    / "ai"
    / "saved_models"
    / "cable_resnet18.pth"
)


CLASS_NAMES = [
    "good",
    "bent_wire",
    "cable_swap",
    "combined",
    "cut_inner_insulation",
    "cut_outer_insulation",
    "missing_cable",
    "missing_wire",
    "poke_insulation",
]


# ============================================================
# TRANSFORM
# ============================================================

transform = transforms.Compose([
    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
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
    ),
])


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            f"\nModel not found:\n{MODEL_PATH}\n"
        )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=False
    )

    # --------------------------------------------------------
    # Create ImageNet ResNet18
    # --------------------------------------------------------

    model = models.resnet18(
        weights=None
    )

    # --------------------------------------------------------
    # Same classifier used during training
    # --------------------------------------------------------

    in_features = model.fc.in_features

    model.fc = nn.Sequential(
        nn.Dropout(
            p=0.30
        ),

        nn.Linear(
            in_features,
            len(CLASS_NAMES)
        )
    )

    # --------------------------------------------------------
    # Load trained weights
    # --------------------------------------------------------

    state_dict = checkpoint[
        "model_state_dict"
    ]

    model.load_state_dict(
        state_dict
    )

    model = model.to(
        DEVICE
    )

    model.eval()

    return model, checkpoint


# ============================================================
# PREDICT
# ============================================================

def predict(
    model,
    image_path
):

    image_path = Path(
        image_path
    )

    if not image_path.exists():

        raise FileNotFoundError(
            f"\nImage not found:\n{image_path}\n"
        )

    image = Image.open(
        image_path
    ).convert("RGB")

    tensor = transform(
        image
    ).unsqueeze(0)

    tensor = tensor.to(
        DEVICE
    )


    with torch.no_grad():

        output = model(
            tensor
        )

        probabilities = torch.softmax(
            output,
            dim=1
        )[0]


    confidence, prediction = (
        torch.max(
            probabilities,
            dim=0
        )
    )


    predicted_index = (
        int(prediction.item())
    )

    predicted_class = (
        CLASS_NAMES[predicted_index]
    )

    predicted_confidence = (
        float(confidence.item())
    )


    # --------------------------------------------------------
    # Sort all predictions
    # --------------------------------------------------------

    ranked = sorted(
        [
            (
                CLASS_NAMES[i],
                float(probabilities[i].item())
            )

            for i in range(
                len(CLASS_NAMES)
            )
        ],

        key=lambda x: x[1],

        reverse=True
    )


    return (
        predicted_class,
        predicted_confidence,
        ranked
    )


# ============================================================
# MAIN
# ============================================================

def main():

    if len(sys.argv) < 2:

        print()
        print(
            "Usage:"
        )

        print()

        print(
            "python -m "
            "app.ai.test_resnet18_prediction "
            "\"path/to/image.png\""
        )

        print()

        sys.exit(1)


    image_path = sys.argv[1]


    print()
    print("=" * 80)
    print("VISIONINSPECT AI")
    print("RESNET18 DEFECT PREDICTION TEST")
    print("=" * 80)

    print(
        f"Device : {DEVICE}"
    )

    print(
        f"Model  : {MODEL_PATH.name}"
    )

    print(
        "Backbone : ImageNet ResNet18"
    )

    print(
        "Training : Transfer Learning"
    )

    print("=" * 80)


    # --------------------------------------------------------
    # Load
    # --------------------------------------------------------

    print()
    print(
        "Loading model..."
    )

    model, checkpoint = load_model()

    print(
        "✓ Model loaded"
    )


    # --------------------------------------------------------
    # Predict
    # --------------------------------------------------------

    print()
    print(
        "Running inference..."
    )

    (
        predicted_class,
        confidence,
        ranked
    ) = predict(
        model,
        image_path
    )


    # --------------------------------------------------------
    # Result
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("PREDICTION RESULT")
    print("=" * 80)

    print()
    print(
        f"Image          : "
        f"{Path(image_path).name}"
    )

    print(
        f"Prediction     : "
        f"{predicted_class}"
    )

    print(
        f"Confidence     : "
        f"{confidence * 100:.2f}%"
    )


    # --------------------------------------------------------
    # GOOD / DEFECT DECISION
    # --------------------------------------------------------

    if predicted_class == "good":

        print(
            "Status         : PASS"
        )

        print(
            "Defect type    : None"
        )

    else:

        print(
            "Status         : DEFECT"
        )

        print(
            f"Defect type    : "
            f"{predicted_class}"
        )


    # --------------------------------------------------------
    # Top predictions
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("TOP PREDICTIONS")
    print("=" * 80)

    for rank, (
        class_name,
        probability
    ) in enumerate(
        ranked[:9],
        start=1
    ):

        print(
            f"{rank:02d}. "
            f"{class_name:<30} "
            f"{probability * 100:7.2f}%"
        )


    # --------------------------------------------------------
    # Model metadata
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("MODEL INFORMATION")
    print("=" * 80)

    print(
        f"Architecture : "
        f"{checkpoint.get('architecture', 'N/A')}"
    )

    print(
        f"Pretrained   : "
        f"{checkpoint.get('pretrained', 'N/A')}"
    )

    print(
        f"ImageNet     : "
        f"{checkpoint.get('imagenet', 'N/A')}"
    )

    print(
        f"Fine-tuned   : "
        f"{checkpoint.get('fine_tuned', 'N/A')}"
    )

    print(
        f"Best epoch   : "
        f"{checkpoint.get('best_epoch', 'N/A')}"
    )

    print()
    print("=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)
    print()


if __name__ == "__main__":

    main()