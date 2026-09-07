# ============================================================
# VISIONINSPECT AI
# PRODUCTION RESNET18 PREDICTION ENGINE
#
# IMPORTANT:
# - Uses trained category-specific ResNet18 checkpoints.
# - Does NOT compare softmax confidence across independent
#   category models.
# - Supports multiple historical checkpoint head formats.
# - Supports checkpoints saved with "backbone." prefixes.
# - Capsule architecture is handled explicitly.
# ============================================================

from pathlib import Path
from typing import Optional

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image, ImageFile

from app.ai.quality_assessment import calculate_quality_assessment


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_DIR = (
    BASE_DIR
    / "saved_models"
)

IMAGE_SIZE = 224

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

ImageFile.LOAD_TRUNCATED_IMAGES = True


# ============================================================
# CATEGORIES
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
    "zipper",
]


# ============================================================
# DEFECT CLASSES
# ============================================================

DEFECT_CLASSES = {

    "bottle": [
        "good",
        "broken_large",
        "broken_small",
        "contamination",
    ],

    "cable": [
        "good",
        "bent_wire",
        "cable_swap",
        "combined",
        "cut_inner_insulation",
        "cut_outer_insulation",
        "missing_wire",
        "missing_cable",
        "poke_insulation",
    ],

    "capsule": [
        "good",
        "crack",
        "faulty_imprint",
        "poke",
        "scratch",
        "squeeze",
    ],

    "carpet": [
        "good",
        "color",
        "cut",
        "hole",
        "metal_contamination",
        "thread",
    ],

    "grid": [
        "good",
        "bent",
        "broken",
        "glue",
        "metal_contamination",
        "thread",
    ],

    "hazelnut": [
        "good",
        "crack",
        "cut",
        "hole",
        "print",
    ],

    "leather": [
        "good",
        "color",
        "cut",
        "fold",
        "glue",
        "poke",
    ],

    "metal_nut": [
        "good",
        "bent",
        "color",
        "flip",
        "scratch",
    ],

    "pill": [
        "good",
        "color",
        "combined",
        "contamination",
        "crack",
        "faulty_imprint",
        "pill_type",
        "scratch",
    ],

    "screw": [
        "good",
        "manipulated_front",
        "scratch_head",
        "scratch_neck",
        "thread_side",
        "thread_top",
    ],

    "tile": [
        "good",
        "crack",
        "glue_strip",
        "gray_stroke",
        "oil",
        "rough",
    ],

    "toothbrush": [
        "good",
        "defective",
    ],

    "transistor": [
        "good",
        "bent_lead",
        "cut_lead",
        "damaged_case",
        "misplaced",
    ],

    "wood": [
        "good",
        "color",
        "combined",
        "hole",
        "liquid",
        "scratch",
    ],

    "zipper": [
        "good",
        "broken_teeth",
        "combined",
        "fabric_border",
        "fabric_interior",
        "rough",
        "split_teeth",
        "squeezed_teeth",
    ],
}


# ============================================================
# IMAGENET TRANSFORM
# ============================================================

TRANSFORM = transforms.Compose([
    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[
            0.485,
            0.456,
            0.406,
        ],
        std=[
            0.229,
            0.224,
            0.225,
        ],
    ),
])


# ============================================================
# MODEL CACHE
# ============================================================

MODEL_CACHE = {}

MODEL_METADATA = {}


# ============================================================
# CHECKPOINT HELPERS
# ============================================================

def extract_state_dict(checkpoint):

    if isinstance(checkpoint, dict):

        if "model_state_dict" in checkpoint:
            return checkpoint[
                "model_state_dict"
            ]

        if "state_dict" in checkpoint:
            return checkpoint[
                "state_dict"
            ]

        if "model" in checkpoint:

            model_value = checkpoint[
                "model"
            ]

            if isinstance(
                model_value,
                dict
            ):
                return model_value

        return checkpoint

    return checkpoint


