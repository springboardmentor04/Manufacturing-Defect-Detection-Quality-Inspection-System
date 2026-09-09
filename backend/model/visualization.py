import cv2
import numpy as np
import matplotlib.pyplot as plt
from typing import Optional, Tuple

def normalize_heatmap(heatmap: np.ndarray) -> np.ndarray:
    """Normalize heatmap to 0-255 range for visualization."""
    heatmap_min, heatmap_max = heatmap.min(), heatmap.max()
    if heatmap_max > heatmap_min:
        heatmap_norm = (heatmap - heatmap_min) / (heatmap_max - heatmap_min)
    else:
        heatmap_norm = heatmap
    return (heatmap_norm * 255).astype(np.uint8)

def overlay_heatmap(image: np.ndarray, heatmap: np.ndarray, alpha: float = 0.5, colormap: int = cv2.COLORMAP_JET) -> np.ndarray:
    """
    Overlay a heatmap onto an image.
    
    Args:
        image: Original RGB image array (H, W, 3).
        heatmap: 2D array of anomaly scores (H, W).
        alpha: Transparency of the heatmap.
        colormap: OpenCV colormap to use.
        
    Returns:
        Overlaid image array.
    """
    # Ensure image is in BGR for OpenCV processing, although we will return it in RGB
    if len(image.shape) == 3 and image.shape[2] == 3:
        image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    else:
        image_bgr = image
        
    # Normalize heatmap and apply colormap
    heatmap_norm = normalize_heatmap(heatmap)
    heatmap_color = cv2.applyColorMap(heatmap_norm, colormap)
    
    # Overlay
    overlaid = cv2.addWeighted(image_bgr, 1 - alpha, heatmap_color, alpha, 0)
    
    # Convert back to RGB for return
    return cv2.cvtColor(overlaid, cv2.COLOR_BGR2RGB)

def generate_segmentation_mask(heatmap: np.ndarray, threshold: float = 0.5) -> np.ndarray:
    """
    Generate a binary segmentation mask based on a threshold.
    
    Args:
        heatmap: 2D array of anomaly scores (0 to 1).
        threshold: Score above which a pixel is considered anomalous.
        
    Returns:
        Binary mask (H, W) where 255 is anomalous, 0 is normal.
    """
    mask = (heatmap > threshold).astype(np.uint8) * 255
    return mask

def generate_defect_localization(image: np.ndarray, mask: np.ndarray) -> Tuple[np.ndarray, list]:
    """
    Draw bounding boxes around defects based on the segmentation mask.
    
    Args:
        image: Original RGB image.
        mask: Binary segmentation mask (255 for defect).
        
    Returns:
        Image with bounding boxes drawn, list of bounding boxes (x, y, w, h).
    """
    image_draw = image.copy()
    
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bboxes = []
    for contour in contours:
        # Filter small noisy contours if necessary
        if cv2.contourArea(contour) > 10:
            x, y, w, h = cv2.boundingRect(contour)
            bboxes.append((x, y, w, h))
            cv2.rectangle(image_draw, (x, y), (x + w, y + h), (255, 0, 0), 2)
            
    return image_draw, bboxes
