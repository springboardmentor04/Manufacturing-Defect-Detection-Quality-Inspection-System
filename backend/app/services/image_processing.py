import os
import cv2
import numpy as np
from PIL import Image

def preprocess_image(image_path: str, target_size=(640, 640)) -> np.ndarray:
    """
    Preprocesses an image for YOLO defect detection:
    - Reads image with OpenCV
    - Applies CLAHE contrast enhancement on LAB color space L-channel
    - Applies OpenCV noise reduction
    - Resizes to target model input size (640x640)
    
    Returns the preprocessed image as a numpy BGR/RGB array.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image path not found: {image_path}")

    # Read image in BGR
    img = cv2.imread(image_path)
    if img is None:
        # Fallback using PIL if OpenCV read fails
        pil_img = Image.open(image_path).convert("RGB")
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    # 1. Contrast Enhancement (CLAHE on L-channel of LAB space)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l_channel)
    
    merged_lab = cv2.merge((cl, a_channel, b_channel))
    enhanced_bgr = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)

    # 2. Noise Reduction
    try:
        # Fast non-local means denoising for color images
        denoised = cv2.fastNlMeansDenoisingColored(enhanced_bgr, None, h=5, hColor=5, templateWindowSize=7, searchWindowSize=21)
    except Exception:
        # Fallback to Gaussian blur if fastNlMeans fails
        denoised = cv2.GaussianBlur(enhanced_bgr, (3, 3), 0)

    # 3. Resizing to target model expected input size
    if target_size:
        resized = cv2.resize(denoised, target_size, interpolation=cv2.INTER_AREA)
    else:
        resized = denoised

    # Convert BGR to RGB for PyTorch/YOLO model standard input
    preprocessed_rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    return preprocessed_rgb

def generate_image_quality_report(image_path: str) -> dict:
    """
    Generates a quality report dict for an image:
    - resolution: {width, height}
    - blur_score: Laplacian variance method (higher = sharper, lower = blurry)
    - brightness_mean: mean pixel intensity (0-255)
    - brightness_std: standard deviation of brightness
    - contrast_score: max - min pixel intensity
    """
    if not os.path.exists(image_path):
        return {
            "resolution": {"width": 0, "height": 0},
            "blur_score": 0.0,
            "brightness_mean": 0.0,
            "brightness_std": 0.0,
            "contrast_score": 0.0
        }

    img = cv2.imread(image_path)
    if img is None:
        pil_img = Image.open(image_path).convert("RGB")
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    height, width = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Blur score via Laplacian variance
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness_mean = float(np.mean(gray))
    brightness_std = float(np.std(gray))
    contrast_score = float(np.ptp(gray))  # max - min

    return {
        "resolution": {"width": width, "height": height},
        "blur_score": round(blur_score, 2),
        "brightness_mean": round(brightness_mean, 2),
        "brightness_std": round(brightness_std, 2),
        "contrast_score": round(contrast_score, 2)
    }