def clean_state_dict(
    state_dict
):
    """
    Normalizes common checkpoint
    prefixes.

    Supports:
        module.
        backbone.
        module.backbone.
    """

    cleaned = {}

    for key, value in state_dict.items():

        new_key = key

        if new_key.startswith(
            "module."
        ):
            new_key = new_key[
                len("module.") :
            ]

        if new_key.startswith(
            "backbone."
        ):
            new_key = new_key[
                len("backbone.") :
            ]

        cleaned[
            new_key
        ] = value

    return cleaned


# ============================================================
# ARCHITECTURE DETECTION
# ============================================================

def detect_head_architecture(
    state_dict,
    number_of_classes
):
    """
    Detect the classifier architecture
    from checkpoint keys.

    Supported:

    A:
        fc = Dropout -> Linear(512, classes)

    B:
        fc = Linear(512, hidden)
             ReLU
             Dropout
             Linear(hidden, classes)

    C:
        fc = Dropout
             Linear(512, 256)
             BatchNorm1d
             ReLU
             Dropout
             Linear(256, classes)

    D:
        fc = Linear(512, 256)
             ReLU
             Dropout
             Linear(256, classes)
    """

    keys = set(
        state_dict.keys()
    )

    # --------------------------------------------------------
    # C - Capsule architecture
    # --------------------------------------------------------

    if (
        "fc.1.weight" in keys
        and
        "fc.3.weight" in keys
        and
        "fc.5.weight" in keys
    ):

        return "capsule"


    # --------------------------------------------------------
    # B / D - hidden-layer architecture
    # --------------------------------------------------------

    if (
        "fc.0.weight" in keys
        and
        "fc.3.weight" in keys
    ):

        fc0 = state_dict[
            "fc.0.weight"
        ]

        fc3 = state_dict[
            "fc.3.weight"
        ]

        if (
            fc0.ndim == 2
            and
            fc3.ndim == 2
            and
            fc0.shape[1] == 512
            and
            fc3.shape[0]
            == number_of_classes
        ):

            return "hidden"


    # --------------------------------------------------------
    # A - direct classifier
    # --------------------------------------------------------

    if (
        "fc.1.weight" in keys
        and
        "fc.1.bias" in keys
    ):

        fc1 = state_dict[
            "fc.1.weight"
        ]

        if (
            fc1.ndim == 2
            and
            fc1.shape[1] == 512
            and
            fc1.shape[0]
            == number_of_classes
        ):

            return "direct"


    # --------------------------------------------------------
    # Raw Linear head
    # --------------------------------------------------------

    if (
        "fc.weight" in keys
        and
        "fc.bias" in keys
    ):

        fc = state_dict[
            "fc.weight"
        ]

        if (
            fc.ndim == 2
            and
            fc.shape[1] == 512
            and
            fc.shape[0]
            == number_of_classes
        ):

            return "raw"


    return None


# ============================================================
# MODEL BUILDER
# ============================================================

def build_model_from_state_dict(
    state_dict,
    number_of_classes
):

    architecture = detect_head_architecture(
        state_dict,
        number_of_classes
    )

    if architecture is None:

        raise RuntimeError(
            "Unable to determine ResNet18 "
            "classifier architecture."
        )


    # ========================================================
    # BASE RESNET18
    # ========================================================

    model = models.resnet18(
        weights=None
    )


    # ========================================================
    # CAPSULE
    #
    # Dropout
    # Linear 512 -> 256
    # BatchNorm
    # ReLU
    # Dropout
    # Linear 256 -> classes
    # ========================================================

    if architecture == "capsule":

        hidden_features = (
            state_dict[
                "fc.1.weight"
            ].shape[0]
        )

        output_features = (
            state_dict[
                "fc.5.weight"
            ].shape[0]
        )

        if output_features != number_of_classes:

            raise RuntimeError(
                "Capsule checkpoint output "
                "dimension does not match "
                "class count."
            )

        model.fc = nn.Sequential(

            nn.Dropout(
                p=0.30
            ),

            nn.Linear(
                512,
                hidden_features
            ),

            nn.BatchNorm1d(
                hidden_features
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                p=0.20
            ),

            nn.Linear(
                hidden_features,
                number_of_classes
            ),
        )

        return model


    # ========================================================
    # HIDDEN-LAYER ARCHITECTURE
    # ========================================================

    if architecture == "hidden":

        hidden_features = (
            state_dict[
                "fc.0.weight"
            ].shape[0]
        )

        model.fc = nn.Sequential(

            nn.Linear(
                512,
                hidden_features
            ),

            nn.ReLU(
                inplace=True
            ),

            nn.Dropout(
                p=0.20
            ),

            nn.Linear(
                hidden_features,
                number_of_classes
            ),
        )

        return model


    # ========================================================
    # DIRECT ARCHITECTURE
    # ========================================================

    if architecture == "direct":

        model.fc = nn.Sequential(

            nn.Dropout(
                p=0.25
            ),

            nn.Linear(
                512,
                number_of_classes
            ),
        )

        return model


    # ========================================================
    # RAW LINEAR
    # ========================================================

    if architecture == "raw":

        model.fc = nn.Linear(
            512,
            number_of_classes
        )

        return model


    raise RuntimeError(
        "Unsupported architecture."
    )


