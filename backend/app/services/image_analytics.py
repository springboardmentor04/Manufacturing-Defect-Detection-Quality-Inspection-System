import cv2
import numpy as np
import os
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def analyze_image_quality(image_path: str) -> Dict[str, Any]:
    """
    Perform a deterministic image-quality analysis using OpenCV.
    Does not modify the image or the AI result.
    """
    try:
        # File basic details
        file_size_bytes = os.path.getsize(image_path)
        _, ext = os.path.splitext(image_path)
        
        # Read image
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Could not read image at {image_path}")
            
        height, width, channels = img.shape
        
        # Convert to grayscale for calculations
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Mean brightness
        mean_brightness = float(np.mean(gray))
        
        # Contrast (standard deviation of pixel values)
        contrast = float(np.std(gray))
        
        # Sharpness (Variance of Laplacian)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        sharpness = float(np.var(laplacian))
        
        # Determine basic quality status
        # These are basic heuristics, not arbitrary defect rules.
        status = "GOOD"
        
        if sharpness < 100.0: # Arbitrary threshold for blurriness
            status = "POOR"
        elif mean_brightness < 20 or mean_brightness > 235:
            # Over or under exposed
            status = "POOR"
        elif contrast < 20:
            # Very low contrast
            status = "ACCEPTABLE"
            
        return {
            "width": width,
            "height": height,
            "channels": channels,
            "mean_brightness": round(mean_brightness, 2),
            "contrast": round(contrast, 2),
            "sharpness": round(sharpness, 2),
            "quality_status": status,
            "format": ext.lower().replace(".", ""),
            "file_size_bytes": file_size_bytes
        }
        
    except Exception as e:
        logger.error(f"Error in image quality analysis: {e}")
        return {
            "error": str(e),
            "quality_status": "UNKNOWN"
        }

def calculate_inspection_analytics(image_quality: Dict[str, Any], yolo_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculates higher-level analytics based on YOLO bounding boxes and masks.
    Does NOT override YOLO result.
    """
    try:
        boxes = yolo_result.get("bounding_boxes", [])
        masks = yolo_result.get("segmentation_masks", [])
        confidences = []
        
        defect_count = len(boxes)
        
        overall_conf = yolo_result.get("confidence", 0.0)
        
        # Defect Coverage percentage
        coverage_pct = 0.0
        width = image_quality.get("width", 1)
        height = image_quality.get("height", 1)
        
        if masks and len(masks) > 0:
            total_mask_area = 0.0
            for mask in masks:
                points = np.array(mask)
                points[:, 0] *= width
                points[:, 1] *= height
                area = cv2.contourArea(points.astype(np.float32))
                total_mask_area += area
                
            image_area = width * height
            if image_area > 0:
                coverage_pct = (total_mask_area / image_area) * 100
            
        elif boxes and len(boxes) > 0:
            total_box_area = 0.0
            for box in boxes:
                w = (box[2] - box[0]) * width
                h = (box[3] - box[1]) * height
                total_box_area += (w * h)
                
            image_area = width * height
            if image_area > 0:
                coverage_pct = (total_box_area / image_area) * 100
            
        coverage_pct = min(coverage_pct, 100.0)
        
        return {
            "defect_count": defect_count,
            "detected_defect_types": [yolo_result.get("defect_type")] if (defect_count > 0 and yolo_result.get("defect_type") != "None") else [],
            "highest_confidence": round(overall_conf, 2),
            "average_confidence": round(overall_conf, 2),
            "defect_coverage_percentage": round(coverage_pct, 2),
            "processing_time_ms": yolo_result.get("processing_time_ms", 0),
            "inspection_result": yolo_result.get("prediction", "UNKNOWN")
        }
    except Exception as e:
        logger.error(f"Error in image analytics: {e}")
        return {
            "error": str(e)
        }
