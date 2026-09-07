import cv2
import numpy as np


def preprocess_image(image_path, image_size=(256, 256)):
    """
    Load and preprocess an image for the AI model.

    Steps:
    1. Read image
    2. Convert BGR to RGB
    3. Resize
    4. Normalize pixel values
    """

    image = cv2.imread(image_path)

    if image is None:
        raise FileNotFoundError(f"Image not found: {image_path}")

    # Convert BGR → RGB
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Resize
    image = cv2.resize(image, image_size)

    # Normalize (0–255 → 0–1)
    image = image.astype(np.float32) / 255.0

    return image