# ============================================================
# LOAD CATEGORY MODEL
# ============================================================

def load_category_model(
    category
):

    category = (
        str(category)
        .strip()
        .lower()
    )

    if category not in CATEGORIES:

        raise ValueError(
            f"Unsupported category: {category}"
        )


    # --------------------------------------------------------
    # CACHE
    # --------------------------------------------------------

    if category in MODEL_CACHE:

        return (
            MODEL_CACHE[category],
            MODEL_METADATA[category]
        )


    # --------------------------------------------------------
    # MODEL PATH
    # --------------------------------------------------------

    model_path = (
        MODEL_DIR
        / f"{category}_resnet18.pth"
    )


    if not model_path.exists():

        raise FileNotFoundError(
            f"Model checkpoint not found: "
            f"{model_path}"
        )


    # --------------------------------------------------------
    # LOAD CHECKPOINT
    # --------------------------------------------------------

    checkpoint = torch.load(
        model_path,
        map_location=DEVICE,
        weights_only=False
    )


    if not isinstance(
        checkpoint,
        dict
    ):

        raise RuntimeError(
            f"Unsupported checkpoint format "
            f"for {category}."
        )


    # --------------------------------------------------------
    # CLASS NAMES
    # --------------------------------------------------------

    classes = (
        checkpoint.get(
            "class_names"
        )
        or
        checkpoint.get(
            "classes"
        )
    )


    if classes is None:

        classes = DEFECT_CLASSES.get(
            category
        )


    if not classes:

        raise RuntimeError(
            f"No class information found "
            f"for {category}."
        )


    classes = list(
        classes
    )


    number_of_classes = len(
        classes
    )


    # --------------------------------------------------------
    # STATE DICT
    # --------------------------------------------------------

    state_dict = extract_state_dict(
        checkpoint
    )


    state_dict = clean_state_dict(
        state_dict
    )


    # --------------------------------------------------------
    # BUILD EXACT ARCHITECTURE
    # --------------------------------------------------------

    model = build_model_from_state_dict(
        state_dict,
        number_of_classes
    )


    # --------------------------------------------------------
    # STRICT LOAD
    # --------------------------------------------------------

    try:

        model.load_state_dict(
            state_dict,
            strict=True
        )

    except RuntimeError as error:

        raise RuntimeError(
            f"Checkpoint architecture mismatch "
            f"for category '{category}': "
            f"{error}"
        ) from error


    # --------------------------------------------------------
    # DEVICE
    # --------------------------------------------------------

    model = model.to(
        DEVICE
    )

    model.eval()


    # --------------------------------------------------------
    # METADATA
    # --------------------------------------------------------

    metadata = {

        "architecture":
            "ResNet18",

        "pretrained":
            bool(
                checkpoint.get(
                    "pretrained",
                    True
                )
            ),

        "imagenet":
            bool(
                checkpoint.get(
                    "imagenet",
                    True
                )
            ),

        "fine_tuned":
            bool(
                checkpoint.get(
                    "fine_tuned",
                    True
                )
            ),

        "training_from_scratch":
            bool(
                checkpoint.get(
                    "training_from_scratch",
                    False
                )
            ),

        "category":
            category,

        "classes":
            classes,

        "num_classes":
            number_of_classes,

        "checkpoint":
            str(model_path),
    }


    # --------------------------------------------------------
    # CACHE
    # --------------------------------------------------------

    MODEL_CACHE[
        category
    ] = model

    MODEL_METADATA[
        category
    ] = metadata


    print(
        f"[VisionInspect AI] "
        f"Loaded {category}_resnet18.pth"
    )


    return (
        model,
        metadata
    )


