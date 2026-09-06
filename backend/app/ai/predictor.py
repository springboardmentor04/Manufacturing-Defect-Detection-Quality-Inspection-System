from pathlib import Path

from ultralytics import YOLO

from app.ai.class_mapping import (
    CLASS_MAPPING,
    categorize_defect,
)

from app.ai.severity import calculate_severity


# ==========================================
# VisionInspect AI - YOLO Predictor
# ==========================================

# backend/
# ├── app/
# │   └── ai/
# │       └── predictor.py
# └── models/
#     └── best.pt

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BASE_DIR / "models" / "best.pt"


if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model not found: {MODEL_PATH}"
    )


print(f"Loading YOLO model: {MODEL_PATH}")


# ==========================================
# Load YOLO Model Once
# ==========================================

model = YOLO(str(MODEL_PATH))


# ==========================================
# Prediction Function
# ==========================================

def predict(image_path: str):
    """
    Run YOLO prediction.

    All detections are processed.

    The highest-confidence detection is used
    as the primary inspection result so that
    the existing frontend/database structure
    remains compatible.

    Returns:

    {
        status,
        product_category,
        defect_type,
        confidence,
        class_id,
        severity,
        severity_score,
        risk_level,
        risk_description,
        recommendation,
        detection_count,
        detections,
        result_image
    }
    """

    # ==========================================
    # Run YOLO Prediction
    # ==========================================

    results = model.predict(
        source=image_path,
        conf=0.40,
        save=True,
        verbose=False,
    )

    if not results:
        raise RuntimeError(
            "YOLO did not return a prediction result."
        )

    result = results[0]

    # ==========================================
    # Locate Saved Result Image
    # ==========================================

    save_dir = Path(result.save_dir)

    image_files = []

    image_files.extend(save_dir.glob("*.png"))
    image_files.extend(save_dir.glob("*.jpg"))
    image_files.extend(save_dir.glob("*.jpeg"))

    if not image_files:
        raise FileNotFoundError(
            f"No prediction image found in {save_dir}"
        )

    result_image = max(
        image_files,
        key=lambda img: img.stat().st_mtime
    )

    print(
        f"YOLO Result Image : {result_image}"
    )

    # ==========================================
    # NO DEFECT DETECTED
    # ==========================================

    if result.boxes is None or len(result.boxes) == 0:

        severity_info = calculate_severity(
            "pass",
            0.0
        )

        print("No defect detected.")

        return {
            "status": "pass",

            "product_category": "Unknown",

            "defect_type": "No Defect",

            # 0.0 means there was no detection.
            # It does NOT mean the model is 100% certain.
            "confidence": 0.0,

            "class_id": None,

            "severity":
                severity_info["severity"],

            "severity_score":
                severity_info["severity_score"],

            "risk_level":
                severity_info["risk_level"],

            "risk_description":
                severity_info["risk_description"],

            "recommendation":
                severity_info["recommendation"],

            "detection_count": 0,

            "detections": [],

            "result_image":
                str(result_image),
        }

    # ==========================================
    # PROCESS ALL DETECTIONS
    # ==========================================

    detections = []

    for box in result.boxes:

        # ------------------------------------------
        # Class ID
        # ------------------------------------------

        class_id = int(
            box.cls.item()
        )

        # ------------------------------------------
        # Confidence
        # ------------------------------------------

        confidence = float(
            box.conf.item()
        )

        # ------------------------------------------
        # Class Name
        # ------------------------------------------

        if class_id in CLASS_MAPPING:

            category_info = categorize_defect(
                class_id
            )

            product_category = (
                category_info["product_category"]
            )

            defect_type = (
                category_info["defect_type"]
            )

            defect_name = CLASS_MAPPING[
                class_id
            ]

        else:

            class_name = (
                result.names[class_id]
                if class_id in result.names
                else "Unknown"
            )

            product_category = "Unknown"
            defect_type = class_name
            defect_name = class_name

        # ------------------------------------------
        # Store Detection
        # ------------------------------------------

        detections.append(
            {
                "class_id": class_id,

                "class_name": defect_name,

                "product_category":
                    product_category,

                "defect_type":
                    defect_type,

                "confidence":
                    confidence,
            }
        )

    # ==========================================
    # Sort By Confidence
    # ==========================================

    detections.sort(
        key=lambda detection:
            detection["confidence"],
        reverse=True,
    )

    # ==========================================
    # Primary Detection
    # ==========================================
    #
    # The highest-confidence detection is used
    # for the existing inspection result.
    #

    primary_detection = detections[0]

    class_id = primary_detection[
        "class_id"
    ]

    product_category = (
        primary_detection[
            "product_category"
        ]
    )

    defect_type = (
        primary_detection[
            "defect_type"
        ]
    )

    confidence = (
        primary_detection[
            "confidence"
        ]
    )

    defect_name = (
        primary_detection[
            "class_name"
        ]
    )

    # ==========================================
    # Console Information
    # ==========================================

    print(
        f"Detected Defects : {len(detections)}"
    )

    print(
        f"Primary Class    : {class_id}"
    )

    print(
        f"Primary Defect   : {defect_name}"
    )

    print(
        f"Product          : {product_category}"
    )

    print(
        f"Defect Type      : {defect_type}"
    )

    print(
        f"Confidence       : {confidence:.4f}"
    )

    print("\nAll Detections:")

    for index, detection in enumerate(
        detections,
        start=1
    ):

        print(
            f"{index}. "
            f"{detection['class_name']} | "
            f"{detection['defect_type']} | "
            f"{detection['confidence']:.4f}"
        )

    # ==========================================
    # Severity & Risk Analysis
    # ==========================================
    #
    # Severity is based on the highest-confidence
    # detected defect, preserving the existing
    # severity/risk logic.
    #

    severity_info = calculate_severity(
        "fail",
        confidence
    )

    # ==========================================
    # Return Prediction
    # ==========================================

    return {

        # --------------------------------------
        # Inspection Status
        # --------------------------------------

        "status":
            "fail",

        # --------------------------------------
        # Primary Defect Categorization
        # --------------------------------------

        "product_category":
            product_category,

        "defect_type":
            defect_type,

        "class_id":
            class_id,

        # --------------------------------------
        # Primary AI Confidence
        # --------------------------------------

        "confidence":
            confidence,

        # --------------------------------------
        # Severity
        # --------------------------------------

        "severity":
            severity_info["severity"],

        "severity_score":
            severity_info["severity_score"],

        # --------------------------------------
        # Quality Risk
        # --------------------------------------

        "risk_level":
            severity_info["risk_level"],

        "risk_description":
            severity_info["risk_description"],

        # --------------------------------------
        # Recommendation
        # --------------------------------------

        "recommendation":
            severity_info["recommendation"],

        # --------------------------------------
        # Multiple Detection Information
        # --------------------------------------

        "detection_count":
            len(detections),

        "detections":
            detections,

        # --------------------------------------
        # Result Image
        # --------------------------------------

        "result_image":
            str(result_image),
    }