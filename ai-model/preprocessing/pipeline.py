from PIL import Image
import torch
from pathlib import Path
from .transforms import get_transforms

class PreprocessingPipeline:
    def __init__(self, is_training=False):
        self.transform = get_transforms(is_training)
        
    def validate_image(self, image_path: str) -> bool:
        """
        Validates if the image exists and can be opened.
        """
        path = Path(image_path)
        if not path.exists() or not path.is_file():
            return False
            
        try:
            with Image.open(path) as img:
                img.verify()
            return True
        except Exception:
            return False
            
    def process_image(self, image_path: str) -> torch.Tensor:
        """
        Loads and transforms an image for model input.
        """
        if not self.validate_image(image_path):
            raise ValueError(f"Invalid image: {image_path}")
            
        image = Image.open(image_path).convert('RGB')
        tensor = self.transform(image)
        return tensor

    def batch_process(self, image_paths: list) -> torch.Tensor:
        """
        Processes a batch of images.
        """
        tensors = [self.process_image(p) for p in image_paths]
        return torch.stack(tensors)
