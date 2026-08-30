"""
Image Processing Module (Milestone 2, Week 3 & 4).

Two responsibilities:
  1. preprocess_image()  - denoise, contrast-enhance and normalize a raw
     uploaded product image before it is handed to the defect detection
     engine. The cleaned-up array is what the model actually "sees".
  2. analyze_quality()   - produce an image quality analysis report
     (sharpness, brightness, contrast, resolution) so Quality Engineers
     know whether a photo is even good enough to trust the inspection
     result.
"""
import os
import cv2
import numpy as np

IDEAL_BRIGHTNESS = 130.0
MIN_SHARPNESS = 60.0        # Laplacian variance below this = blurry
MIN_RESOLUTION = 128        # px, shorter side


def _read_bgr(path: str) -> np.ndarray:
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Could not read image at {path}")
    return img


def preprocess_image(path: str, size: int = 256) -> np.ndarray:
    """
    Full preprocessing pipeline used before defect detection:
      resize -> denoise -> CLAHE contrast enhancement -> normalize.
    Returns a single-channel (grayscale) float32 array in [0, 1],
    resized to (size, size).
    """
    img = _read_bgr(path)
    img = cv2.resize(img, (size, size), interpolation=cv2.INTER_AREA)

    # Noise removal
    img = cv2.fastNlMeansDenoisingColored(img, None, 5, 5, 7, 15)

    # Contrast enhancement (CLAHE on the L channel of LAB space)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    img = cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    normalized = gray.astype(np.float32) / 255.0
    return normalized


def analyze_quality(path: str) -> dict:
    """Produce an image quality analysis report for the raw upload."""
    img = _read_bgr(path)
    height, width = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    sharpness_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness_mean = float(gray.mean())
    contrast_std = float(gray.std())
    file_size_kb = round(os.path.getsize(path) / 1024, 1)

    blur_flag = sharpness_score < MIN_SHARPNESS

    if brightness_mean < 70:
        brightness_flag = "too dark"
    elif brightness_mean > 200:
        brightness_flag = "too bright"
    else:
        brightness_flag = "ok"

    low_res_flag = min(width, height) < MIN_RESOLUTION

    # Composite 0-100 score: reward sharpness + contrast, penalize
    # brightness deviation from the ideal midtone.
    sharpness_component = min(sharpness_score / 300.0, 1.0) * 40
    contrast_component = min(contrast_std / 70.0, 1.0) * 30
    brightness_component = max(0.0, 1 - abs(brightness_mean - IDEAL_BRIGHTNESS) / IDEAL_BRIGHTNESS) * 30
    quality_score = round(sharpness_component + contrast_component + brightness_component, 1)

    recommendations = []
    if blur_flag:
        recommendations.append("Image appears blurry — retake with a steadier camera or better focus.")
    if brightness_flag != "ok":
        recommendations.append(f"Lighting is {brightness_flag} — adjust illumination before re-inspecting.")
    if low_res_flag:
        recommendations.append("Resolution is low — use a higher-resolution capture for reliable detection.")
    if not recommendations:
        recommendations.append("Image quality is sufficient for automated inspection.")

    return {
        "width": width,
        "height": height,
        "file_size_kb": file_size_kb,
        "sharpness_score": round(sharpness_score, 1),
        "brightness_mean": round(brightness_mean, 1),
        "contrast_std": round(contrast_std, 1),
        "quality_score": quality_score,
        "blur_flag": blur_flag,
        "brightness_flag": brightness_flag,
        "recommendation": " ".join(recommendations),
    }