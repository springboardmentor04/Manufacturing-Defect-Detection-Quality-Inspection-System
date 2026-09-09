from pathlib import Path
from typing import Callable, Optional

import torch
from PIL import Image
from sqlalchemy import select
from sqlalchemy.orm import Session
from torch.utils.data import Dataset

from app.core.config import get_settings
from app.models.enums import InspectionImageSource
from app.models.inspection_image import InspectionImage


class MVTecDataset(Dataset):
    """
    PyTorch Dataset for MVTec AD images loaded from the database.
    """

    def __init__(
        self,
        session: Session,
        split: str = "train",
        category_name: Optional[str] = None,
        transform: Optional[Callable] = None,
    ):
        super().__init__()
        if split not in {"train", "test"}:
            raise ValueError("split must be 'train' or 'test'")

        self.transform = transform
        self.settings = get_settings()
        self.storage_root = Path(self.settings.storage_root)

        # Build query for MVTec images
        query = select(InspectionImage).where(
            InspectionImage.source == InspectionImageSource.mvtec_dataset
        )

        # Filter by category if provided (e.g., "bottle")
        if category_name:
            query = query.where(InspectionImage.category.startswith(f"{category_name}/"))

        images = session.execute(query).scalars().all()

        # Filter by split by checking the storage path (which contains the split)
        self.samples = []
        for img in images:
            if img.storage_path and f"/{split}/" in img.storage_path:
                self.samples.append(img)

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        img_record = self.samples[idx]
        image_path = self.storage_root / img_record.storage_path

        # Load image using PIL
        image = Image.open(image_path).convert("RGB")
        
        if self.transform:
            image = self.transform(image)

        # In MVTec, category format is usually '{product}/{defect}'
        # Normal images have defect 'good', anomalous have anything else
        is_good = img_record.category and img_record.category.endswith("/good")
        label = 0 if is_good else 1

        return image, label
