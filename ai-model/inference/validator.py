import os
from pathlib import Path
from PIL import Image

class ImageValidator:
    ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp'}
    
    @staticmethod
    def validate(image_path: str) -> bool:
        path = Path(image_path)
        
        if not path.exists():
            raise FileNotFoundError(f"Image not found at {path}")
            
        if path.suffix.lower() not in ImageValidator.ALLOWED_EXTENSIONS:
            raise ValueError(f"Invalid image format. Allowed: {ImageValidator.ALLOWED_EXTENSIONS}")
            
        try:
            with Image.open(path) as img:
                img.verify() # verify it is readable
                
                # Check reasonable dimensions (e.g., > 10x10)
                width, height = img.size
                if width < 10 or height < 10:
                    raise ValueError(f"Image dimensions too small: {img.size}")
                    
        except Exception as e:
            raise ValueError(f"Image is unreadable or corrupted: {e}")
            
        return True
