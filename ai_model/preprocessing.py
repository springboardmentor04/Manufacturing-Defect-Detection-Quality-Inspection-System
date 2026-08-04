"""
VisionInspect AI - OpenCV Image Preprocessing Module
Handles noise removal, CLAHE contrast enhancement, edge detection, and ROI cropping.
"""

import cv2
import numpy as np

class ImagePreprocessor:
    def __init__(self, target_size=(512, 512)):
        self.target_size = target_size

    def remove_noise(self, image: np.ndarray, method: str = "gaussian", ksize: int = 5) -> np.ndarray:
        """
        Removes sensor/industrial high-frequency noise.
        """
        if method == "median":
            return cv2.medianBlur(image, ksize)
        elif method == "bilateral":
            return cv2.bilateralFilter(image, 9, 75, 75)
        else:
            return cv2.GaussianBlur(image, (ksize, ksize), 0)

    def enhance_contrast(self, image: np.ndarray, clip_limit: float = 2.0, tile_grid_size=(8, 8)) -> np.ndarray:
        """
        Applies Contrast Limited Adaptive Histogram Equalization (CLAHE) for dark/metallic defects.
        """
        if len(image.shape) == 3:
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
            cl = clahe.apply(l)
            limg = cv2.merge((cl, a, b))
            return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        else:
            clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
            return clahe.apply(image)

    def detect_edges(self, image: np.ndarray, low_thresh: int = 50, high_thresh: int = 150) -> np.ndarray:
        """
        Extracts structural edge contours using Canny.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        return cv2.Canny(gray, low_thresh, high_thresh)

    def process_pipeline(self, image: np.ndarray, config: dict) -> dict:
        """
        Executes configurable image preprocessing pipeline.
        """
        processed = cv2.resize(image, self.target_size)
        
        if config.get("noise_removal", True):
            processed = self.remove_noise(processed)
        if config.get("clahe_contrast", True):
            processed = self.enhance_contrast(processed)
            
        edges = self.detect_edges(processed) if config.get("edge_detection", False) else None
        
        return {
            "processed_image": processed,
            "edges": edges,
            "target_size": self.target_size
        }
