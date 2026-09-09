import torch
from torchvision import transforms

def get_train_transforms(image_size: int = 224) -> transforms.Compose:
    """
    Get torchvision transforms for training (PatchCore doesn't typically use data augmentation,
    so we just resize and normalize).
    
    Args:
        image_size: Target image size (default 224 for ResNet).
        
    Returns:
        transforms.Compose: Composed transforms.
    """
    return transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

def get_test_transforms(image_size: int = 224) -> transforms.Compose:
    """
    Get torchvision transforms for testing.
    
    Args:
        image_size: Target image size (default 224 for ResNet).
        
    Returns:
        transforms.Compose: Composed transforms.
    """
    return transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