# ============================================================
# IMAGE LOADING
# ============================================================

def load_image(
    image_path
):

    image_path = Path(
        image_path
    )

    if not image_path.exists():

        raise FileNotFoundError(
            f"Image not found: "
            f"{image_path}"
        )


    try:

        image = Image.open(
            image_path
        ).convert("RGB")

    except Exception as error:

        raise ValueError(
            f"Unable to read image: "
            f"{image_path}"
        ) from error


    return image


# ============================================================
# CATEGORY-SPECIFIC PREDICTION
# ============================================================

def predict_for_category(
    image,
    category
):

    model, metadata = (
        load_category_model(
            category
        )
    )


    tensor = TRANSFORM(
        image
    )

    tensor = (
        tensor
        .unsqueeze(0)
        .to(DEVICE)
    )


    with torch.no_grad():

        logits = model(
            tensor
        )

        probabilities = (
            torch.softmax(
                logits,
                dim=1
            )
        )


    probabilities = (
        probabilities[0]
        .detach()
        .cpu()
        .tolist()
    )


    predicted_index = int(
        torch.argmax(
            torch.tensor(
                probabilities
            )
        ).item()
    )


    classes = metadata[
        "classes"
    ]


    predicted_class = (
        classes[
            predicted_index
        ]
    )


    class_confidence = (
        probabilities[
            predicted_index
        ]
    )


    probability_map = {

        classes[index]:
            round(
                float(
                    probability
                ),
                6
            )

        for index, probability
        in enumerate(
            probabilities
        )
    }


    return {

        "category":
            category,

        "predicted_class":
            predicted_class,

        "class_confidence":
            class_confidence,

        "class_probabilities":
            probability_map,

        "model":
            metadata,
    }


# ============================================================
# DECISION THRESHOLDS
# ============================================================

CATEGORY_THRESHOLDS = {

    "bottle": 0.50,
    "cable": 0.50,
    "capsule": 0.50,
    "carpet": 0.50,
    "grid": 0.50,
    "hazelnut": 0.50,
    "leather": 0.50,
    "metal_nut": 0.50,
    "pill": 0.50,
    "screw": 0.50,
    "tile": 0.50,
    "toothbrush": 0.50,
    "transistor": 0.50,
    "wood": 0.50,

    # Validated zipper threshold optimization
    "zipper": 0.45,
}


# ============================================================
# QUALITY ASSESSMENT
# ============================================================

def calculate_quality(
    prediction,
    confidence,
    defect_type
):

    confidence_percent = (
        float(confidence)
        * 100.0
    )


    try:

        assessment = (
            calculate_quality_assessment(
                prediction=prediction,
                confidence=confidence_percent,
                defect_type=defect_type,
            )
        )

        if isinstance(
            assessment,
            dict
        ):

            return assessment

    except TypeError:

        pass

    except Exception as error:

        print(
            "[VisionInspect AI] "
            f"Quality assessment warning: "
            f"{error}"
        )


    # --------------------------------------------------------
    # Safe fallback
    # --------------------------------------------------------

    if prediction == "Normal":

        return {

            "severity":
                "Low",

            "severity_score":
                0,

            "risk_level":
                "Low",

            "quality_decision":
                "PASS",

            "recommendation":
                "Product passed automated "
                "quality inspection.",
        }


    if confidence_percent >= 80:

        severity = "High"

        risk = "High"

        recommendation = (
            f"High-confidence defect detected "
            f"({defect_type}). Product should be "
            f"rejected and manually inspected."
        )

    elif confidence_percent >= 60:

        severity = "Medium"

        risk = "Medium"

        recommendation = (
            f"Defect detected ({defect_type}). "
            f"Manual quality inspection is recommended."
        )

    else:

        severity = "Low"

        risk = "Low"

        recommendation = (
            f"Potential defect detected "
            f"({defect_type}). Further inspection "
            f"is recommended."
        )


    return {

        "severity":
            severity,

        "severity_score":
            round(
                confidence_percent
            ),

        "risk_level":
            risk,

        "quality_decision":
            "FAIL",

        "recommendation":
            recommendation,
    }


