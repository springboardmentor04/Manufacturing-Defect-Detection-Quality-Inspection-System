"""Non-destructive image validation, preprocessing, and quality analysis."""

from __future__ import annotations

import os
from pathlib import Path

import cv2
import numpy as np

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_BYTES = 15 * 1024 * 1024
MAX_DIMENSION = 12_000


class ImageValidationError(ValueError):
    """Raised when an uploaded inspection image is unsafe or unreadable."""


def validate_image(path: str, declared_size: int | None = None) -> tuple[np.ndarray, dict]:
    image_path = Path(path)
    if image_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ImageValidationError("Unsupported image format. Use JPG, JPEG, PNG, or WEBP.")
    if not image_path.exists() or image_path.stat().st_size == 0:
        raise ImageValidationError("The uploaded image is empty or could not be saved.")
    size = declared_size if declared_size is not None else image_path.stat().st_size
    if size > MAX_IMAGE_BYTES:
        raise ImageValidationError("Image is too large. The maximum supported file size is 15 MB.")
    image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if image is None:
        raise ImageValidationError("The uploaded file is not a readable image or is corrupted.")
    height, width = image.shape[:2]
    if width < 16 or height < 16:
        raise ImageValidationError("Image dimensions are too small for reliable inspection.")
    if width > MAX_DIMENSION or height > MAX_DIMENSION:
        raise ImageValidationError("Image dimensions exceed the supported limit.")
    return image, {"width": width, "height": height, "file_size_bytes": size}


def analyse_image_quality(image: np.ndarray) -> dict:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if sharpness < 35 or brightness < 35 or brightness > 225:
        status = "POOR"
        warning = "Image quality may not support reliable automated inspection. Manual review is recommended."
    elif sharpness < 75 or brightness < 55 or brightness > 205:
        status = "ACCEPTABLE"
        warning = "Image quality is acceptable, but results should be reviewed if the decision is consequential."
    else:
        status = "GOOD"
        warning = None
    return {"brightness": round(brightness, 2), "contrast": round(contrast, 2), "sharpness": round(sharpness, 2), "quality_status": status, "warning": warning}


def preprocess_image(image: np.ndarray, output_path: str) -> str:
    """Create a derived inspection image without altering the uploaded original."""
    height, width = image.shape[:2]
    max_side = 1280
    scale = min(1.0, max_side / max(width, height))
    if scale < 1.0:
        image = cv2.resize(image, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA)
    denoised = cv2.fastNlMeansDenoisingColored(image, None, 3, 3, 7, 21)
    lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    enhanced = cv2.cvtColor(cv2.merge((cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(l), a, b)), cv2.COLOR_LAB2BGR)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if not cv2.imwrite(output_path, enhanced):
        raise RuntimeError("Unable to create the processed inspection image.")
    return output_path
