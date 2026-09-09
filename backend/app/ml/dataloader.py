from typing import Optional

from sqlalchemy.orm import Session
from torch.utils.data import DataLoader

from app.ml.dataset import MVTecDataset
from app.ml.preprocessing import get_mvtec_transforms


def get_mvtec_dataloader(
    session: Session,
    split: str = "train",
    category_name: Optional[str] = None,
    batch_size: int = 32,
    shuffle: Optional[bool] = None,
    num_workers: int = 4,
    image_size: int = 256,
    crop_size: int = 224,
) -> DataLoader:
    """
    Creates a PyTorch DataLoader for the MVTec AD dataset.
    """
    is_train = split == "train"
    
    # Default to shuffling for training, no shuffling for testing
    if shuffle is None:
        shuffle = is_train

    transform = get_mvtec_transforms(
        image_size=image_size, 
        crop_size=crop_size, 
        is_train=is_train
    )

    dataset = MVTecDataset(
        session=session,
        split=split,
        category_name=category_name,
        transform=transform,
    )

    dataloader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        pin_memory=True,
    )

    return dataloader
