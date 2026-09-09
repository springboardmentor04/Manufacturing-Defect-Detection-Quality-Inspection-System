import cv2
import numpy as np
import torchvision.transforms as transforms
from PIL import Image

def get_transforms(is_train: bool = True):
    """
    Returns torchvision transforms for preprocessing.
    Applies augmentations only if is_train=True.
    """
    # Standard normalization for MVTec/ImageNet-like models
    normalize = transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                     std=[0.229, 0.224, 0.225])

    if is_train:
        # Augmentation for training
        return transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.5),
            transforms.RandomAffine(degrees=15, translate=(0.1, 0.1), scale=(0.9, 1.1), shear=5),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            transforms.ToTensor(),
            normalize,
            transforms.RandomErasing(p=0.3, scale=(0.02, 0.2), ratio=(0.3, 3.3), value=0, inplace=False)
        ])
    else:
        # Strict preprocessing for validation/test/inference
        return transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            normalize
        ])

def preprocess_image_file(image_path: str, transform=None):
    """
    Loads an image from file, converts BGR to RGB, and applies transforms.
    Returns the tensor image.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Failed to read image at {image_path}")
    
    # Convert BGR -> RGB
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    if transform:
        img_tensor = transform(img)
    else:
        # Fallback to test transforms
        default_transform = get_transforms(is_train=False)
        img_tensor = default_transform(img)
        
    return img_tensor
