from pathlib import Path

from ultralytics import YOLO


# ============================================================
# YOLO MODEL PATH
# ============================================================

MODEL_PATH = (
    Path(__file__).resolve().parent
    / "models"
    / "defect_detector_yolov8s.pt"
)


# ============================================================
# CHECK MODEL
# ============================================================

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"YOLO model not found:\n{MODEL_PATH}"
    )


# ============================================================
# LOAD MODEL ONCE
# ============================================================

print("Loading YOLOv8s defect detector...")

model = YOLO(str(MODEL_PATH))

print("YOLOv8s defect detector loaded successfully.")


# ============================================================
# DEFECT CLASS NAMES
# ============================================================

# Use the names stored inside the trained YOLO model.
# This avoids manually hard-coding the 48 classes.

MODEL_CLASS_NAMES = model.names


def get_class_name(class_id):
    """
    Convert YOLO class ID into the actual defect name.
    """

    try:
        if isinstance(MODEL_CLASS_NAMES, dict):
            return str(
                MODEL_CLASS_NAMES.get(
                    class_id,
                    f"class_{class_id}"
                )
            )

        return str(
            MODEL_CLASS_NAMES[class_id]
        )

    except Exception:
        return f"class_{class_id}"


# ============================================================
# DETECT DEFECTS
# ============================================================

def detect_defects(
    image_path,
    confidence_threshold=0.50
):

    results = model.predict(
        source=image_path,
        conf=confidence_threshold,
        imgsz=640,
        verbose=False
    )

    result = results[0]

    detections = []


    # ========================================================
    # EXTRACT DETECTIONS
    # ========================================================

    if result.boxes is not None:

        for box in result.boxes:

            confidence = float(
                box.conf[0]
            )

            class_id = int(
                box.cls[0]
            )

            x1, y1, x2, y2 = (
                box.xyxy[0].tolist()
            )

            class_name = get_class_name(
                class_id
            )


            detections.append({

                "class_id": class_id,

                "class_name": class_name,

                "confidence": round(
                    confidence * 100,
                    2
                ),

                "bbox": {

                    "x": int(x1),

                    "y": int(y1),

                    "width": int(
                        x2 - x1
                    ),

                    "height": int(
                        y2 - y1
                    )

                }

            })


    # ========================================================
    # SAVE ANNOTATED IMAGE
    # ========================================================

    image_path = Path(image_path)

    result_image_path = (
        image_path.parent
        / f"yolo_{image_path.name}"
    )


    result.save(
        filename=str(
            result_image_path
        )
    )


    # ========================================================
    # MAX YOLO CONFIDENCE
    # ========================================================

    if detections:

        max_confidence = max(
            detection["confidence"]
            for detection in detections
        )

    else:

        max_confidence = 0.0


    # ========================================================
    # RETURN RESULT
    # ========================================================

    return {

        "defects_detected":
            len(detections),

        "max_confidence":
            round(
                max_confidence,
                2
            ),

        "detections":
            detections,

        "result_image_path":
            str(
                result_image_path
            )

    }