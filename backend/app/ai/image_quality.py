import cv2
from pathlib import Path


def analyze_image_quality(image_path: str):
    """
    Analyze uploaded image quality using OpenCV.

    Returns:
        resolution
        width
        height
        brightness
        contrast
        blur_score
        quality_score
        quality_status
        recommendation
    """

    path = Path(image_path)

    # -----------------------------------------
    # Check file exists
    # -----------------------------------------

    if not path.exists():
        raise FileNotFoundError(
            f"Image not found: {image_path}"
        )

    # -----------------------------------------
    # Read image
    # -----------------------------------------

    image = cv2.imread(str(path))

    if image is None:
        raise ValueError(
            "Unable to read uploaded image."
        )

    # -----------------------------------------
    # Resolution
    # -----------------------------------------

    height, width = image.shape[:2]

    resolution = f"{width} x {height}"

    # -----------------------------------------
    # Convert to grayscale
    # -----------------------------------------

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    # -----------------------------------------
    # Brightness
    # -----------------------------------------

    brightness = float(gray.mean())

    # -----------------------------------------
    # Contrast
    # -----------------------------------------

    contrast = float(gray.std())

    # -----------------------------------------
    # Blur detection
    #
    # Variance of Laplacian
    # Higher = sharper image
    # Lower = more blurry
    # -----------------------------------------

    blur_score = float(
        cv2.Laplacian(
            gray,
            cv2.CV_64F
        ).var()
    )

    # -----------------------------------------
    # Quality scoring
    # -----------------------------------------

    score = 100

    # Resolution check
    if width < 640 or height < 480:
        score -= 20

    # Brightness check
    if brightness < 50:
        score -= 20
    elif brightness > 220:
        score -= 15

    # Contrast check
    if contrast < 25:
        score -= 15

    # Blur check
    if blur_score < 50:
        score -= 30
    elif blur_score < 100:
        score -= 15

    # Keep score between 0 and 100
    score = max(0, min(100, score))

    # -----------------------------------------
    # Quality status
    # -----------------------------------------

    if score >= 80:
        quality_status = "Good"
        recommendation = "Image quality is suitable for AI inspection."

    elif score >= 60:
        quality_status = "Acceptable"
        recommendation = "Image can be inspected, but quality could be improved."

    else:
        quality_status = "Poor"
        recommendation = "Retake image with better lighting, focus and resolution."

    # -----------------------------------------
    # Return report
    # -----------------------------------------

    return {
        "resolution": resolution,
        "width": width,
        "height": height,
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "blur_score": round(blur_score, 2),
        "quality_score": score,
        "quality_status": quality_status,
        "recommendation": recommendation,
    }