import cv2
import numpy as np

def load_image(image_path: str) -> np.ndarray:
    """
    Load an image from the given path using OpenCV.
    
    Args:
        image_path: Path to the image file.
        
    Returns:
        np.ndarray: Loaded image in BGR format.
        
    Raises:
        FileNotFoundError: If the image cannot be read.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Failed to load image at {image_path}")
    return img

def bgr_to_rgb(image: np.ndarray) -> np.ndarray:
    """Convert an image from BGR to RGB."""
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

def resize_image(image: np.ndarray, size: tuple[int, int] = (224, 224)) -> np.ndarray:
    """Resize the image to the specified size."""
    return cv2.resize(image, size, interpolation=cv2.INTER_LINEAR)

def preprocess_image_cv2(image_path: str, size: tuple[int, int] = (224, 224)) -> np.ndarray:
    """
    Complete OpenCV-based preprocessing pipeline.
    
    Args:
        image_path: Path to the image.
        size: Target size (width, height).
        
    Returns:
        np.ndarray: Preprocessed image in RGB format.
    """
    img = load_image(image_path)
    img = bgr_to_rgb(img)
    img = resize_image(img, size)
    return img
