"""
===============================================================================
VISIONINSPECT AI
RESNET18 REFERENCE-MATCHING ENGINE
===============================================================================

Pipeline:

UPLOAD IMAGE
      |
      v
PRETRAINED IMAGENET RESNET18
      |
      v
FEATURE EMBEDDING
      |
      +-----------------------+
      |                       |
      v                       v
NORMAL PRODUCT           DEFECT REFERENCES
REFERENCES                    |
      |                       v
      v                  DEFECT TYPE
PRODUCT CATEGORY
      |                       |
      +-----------+-----------+
                  |
                  v
          FINAL INSPECTION

IMPORTANT:
- NO TRAINING
- NO FINE-TUNING
- NO CUSTOM CNN
- NO CUSTOM .PTH CHECKPOINT
- ResNet18 is used as a pretrained feature extractor.
- MVTec images are used as visual references.

This is a reference-matching prototype.
The similarity values are NOT calibrated probabilities.
===============================================================================
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import torch
from PIL import Image

from app.ai.resnet18_models import (
    TRANSFORM,
    create_feature_extractor,
)


# =============================================================================
# MODEL
# =============================================================================

FEATURE_MODEL, DEVICE = create_feature_extractor()


# =============================================================================
# PATHS
# =============================================================================

AI_DIR = Path(__file__).resolve().parent

DATASET_DIR = (
    AI_DIR.parent.parent
    / "dataset"
    / "mvtec_ad"
)

IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".webp",
}


# =============================================================================
# REFERENCE SETTINGS
# =============================================================================

NORMAL_REFERENCES_PER_CATEGORY = 30

DEFECT_REFERENCES_PER_TYPE = 30

CATEGORY_MIN_SIMILARITY = 0.45

DEFECT_MIN_SIMILARITY = 0.45

DEFECT_MARGIN = 0.02


# =============================================================================
# MVTec CATEGORIES
# =============================================================================

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


# =============================================================================
# MVTec DEFECT TYPES
# =============================================================================

DEFECT_CLASSES: Dict[str, List[str]] = {

    "bottle": [
        "broken_large",
        "broken_small",
        "contamination",
    ],

    "cable": [
        "bent_wire",
        "cable_swap",
        "combined",
        "cut_inner_insulation",
        "cut_outer_insulation",
        "missing_cable",
        "missing_wire",
        "poke_insulation",
    ],

    "capsule": [
        "crack",
        "faulty_imprint",
        "poke",
        "scratch",
        "squeeze",
    ],

    "carpet": [
        "color",
        "cut",
        "hole",
        "metal_contamination",
        "thread",
    ],

    "grid": [
        "bent",
        "broken",
        "glue",
        "metal_contamination",
        "thread",
    ],

    "hazelnut": [
        "crack",
        "cut",
        "hole",
        "print",
    ],

    "leather": [
        "color",
        "cut",
        "fold",
        "glue",
        "poke",
    ],

    "metal_nut": [
        "bent",
        "color",
        "flip",
        "scratch",
    ],

    "pill": [
        "color",
        "combined",
        "contamination",
        "crack",
        "faulty_imprint",
        "pill_type",
        "scratch",
    ],

    "screw": [
        "manipulated_front",
        "scratch_head",
        "scratch_neck",
        "thread_side",
        "thread_top",
    ],

    "tile": [
        "crack",
        "glue_strip",
        "gray_stroke",
        "oil",
        "rough",
    ],

    "toothbrush": [
        "defective",
    ],

    "transistor": [
        "bent_lead",
        "cut_lead",
        "damaged_case",
        "misplaced",
    ],

    "wood": [
        "color",
        "combined",
        "hole",
        "liquid",
        "scratch",
    ],

    "zipper": [
        "broken_teeth",
        "combined",
        "fabric_border",
        "fabric_interior",
        "rough",
        "split_teeth",
        "squeezed_teeth",
    ],
}


# =============================================================================
# REFERENCE DATABASES
# =============================================================================

REFERENCE_DATABASE: Dict[
    str,
    torch.Tensor,
] = {}


DEFECT_REFERENCE_DATABASE: Dict[
    str,
    Dict[str, torch.Tensor],
] = {}


# =============================================================================
# IMAGE HELPERS
# =============================================================================

def load_image(
    image_path: str | os.PathLike,
) -> Image.Image:

    path = Path(image_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Image not found: {path}"
        )

    if path.suffix.lower() not in IMAGE_EXTENSIONS:
        raise ValueError(
            f"Unsupported image format: {path.suffix}"
        )

    with Image.open(path) as image:
        return image.convert("RGB")


def list_images(
    directory: Path,
    limit: Optional[int] = None,
) -> List[Path]:

    if not directory.exists():
        return []

    files = sorted(
        path
        for path in directory.iterdir()
        if (
            path.is_file()
            and path.suffix.lower()
            in IMAGE_EXTENSIONS
        )
    )

    if limit is not None:
        return files[:limit]

    return files


# =============================================================================
# FEATURE EXTRACTION
# =============================================================================

@torch.no_grad()
def extract_feature(
    image: Image.Image,
) -> torch.Tensor:

    tensor = TRANSFORM(
        image
    ).unsqueeze(
        0
    ).to(
        DEVICE
    )

    feature = FEATURE_MODEL(
        tensor
    )

    return feature[
        0
    ].detach().cpu()


# =============================================================================
# COSINE SIMILARITY
# =============================================================================

def cosine_similarity(
    feature_a: torch.Tensor,
    feature_b: torch.Tensor,
) -> float:

    a = torch.nn.functional.normalize(
        feature_a.float().unsqueeze(0),
        p=2,
        dim=1,
    )

    b = torch.nn.functional.normalize(
        feature_b.float().unsqueeze(0),
        p=2,
        dim=1,
    )

    return float(
        torch.sum(
            a * b
        ).item()
    )


def similarity_to_score(
    similarity: float,
) -> float:
    """
    Convert cosine similarity [-1,1]
    to a display score [0,100].

    This is NOT a calibrated probability.
    """

    score = (
        (similarity + 1.0)
        / 2.0
        * 100.0
    )

    return round(
        max(
            0.0,
            min(
                100.0,
                score,
            ),
        ),
        2,
    )


# =============================================================================
# CREATE CENTROID
# =============================================================================

def centroid_from_images(
    image_files: List[Path],
) -> Optional[torch.Tensor]:

    features: List[torch.Tensor] = []

    for image_file in image_files:

        try:

            image = load_image(
                image_file
            )

            feature = extract_feature(
                image
            )

            features.append(
                feature
            )

        except Exception:
            continue

    if not features:
        return None

    stacked = torch.stack(
        features
    )

    centroid = stacked.mean(
        dim=0
    )

    centroid = torch.nn.functional.normalize(
        centroid,
        p=2,
        dim=0,
    )

    return centroid


# =============================================================================
# BUILD NORMAL REFERENCES
# =============================================================================

def build_reference_database(
    max_images_per_category: int = (
        NORMAL_REFERENCES_PER_CATEGORY
    ),
) -> Dict[str, torch.Tensor]:

    global REFERENCE_DATABASE

    database: Dict[
        str,
        torch.Tensor,
    ] = {}

    for category in CATEGORIES:

        good_dir = (
            DATASET_DIR
            / category
            / "train"
            / "good"
        )

        image_files = list_images(
            good_dir,
            max_images_per_category,
        )

        centroid = centroid_from_images(
            image_files
        )

        if centroid is not None:
            database[
                category
            ] = centroid

    REFERENCE_DATABASE = database

    return database


# =============================================================================
# BUILD DEFECT REFERENCES
# =============================================================================

def build_defect_reference_database(
    max_images_per_defect: int = (
        DEFECT_REFERENCES_PER_TYPE
    ),
) -> Dict[str, Dict[str, torch.Tensor]]:

    global DEFECT_REFERENCE_DATABASE

    database: Dict[
        str,
        Dict[str, torch.Tensor],
    ] = {}

    for category in CATEGORIES:

        category_database: Dict[
            str,
            torch.Tensor,
        ] = {}

        test_dir = (
            DATASET_DIR
            / category
            / "test"
        )

        for defect_type in DEFECT_CLASSES.get(
            category,
            [],
        ):

            defect_dir = (
                test_dir
                / defect_type
            )

            image_files = list_images(
                defect_dir,
                max_images_per_defect,
            )

            centroid = centroid_from_images(
                image_files
            )

            if centroid is not None:

                category_database[
                    defect_type
                ] = centroid

        if category_database:

            database[
                category
            ] = category_database

    DEFECT_REFERENCE_DATABASE = database

    return database


# =============================================================================
# CATEGORY PREDICTION
# =============================================================================

@torch.no_grad()
def predict_category(
    image: Image.Image,
) -> Dict[str, Any]:

    if not REFERENCE_DATABASE:
        build_reference_database()

    if not REFERENCE_DATABASE:

        return {
            "category": "Unknown",
            "confidence": 0.0,
            "similarity": 0.0,
            "scores": {},
        }

    feature = extract_feature(
        image
    )

    scores: Dict[
        str,
        float,
    ] = {}

    for category, reference in (
        REFERENCE_DATABASE.items()
    ):

        scores[
            category
        ] = cosine_similarity(
            feature,
            reference,
        )

    ranked = sorted(
        scores.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    best_category = ranked[0][0]

    best_similarity = ranked[0][1]

    category_score = similarity_to_score(
        best_similarity
    )

    if (
        best_similarity
        < CATEGORY_MIN_SIMILARITY
    ):

        return {
            "category": "Unknown",
            "confidence": category_score,
            "similarity": round(
                best_similarity,
                4,
            ),
            "scores": {
                key: similarity_to_score(
                    value
                )
                for key, value
                in scores.items()
            },
        }

    return {
        "category": best_category,
        "confidence": category_score,
        "similarity": round(
            best_similarity,
            4,
        ),
        "scores": {
            key: similarity_to_score(
                value
            )
            for key, value
            in scores.items()
        },
    }


# =============================================================================
# ANOMALY / DEFECT DETECTION
# =============================================================================

@torch.no_grad()
def calculate_anomaly_score(
    image: Image.Image,
    category: str,
) -> Tuple[float, float]:

    if not REFERENCE_DATABASE:
        build_reference_database()

    reference = REFERENCE_DATABASE.get(
        category
    )

    if reference is None:
        return 0.0, 0.0

    feature = extract_feature(
        image
    )

    similarity = cosine_similarity(
        feature,
        reference,
    )

    normal_similarity = (
        similarity + 1.0
    ) / 2.0

    anomaly = (
        1.0
        - normal_similarity
    )

    anomaly = max(
        0.0,
        min(
            1.0,
            anomaly,
        ),
    )

    return (
        round(
            anomaly * 100.0,
            2,
        ),
        round(
            similarity,
            4,
        ),
    )


# =============================================================================
# DEFECT TYPE PREDICTION
# =============================================================================

@torch.no_grad()
def predict_defect_type(
    image: Image.Image,
    category: str,
) -> Dict[str, Any]:

    if category not in DEFECT_CLASSES:

        return {
            "defect_type": "Unknown",
            "confidence": 0.0,
            "similarity": 0.0,
            "scores": {},
        }

    if not DEFECT_REFERENCE_DATABASE:

        build_defect_reference_database()

    category_database = (
        DEFECT_REFERENCE_DATABASE.get(
            category,
            {},
        )
    )

    if not category_database:

        return {
            "defect_type": "Unknown",
            "confidence": 0.0,
            "similarity": 0.0,
            "scores": {},
        }

    feature = extract_feature(
        image
    )

    scores: Dict[
        str,
        float,
    ] = {}

    for defect_type, reference in (
        category_database.items()
    ):

        scores[
            defect_type
        ] = cosine_similarity(
            feature,
            reference,
        )

    ranked = sorted(
        scores.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    best_defect = ranked[0][0]

    best_similarity = ranked[0][1]

    second_similarity = (
        ranked[1][1]
        if len(ranked) > 1
        else -1.0
    )

    margin = (
        best_similarity
        - second_similarity
    )

    confidence = similarity_to_score(
        best_similarity
    )

    if (
        best_similarity
        < DEFECT_MIN_SIMILARITY
        or margin
        < DEFECT_MARGIN
    ):

        return {
            "defect_type": "Unknown",
            "confidence": confidence,
            "similarity": round(
                best_similarity,
                4,
            ),
            "margin": round(
                margin,
                4,
            ),
            "scores": {
                key: similarity_to_score(
                    value
                )
                for key, value
                in scores.items()
            },
        }

    return {
        "defect_type": best_defect,
        "confidence": confidence,
        "similarity": round(
            best_similarity,
            4,
        ),
        "margin": round(
            margin,
            4,
        ),
        "scores": {
            key: similarity_to_score(
                value
            )
            for key, value
            in scores.items()
        },
    }


# =============================================================================
# SEVERITY
# =============================================================================

def calculate_severity(
    anomaly_score: float,
    defect_confidence: float,
) -> str:

    if (
        anomaly_score >= 70
        and defect_confidence >= 75
    ):
        return "High"

    if (
        anomaly_score >= 50
        or defect_confidence >= 60
    ):
        return "Medium"

    return "Low"


# =============================================================================
# COMPLETE PREDICTION
# =============================================================================

def predict(
    image_path: str | os.PathLike,
) -> Dict[str, Any]:

    image = load_image(
        image_path
    )

    # -------------------------------------------------------------
    # CATEGORY
    # -------------------------------------------------------------

    category_result = predict_category(
        image
    )

    category = (
        category_result[
            "category"
        ]
    )

    if category == "Unknown":

        return {
            "prediction": "Unknown",
            "status": "Review",
            "product_category": "Unknown",
            "category_confidence":
                category_result[
                    "confidence"
                ],
            "defect_type": "Unknown",
            "defect_confidence": 0.0,
            "anomaly_score": 0.0,
            "severity": "Unknown",
            "quality_decision": "REVIEW",
            "recommendation": (
                "The uploaded image could not "
                "be matched reliably to a "
                "known product category."
            ),
        }

    # -------------------------------------------------------------
    # ANOMALY
    # -------------------------------------------------------------

    anomaly_score, normal_similarity = (
        calculate_anomaly_score(
            image,
            category,
        )
    )

    # Reference-distance decision.
    is_defective = (
        anomaly_score >= 50.0
    )

    # -------------------------------------------------------------
    # NORMAL
    # -------------------------------------------------------------

    if not is_defective:

        return {
            "prediction": "Normal",
            "status": "Pass",
            "product_category": category,
            "category_confidence":
                category_result[
                    "confidence"
                ],
            "defect_type": "None",
            "defect_confidence": 0.0,
            "anomaly_score": anomaly_score,
            "normal_similarity":
                normal_similarity,
            "severity": "None",
            "quality_decision": "PASS",
            "recommendation": (
                "No strong visual deviation "
                "from the normal reference "
                "was detected."
            ),
        }

    # -------------------------------------------------------------
    # DEFECT TYPE
    # -------------------------------------------------------------

    defect_result = predict_defect_type(
        image,
        category,
    )

    defect_type = (
        defect_result[
            "defect_type"
        ]
    )

    defect_confidence = (
        defect_result[
            "confidence"
        ]
    )

    # -------------------------------------------------------------
    # SEVERITY
    # -------------------------------------------------------------

    severity = calculate_severity(
        anomaly_score,
        defect_confidence,
    )

    # -------------------------------------------------------------
    # RECOMMENDATION
    # -------------------------------------------------------------

    if defect_type == "Unknown":

        recommendation = (
            "A visual anomaly was detected, "
            "but the defect type could not be "
            "matched reliably to a known "
            "defect reference."
        )

    else:

        recommendation = (
            "Product rejected. Possible defect: "
            f"{defect_type.replace('_', ' ')}."
        )

    # -------------------------------------------------------------
    # FINAL RESULT
    # -------------------------------------------------------------

    return {
        "prediction": "Defective",
        "status": "Fail",
        "product_category": category,
        "category_confidence":
            category_result[
                "confidence"
            ],
        "defect_type": defect_type,
        "defect_confidence":
            defect_confidence,
        "anomaly_score": anomaly_score,
        "normal_similarity":
            normal_similarity,
        "severity": severity,
        "quality_decision": "FAIL",
        "recommendation": recommendation,
    }


# =============================================================================
# REBUILD DATABASE
# =============================================================================

def rebuild_reference_database() -> None:

    print()
    print("=" * 72)
    print("VISIONINSPECT AI")
    print("RESNET18 REFERENCE DATABASE")
    print("=" * 72)

    print(
        f"Device       : {DEVICE}"
    )

    print(
        "Backbone     : ImageNet ResNet18"
    )

    print(
        "Training     : NONE"
    )

    print(
        f"Dataset      : {DATASET_DIR}"
    )

    print("=" * 72)

    print()
    print(
        "Building normal product references..."
    )

    normal_db = (
        build_reference_database()
    )

    print(
        f"Normal categories loaded: "
        f"{len(normal_db)}/{len(CATEGORIES)}"
    )

    print()
    print(
        "Building defect references..."
    )

    defect_db = (
        build_defect_reference_database()
    )

    defect_count = sum(
        len(value)
        for value
        in defect_db.values()
    )

    print(
        f"Defect types loaded: "
        f"{defect_count}"
    )

    print()
    print(
        "REFERENCE DATABASE READY"
    )

    print("=" * 72)


# =============================================================================
# CLI
# =============================================================================

def main() -> None:

    parser = argparse.ArgumentParser(
        description=(
            "VisionInspect AI "
            "ResNet18 backend"
        )
    )

    parser.add_argument(
        "image",
        nargs="?",
        help="Path to image",
    )

    parser.add_argument(
        "--rebuild",
        action="store_true",
        help=(
            "Build and inspect "
            "the reference databases"
        ),
    )

    args = parser.parse_args()

    print()
    print("=" * 72)
    print("VISIONINSPECT AI")
    print("PRETRAINED RESNET18 BACKEND")
    print("=" * 72)

    print(
        f"Device       : {DEVICE}"
    )

    print(
        "Training     : NO"
    )

    print(
        "Fine-tuning  : NO"
    )

    print("=" * 72)

    if args.rebuild:

        rebuild_reference_database()

        return

    if not args.image:

        print()
        print("Usage:")
        print(
            "python -m app.ai.resnet18_engine "
            "<image_path>"
        )

        print()
        print("Or:")
        print(
            "python -m app.ai.resnet18_engine "
            "--rebuild"
        )

        return

    try:

        result = predict(
            args.image
        )

    except Exception as exc:

        print()
        print("PREDICTION ERROR")
        print("-" * 72)
        print(str(exc))

        raise SystemExit(1)

    print()
    print("=" * 72)
    print("PREDICTION RESULT")
    print("=" * 72)

    for key, value in result.items():

        print(
            f"{key:<25}: {value}"
        )

    print("=" * 72)


if __name__ == "__main__":
    main()