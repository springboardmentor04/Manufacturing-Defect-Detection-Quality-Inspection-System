import torchvision.transforms as T
from config.config import config

def get_transforms(is_training=True):
    """
    Returns composed transforms for training or inference.
    """
    if is_training:
        return T.Compose([
            T.Resize(config.IMAGE_SIZE),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], 
                        std=[0.229, 0.224, 0.225])
        ])
    else:
        return T.Compose([
            T.Resize(config.IMAGE_SIZE),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], 
                        std=[0.229, 0.224, 0.225])
        ])
