from pathlib import Path

import torch
import torch.nn as nn

from PIL import Image

from torchvision import (
    models,
    transforms,
)


# ============================================================
# VISIONINSPECT AI
# PRODUCT CATEGORY CLASSIFIER
# ============================================================

AI_DIR = Path(
    __file__
).resolve().parent


MODEL_PATH = (
    AI_DIR
    / "saved_models"
    / "product_category_resnet18.pth"
)


DEVICE = (
    torch.device(

        "cuda"
        if
        torch.cuda.is_available()

        else

        "cpu"
    )
)


IMAGENET_MEAN = [
    0.485,
    0.456,
    0.406,
]


IMAGENET_STD = [
    0.229,
    0.224,
    0.225,
]


TRANSFORM = (
    transforms.Compose(
        [

            transforms.Resize(
                (
                    224,
                    224,
                )
            ),

            transforms.ToTensor(),

            transforms.Normalize(
                mean=
                    IMAGENET_MEAN,

                std=
                    IMAGENET_STD,
            ),
        ]
    )
)


# ============================================================
# CACHE
# ============================================================

_model = None

_class_names = None


# ============================================================
# LOAD MODEL
# ============================================================

def load_product_classifier():

    global _model

    global _class_names


    if (
        _model
        is not None
    ):

        return (
            _model,
            _class_names,
        )


    if not MODEL_PATH.exists():

        raise FileNotFoundError(

            "Automatic product category model "
            "has not been trained yet.\n\n"

            f"Expected model:\n"
            f"{MODEL_PATH}\n\n"

            "Run:\n"

            "python -m "
            "app.ai.train_product_classifier"
        )


    checkpoint = (
        torch.load(

            MODEL_PATH,

            map_location=
                DEVICE,

            weights_only=
                False,
        )
    )


    class_names = (
        checkpoint[
            "class_names"
        ]
    )


    model = (
        models.resnet18(
            weights=None
        )
    )


    model.fc = (
        nn.Sequential(

            nn.Dropout(
                0.25
            ),

            nn.Linear(

                model.fc.in_features,

                len(
                    class_names
                ),
            ),
        )
    )


    state_dict = (
        checkpoint[
            "model_state_dict"
        ]
    )


    model.load_state_dict(
        state_dict
    )


    model = model.to(
        DEVICE
    )


    model.eval()


    _model = model

    _class_names = (
        class_names
    )


    print(

        "[VisionInspect AI] "

        "Loaded automatic "

        "product_category_resnet18.pth"
    )


    return (
        _model,
        _class_names,
    )


# ============================================================
# PREDICT CATEGORY
# ============================================================

@torch.inference_mode()
def predict_product_category(
    image_path
):

    model, class_names = (
        load_product_classifier()
    )


    image_path = Path(
        image_path
    )


    if not image_path.exists():

        raise FileNotFoundError(

            f"Image not found:\n"
            f"{image_path}"
        )


    with Image.open(
        image_path
    ) as image:

        image = image.convert(
            "RGB"
        )


        tensor = (
            TRANSFORM(
                image
            )
            .unsqueeze(
                0
            )
            .to(
                DEVICE
            )
        )


    logits = model(
        tensor
    )


    probabilities = (
        torch.softmax(
            logits,
            dim=1,
        )[0]
    )


    confidence, index = (
        torch.max(
            probabilities,
            dim=0,
        )
    )


    category_index = int(
        index.item()
    )


    category = (
        class_names[
            category_index
        ]
    )


    confidence = (

        float(
            confidence.item()
        )

        * 100
    )


    ranked_indices = (
        torch.argsort(
            probabilities,
            descending=True,
        )
    )


    top_predictions = []


    for index in (
        ranked_indices[:5]
    ):

        index = int(
            index.item()
        )


        top_predictions.append(
            {

                "category":
                    class_names[
                        index
                    ],

                "confidence":
                    round(

                        float(
                            probabilities[
                                index
                            ].item()
                        )

                        * 100,

                        2,
                    ),
            }
        )


    return {

        "category":
            category,

        "confidence":
            round(
                confidence,
                2,
            ),

        "top_predictions":
            top_predictions,

        "routing":
            "automatic_category_classifier",
    }