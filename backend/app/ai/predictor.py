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

MODEL_PATH = Path("models/best.pt")


if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model not found: {MODEL_PATH}"
    )


print(f"Loading YOLO model: {MODEL_PATH}")


# ==========================================
# Load YOLO Model Once
# ==========================================

model = YOLO(str(MODEL_PATH))


def predict(image_path: str):
    """
    Run YOLO prediction.

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
        result_image
    }
    """

    # ==========================================
    # Run YOLO Prediction
    # ==========================================

    results = model.predict(
        source=image_path,
        conf=0.25,
        save=True,
        verbose=False,
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
    # PASS - No Defect
    # ==========================================

    if len(result.boxes) == 0:

        severity_info = calculate_severity(
            "pass",
            1.0
        )

        return {

            "status": "pass",

            "product_category": "Unknown",

            "defect_type": "No Defect",

            "confidence": 1.0,

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

            "result_image":
                str(result_image),
        }


    # ==========================================
    # FAIL - Defect Found
    # ==========================================

    box = result.boxes[0]


    # ==========================================
    # Class ID
    # ==========================================

    class_id = int(
        box.cls.item()
    )


    # ==========================================
    # Confidence
    # ==========================================

    confidence = float(
        box.conf.item()
    )


    # ==========================================
    # Defect Categorization
    # ==========================================

    category_info = categorize_defect(
        class_id
    )


    product_category = (
        category_info["product_category"]
    )

    defect_type = (
        category_info["defect_type"]
    )


    # ==========================================
    # Safety Fallback
    # ==========================================

    if class_id not in CLASS_MAPPING:

        defect_type = (
            result.names[class_id]
            if class_id in result.names
            else "Unknown"
        )

        product_category = "Unknown"


    # ==========================================
    # Full Defect Label
    # ==========================================

    defect_name = CLASS_MAPPING.get(
        class_id,
        result.names[class_id]
        if class_id in result.names
        else "Unknown"
    )


    # ==========================================
    # Console Information
    # ==========================================

    print(
        f"Detected Class : {class_id}"
    )

    print(
        f"Defect Label   : {defect_name}"
    )

    print(
        f"Product        : {product_category}"
    )

    print(
        f"Defect Type    : {defect_type}"
    )

    print(
        f"Confidence     : {confidence:.4f}"
    )


    # ==========================================
    # Severity & Risk Analysis
    # ==========================================

    severity_info = calculate_severity(
        "fail",
        confidence
    )


    # ==========================================
    # Return Prediction
    # ==========================================

    return {

        # ------------------------------
        # Inspection Status
        # ------------------------------

        "status":
            "fail",


        # ------------------------------
        # Defect Categorization
        # ------------------------------

        "product_category":
            product_category,

        "defect_type":
            defect_type,

        "class_id":
            class_id,


        # ------------------------------
        # AI Confidence
        # ------------------------------

        "confidence":
            confidence,


        # ------------------------------
        # Severity
        # ------------------------------

        "severity":
            severity_info["severity"],

        "severity_score":
            severity_info["severity_score"],


        # ------------------------------
        # Quality Risk
        # ------------------------------

        "risk_level":
            severity_info["risk_level"],

        "risk_description":
            severity_info["risk_description"],


        # ------------------------------
        # Recommendation
        # ------------------------------

        "recommendation":
            severity_info["recommendation"],


        # ------------------------------
        # Result Image
        # ------------------------------

        "result_image":
            str(result_image),
    }