# ============================================================
# MAIN PREDICTION
# ============================================================

def predict(
    image_path,
    category: Optional[str] = None
):

    """
    Production prediction interface.

    IMPORTANT:

    A category-specific model cannot be safely
    selected by comparing softmax confidence
    across independent models.

    Therefore:

        predict(image_path, category="bottle")

    is the validated production path.

    If category is omitted, the engine returns
    an explicit Unknown category rather than
    making an unsafe category guess.
    """

    # --------------------------------------------------------
    # IMAGE
    # --------------------------------------------------------

    image = load_image(
        image_path
    )


    # --------------------------------------------------------
    # CATEGORY REQUIRED FOR SAFE ROUTING
    # --------------------------------------------------------

    if category is None:

        return {

            "prediction":
                "Unknown",

            "status":
                "Pending",

            "confidence":
                0.0,

            "product_category":
                "Unknown",

            "category_confidence":
                0.0,

            "category_routing":
                "category_not_provided",

            "category_routing_status":
                "requires_category",

            "category_scores":
                {},

            "defect_type":
                "Unknown",

            "defect_category":
                "Unknown",

            "defect_confidence":
                0.0,

            "category_type":
                "Unknown",

            "normal_probability":
                0.0,

            "defective_probability":
                0.0,

            "decision_threshold":
                None,

            "severity":
                "None",

            "severity_score":
                0,

            "risk_level":
                "Low",

            "quality_decision":
                "PENDING",

            "recommendation":
                (
                    "Product category is required "
                    "before running the category-specific "
                    "inspection model."
                ),

            "model":
                {
                    "architecture":
                        "ResNet18",

                    "pretrained":
                        True,

                    "fine_tuned":
                        True,

                    "training_from_scratch":
                        False,
                },

            "predicted_class":
                "Unknown",

            "class_confidence":
                0.0,

            "class_probabilities":
                {},
        }


    # --------------------------------------------------------
    # NORMALIZE CATEGORY
    # --------------------------------------------------------

    category = (
        str(category)
        .strip()
        .lower()
    )


    if category not in CATEGORIES:

        raise ValueError(
            "Unsupported product category: "
            f"{category}. "
            f"Supported categories: "
            f"{', '.join(CATEGORIES)}"
        )


    # --------------------------------------------------------
    # RUN CATEGORY MODEL
    # --------------------------------------------------------

    result = predict_for_category(
        image,
        category
    )


    predicted_class = (
        result[
            "predicted_class"
        ]
    )


    probabilities = (
        result[
            "class_probabilities"
        ]
    )


    # --------------------------------------------------------
    # NORMAL PROBABILITY
    # --------------------------------------------------------

    normal_probability = float(
        probabilities.get(
            "good",
            0.0
        )
    )


    defective_probability = (
        1.0
        -
        normal_probability
    )


    # --------------------------------------------------------
    # THRESHOLD
    # --------------------------------------------------------

    threshold = (
        CATEGORY_THRESHOLDS.get(
            category,
            0.50
        )
    )


    # --------------------------------------------------------
    # BINARY DECISION
    # --------------------------------------------------------

    if category == "toothbrush":

        # Toothbrush has only:
        # good / defective

        prediction = (
            "Normal"
            if predicted_class == "good"
            else "Defective"
        )

    else:

        prediction = (

            "Normal"

            if normal_probability
            >= (
                1.0
                -
                threshold
            )

            else

            "Defective"
        )


    # --------------------------------------------------------
    # DEFECT TYPE
    # --------------------------------------------------------

    if prediction == "Normal":

        defect_type = "None"

        defect_confidence = (
            normal_probability
        )

    else:

        if predicted_class == "good":

            # Binary decision says defective,
            # but multiclass winner says good.
            #
            # Do not invent a defect class.

            defect_type = "Unknown"

            defect_confidence = (
                defective_probability
            )

        else:

            defect_type = (
                predicted_class
            )

            defect_confidence = float(
                probabilities.get(
                    predicted_class,
                    0.0
                )
            )


    # --------------------------------------------------------
    # CONFIDENCE
    # --------------------------------------------------------

    if prediction == "Normal":

        confidence = (
            normal_probability
        )

    else:

        confidence = (
            defect_confidence
        )


    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    status = (
        "Pass"
        if prediction == "Normal"
        else "Fail"
    )


    # --------------------------------------------------------
    # CATEGORY TYPE
    # --------------------------------------------------------

    category_type = (

        "Normal Product"

        if prediction == "Normal"

        else

        "Defective Product"
    )


    # --------------------------------------------------------
    # QUALITY
    # --------------------------------------------------------

    quality = calculate_quality(
        prediction=prediction,
        confidence=confidence,
        defect_type=defect_type
    )


    # --------------------------------------------------------
    # FINAL RESULT
    # --------------------------------------------------------

    return {

        "prediction":
            prediction,

        "status":
            status,

        "confidence":
            round(
                confidence * 100.0,
                2
            ),

        "product_category":
            category,

        "category_confidence":
            100.0,

        "category_routing":
            "explicit_category",

        "category_routing_status":
            "validated",

        "category_scores":
            {
                category:
                    1.0
            },

        "defect_type":
            defect_type,

        "defect_category":
            defect_type,

        "defect_confidence":
            round(
                defect_confidence * 100.0,
                2
            ),

        "category_type":
            category_type,

        "normal_probability":
            round(
                normal_probability * 100.0,
                2
            ),

        "defective_probability":
            round(
                defective_probability * 100.0,
                2
            ),

        "decision_threshold":
            threshold,

        "severity":
            quality.get(
                "severity",
                "None"
            ),

        "severity_score":
            quality.get(
                "severity_score",
                0
            ),

        "risk_level":
            quality.get(
                "risk_level",
                "Low"
            ),

        "quality_decision":
            quality.get(
                "quality_decision",
                status.upper()
            ),

        "recommendation":
            quality.get(
                "recommendation",
                ""
            ),

        "model":
            result[
                "model"
            ],

        "predicted_class":
            predicted_class,

        "class_confidence":
            round(
                result[
                    "class_confidence"
                ] * 100.0,
                2
            ),

        "class_probabilities":
            probabilities,
    }


