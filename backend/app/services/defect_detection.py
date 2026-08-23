import os
import cv2
import numpy as np
from ultralytics import YOLO

from app.services.image_processing import preprocess_image

MODEL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "ml_models", "defect_detector.pt")
)

_model_instance = None

def get_yolo_model() -> YOLO:
    """
    Lazy singleton loader for the trained YOLO defect detection model.
    """
    global _model_instance
    if _model_instance is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Trained YOLO model file not found at: {MODEL_PATH}")
        _model_instance = YOLO(MODEL_PATH)
    return _model_instance

def run_inference(image_path: str) -> list:
    """
    Runs YOLO defect detection on the given image path:
    1. Reads original image dimensions for bounding box scaling.
    2. Preprocesses image using CLAHE, denoising, and 640x640 resizing.
    3. Executes YOLO model inference.
    4. Parses bounding boxes (bbox_x, bbox_y, bbox_width, bbox_height), class labels, and confidence scores.
    
    Returns a list of detection dicts:
    [{defect_type, confidence_score, bbox_x, bbox_y, bbox_width, bbox_height}, ...]
    Handles zero detections gracefully returning an empty list.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")

    # Read original image dimensions for accurate scaling to original image resolution
    orig_img = cv2.imread(image_path)
    if orig_img is not None:
        h_orig, w_orig = orig_img.shape[:2]
    else:
        h_orig, w_orig = 640, 640

    # Run image preprocessing pipeline
    preprocessed_rgb = preprocess_image(image_path, target_size=(640, 640))
    h_prep, w_prep = preprocessed_rgb.shape[:2]

    scale_x = w_orig / float(w_prep)
    scale_y = h_orig / float(h_prep)

    # Load singleton model and run inference
    model = get_yolo_model()
    results = model(preprocessed_rgb, verbose=False)

    detections = []
    for result in results:
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            continue

        for box in boxes:
            xyxy = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0].cpu().numpy())
            cls_id = int(box.cls[0].cpu().numpy())

            # Map class ID to human-readable label
            if hasattr(model, "names") and isinstance(model.names, dict) and cls_id in model.names:
                defect_type = str(model.names[cls_id])
            elif hasattr(model, "names") and isinstance(model.names, (list, tuple)) and cls_id < len(model.names):
                defect_type = str(model.names[cls_id])
            else:
                defect_type = f"defect_class_{cls_id}"

            x1, y1, x2, y2 = xyxy
            bbox_x = max(0, int(round(x1 * scale_x)))
            bbox_y = max(0, int(round(y1 * scale_y)))
            bbox_width = max(1, int(round((x2 - x1) * scale_x)))
            bbox_height = max(1, int(round((y2 - y1) * scale_y)))

            detections.append({
                "defect_type": defect_type,
                "confidence_score": round(conf, 4),
                "bbox_x": bbox_x,
                "bbox_y": bbox_y,
                "bbox_width": bbox_width,
                "bbox_height": bbox_height
            })

    return detections
