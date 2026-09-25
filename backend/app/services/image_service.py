from pathlib import Path
import cv2
import numpy as np
from fastapi import UploadFile, HTTPException
from .yolo_service import IMAGE_EXTENSIONS

def validate_and_save(upload: UploadFile, destination: Path, max_bytes: int):
    if not upload.filename:
        raise HTTPException(400, "No image file supplied")
    suffix = Path(upload.filename).suffix.lower()
    if suffix not in IMAGE_EXTENSIONS:
        raise HTTPException(400, "Unsupported image. Use JPG, JPEG, PNG or WEBP.")
    data = upload.file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(400, "Image exceeds the configured size limit.")
    arr = np.frombuffer(data, np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None or image.size == 0:
        raise HTTPException(400, "The uploaded image is corrupt or unreadable.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return image

def quality_metrics(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = image.shape[:2]
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(gray.mean())
    contrast = float(gray.std())
    return {
        "width": w, "height": h, "blur_score": round(blur, 2),
        "brightness": round(brightness, 2), "contrast": round(contrast, 2),
        "readable": True,
    }

def quality_is_poor(metrics):
    return metrics["width"] < 224 or metrics["height"] < 224 or metrics["blur_score"] < 25 or metrics["brightness"] < 20 or metrics["brightness"] > 245
