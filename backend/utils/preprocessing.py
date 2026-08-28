import io
import cv2
import numpy as np
from PIL import Image


def decode_image_bytes(file_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image file format.")
    return img


def resize_and_normalize(
    image: np.ndarray, target_size: tuple = (640, 640)
) -> np.ndarray:
    rgb_img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    resized_img = cv2.resize(rgb_img, target_size, interpolation=cv2.INTER_LINEAR)
    normalized_matrix = resized_img.astype(np.float32) / 255.0
    return normalized_matrix


def preprocess_for_inference(
    file_bytes: bytes, target_size: tuple = (640, 640)
) -> tuple[np.ndarray, np.ndarray]:
    original_bgr = decode_image_bytes(file_bytes)
    preprocessed_tensor = resize_and_normalize(
        original_bgr, target_size=target_size
    )
    return original_bgr, preprocessed_tensor