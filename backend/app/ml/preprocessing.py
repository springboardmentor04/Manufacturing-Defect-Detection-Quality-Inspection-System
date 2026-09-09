import torchvision.transforms as T

def get_mvtec_transforms(image_size: int = 256, crop_size: int = 224, is_train: bool = True):
    """
    Returns standard torchvision transforms for MVTec AD dataset.
    """
    if is_train:
        return T.Compose([
            T.Resize((image_size, image_size)),
            T.RandomCrop(crop_size),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    else:
        return T.Compose([
            T.Resize((image_size, image_size)),
            T.CenterCrop(crop_size),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
