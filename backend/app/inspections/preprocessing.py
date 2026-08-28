from pathlib import Path
from PIL import Image


def preprocess_image(
    image_path: str,
    output_dir: str = "uploads/preprocessed"
):
    """
    Preprocess image for YOLO inference.

    Steps:
      1. Open & convert to RGB
      2. Scale-to-fit: resize so the shorter dimension = 224 (preserves aspect ratio)
      3. Centre-crop to 224x224 (avoids blind squashing that hides defect detail)
      4. Save as high-quality JPEG
    """
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Open uploaded image & convert to RGB
    image = Image.open(image_path).convert("RGB")

    # Scale so the longest side = 640 (LANCZOS = best quality for downscale)
    # This preserves the aspect ratio and avoids cropping out defects on the edges.
    image.thumbnail((640, 640), Image.Resampling.LANCZOS)

    # Create output filename
    filename = Path(image_path).stem + "_processed.jpg"
    processed_path = output_path / filename

    # Save with high quality to preserve defect texture
    image.save(str(processed_path), "JPEG", quality=95)

    return str(processed_path)