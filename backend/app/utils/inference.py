import os
import math
import cv2
from ultralytics import YOLO

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models", "best.pt")

# Lazy-loaded model instance
_model = None

def get_yolo_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"YOLO model weight file not found at {MODEL_PATH}")
        _model = YOLO(MODEL_PATH)
    return _model

def preprocess_image(image_path: str, save_path: str, blur_kernel: int = 5, clahe_clip: float = 2.0) -> dict:
    """
    Applies Gaussian Blur for noise removal and CLAHE on LAB color space for image enhancement.
    Saves the preprocessed image and returns metadata.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Failed to load image from {image_path}")

    # 1. Noise removal using Gaussian Blur
    if blur_kernel > 0:
        # Ensure kernel size is odd
        if blur_kernel % 2 == 0:
            blur_kernel += 1
        img_blur = cv2.GaussianBlur(img, (blur_kernel, blur_kernel), 0)
    else:
        img_blur = img.copy()

    # 2. Image enhancement using CLAHE (on LAB L-channel to preserve colors)
    if clahe_clip > 0:
        lab = cv2.cvtColor(img_blur, cv2.COLOR_BGR2LAB)
        l_channel, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=clahe_clip, tileGridSize=(8, 8))
        cl = clahe.apply(l_channel)
        limg = cv2.merge((cl, a, b))
        img_enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    else:
        img_enhanced = img_blur

    # Save output image
    cv2.imwrite(save_path, img_enhanced)

    return {
        "blur_kernel": blur_kernel,
        "clahe_clip": clahe_clip,
        "processed": True
    }

def run_defect_detection(image_path: str, annotated_save_path: str, confidence_threshold: float = 0.25) -> list[dict]:
    """
    Runs YOLO defect detection on the image. Saves an annotated version of the image and
    returns a list of detections with box coordinates, confidences, and labels.
    """
    model = get_yolo_model()
    results = model(image_path, conf=confidence_threshold)
    
    detections = []
    if not results or len(results) == 0:
        return detections
        
    result = results[0]
    
    # Save the annotated image
    annotated_img = result.plot()
    cv2.imwrite(annotated_save_path, annotated_img)
    
    # Extract details
    if result.boxes:
        for box in result.boxes:
            xyxy = box.xyxy[0].tolist()  # [xmin, ymin, xmax, ymax]
            conf = float(box.conf[0].item())
            cls = int(box.cls[0].item())
            class_name = result.names[cls] if cls in result.names else "defect"
            
            detections.append({
                "class_id": cls,
                "class_name": class_name,
                "confidence": conf,
                "bbox": xyxy
            })
            
    return detections

def calculate_severity_and_decision(
    detections: list[dict], 
    image_width: int, 
    image_height: int, 
    category: str = None
) -> dict:
    """
    Calculates severity score, level, and quality control decision based on detection details.
    
    Formula params:
    - Size (30%): Bbox Area / Image Area
    - Location (25%): Proximity to image center (critical component area)
    - Type (25%): Default defect seriousness baseline
    - Confidence (20%): Model prediction confidence
    """
    if not detections:
        return {
            "defect_detected": False,
            "defect_count": 0,
            "severity_score": 0.0,
            "severity_level": "Low",
            "decision": "Pass",
            "defects_details": []
        }

    image_area = image_width * image_height
    center_x = image_width / 2.0
    center_y = image_height / 2.0
    max_distance = math.sqrt(center_x**2 + center_y**2)
    
    processed_detections = []
    max_severity_score = 0.0
    has_low_confidence = False

    for det in detections:
        bbox = det["bbox"]  # [xmin, ymin, xmax, ymax]
        conf = det["confidence"]
        
        # 1. Size score (30%) - Area relative to image size.
        # Assume a defect occupying 5% of the total image area is 100% size score.
        bbox_width = bbox[2] - bbox[0]
        bbox_height = bbox[3] - bbox[1]
        bbox_area = bbox_width * bbox_height
        size_percent = (bbox_area / image_area) * 100.0
        size_score = min(100.0, size_percent * 20.0)
        
        # 2. Location score (25%) - Closer to center of image is more critical (functional area)
        det_center_x = (bbox[0] + bbox[2]) / 2.0
        det_center_y = (bbox[1] + bbox[3]) / 2.0
        distance = math.sqrt((det_center_x - center_x)**2 + (det_center_y - center_y)**2)
        location_score = max(0.0, (1.0 - (distance / max_distance)) * 100.0)
        
        # 3. Type score (25%) - Default defect baseline. Structural categories are higher severity.
        structural_categories = {"cable", "transistor", "capsule", "screw", "grid"}
        type_score = 90.0 if category and category.lower() in structural_categories else 80.0
        
        # 4. Confidence score (20%)
        confidence_score = conf * 100.0
        
        # Compute overall severity for this individual defect
        severity = (size_score * 0.30) + (location_score * 0.25) + (type_score * 0.25) + (confidence_score * 0.20)
        max_severity_score = max(max_severity_score, severity)
        
        if conf < 0.70:
            has_low_confidence = True
            
        processed_detections.append({
            "class_name": det["class_name"],
            "confidence": conf,
            "bbox": bbox,
            "size_score": round(size_score, 1),
            "location_score": round(location_score, 1),
            "type_score": round(type_score, 1),
            "confidence_score": round(confidence_score, 1),
            "severity_score": round(severity, 1)
        })

    # Severity levels matching proposal
    if max_severity_score >= 80.0:
        severity_level = "Critical"
    elif max_severity_score >= 60.0:
        severity_level = "High"
    elif max_severity_score >= 40.0:
        severity_level = "Medium"
    else:
        severity_level = "Low"

    # Quality control decisions:
    # Low confidence (< 70%) always triggers Manual Review for safety verification
    if has_low_confidence:
        decision = "Manual Review"
    elif severity_level in ("Critical", "High"):
        decision = "Fail"
    elif severity_level == "Medium":
        decision = "Manual Review"
    else:
        decision = "Pass"

    return {
        "defect_detected": True,
        "defect_count": len(detections),
        "severity_score": round(max_severity_score, 1),
        "severity_level": severity_level,
        "decision": decision,
        "defects_details": processed_detections
    }