# ============================================================
# MODEL STATUS
# ============================================================

def get_model_status():

    categories = {}


    for category in CATEGORIES:

        path = (
            MODEL_DIR
            / f"{category}_resnet18.pth"
        )

        categories[
            category
        ] = {

            "available":
                path.exists(),

            "path":
                str(path),

            "loaded":
                category
                in MODEL_CACHE,
        }


    return {

        "device":
            str(DEVICE),

        "architecture":
            "ResNet18",

        "training":
            "ImageNet pretrained + fine-tuned",

        "model_directory":
            str(MODEL_DIR),

        "categories":
            categories,

        "loaded_count":
            len(
                MODEL_CACHE
            ),

        "available_count":
            sum(
                1
                for item
                in categories.values()
                if item["available"]
            ),

        "total_categories":
            len(CATEGORIES),

        "category_routing":
            (
                "Explicit category required. "
                "Independent category-model "
                "softmax scores are not compared."
            ),
    }


# ============================================================
# CLI TEST
# ============================================================

if __name__ == "__main__":

    import argparse
    import json


    parser = argparse.ArgumentParser(
        description=(
            "VisionInspect AI "
            "ResNet18 prediction"
        )
    )


    parser.add_argument(
        "image",
        nargs="?",
        help="Path to image"
    )


    parser.add_argument(
        "--category",
        default=None,
        help=(
            "Product category, e.g. "
            "bottle, capsule, pill, wood"
        )
    )


    parser.add_argument(
        "--status",
        action="store_true",
        help="Show model status"
    )


    args = parser.parse_args()


    if args.status:

        print(
            json.dumps(
                get_model_status(),
                indent=2
            )
        )

    elif args.image:

        result = predict(
            args.image,
            category=args.category
        )

        print(
            json.dumps(
                result,
                indent=2
            )
        )

    else:

        parser.print_help()