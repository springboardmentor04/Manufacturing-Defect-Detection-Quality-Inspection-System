import os
import glob
from pathlib import Path
from typing import Tuple, List, Optional
import torch
from torch.utils.data import Dataset
from .preprocessing import load_image, bgr_to_rgb

class MVTecDataset(Dataset):
    """
    Custom PyTorch dataset for loading the MVTec AD dataset.
    
    Expected folder structure:
    root_dir/
      train/
        good/
          img1.png
          ...
      test/
        good/
        defect_type_1/
        defect_type_2/
        ...
      ground_truth/
        defect_type_1/
        ...
    """
    
    def __init__(self, root_dir: str, split: str = 'train', transform=None, target_transform=None):
        """
        Args:
            root_dir: Root directory of the dataset category (e.g., path/to/bottle).
            split: 'train' or 'test'.
            transform: Optional transform to be applied on an image.
            target_transform: Optional transform to be applied on a ground truth mask.
        """
        self.root_dir = Path(root_dir)
        self.split = split
        self.transform = transform
        self.target_transform = target_transform
        
        self.image_paths: List[str] = []
        self.labels: List[int] = [] # 0 for good, 1 for defective
        self.mask_paths: List[Optional[str]] = []
        self.defect_types: List[str] = []
        
        self._load_dataset()

    def _load_dataset(self):
        split_dir = self.root_dir / self.split
        
        if not split_dir.exists():
            raise FileNotFoundError(f"Dataset directory {split_dir} not found.")
            
        if self.split == 'train':
            # Training only contains good images
            good_dir = split_dir / 'good'
            img_files = sorted(glob.glob(str(good_dir / '*.png')))
            for img_path in img_files:
                self.image_paths.append(img_path)
                self.labels.append(0)
                self.mask_paths.append(None)
                self.defect_types.append('good')
                
        elif self.split == 'test':
            # Test contains both good and defective images
            defect_types = [d.name for d in os.scandir(split_dir) if d.is_dir()]
            
            for d_type in sorted(defect_types):
                img_files = sorted(glob.glob(str(split_dir / d_type / '*.png')))
                label = 0 if d_type == 'good' else 1
                
                for img_path in img_files:
                    self.image_paths.append(img_path)
                    self.labels.append(label)
                    self.defect_types.append(d_type)
                    
                    if label == 1:
                        # Find corresponding ground truth mask
                        img_name = Path(img_path).name
                        mask_name = img_name.replace('.png', '_mask.png')
                        mask_path = self.root_dir / 'ground_truth' / d_type / mask_name
                        if mask_path.exists():
                            self.mask_paths.append(str(mask_path))
                        else:
                            # Try without _mask suffix if not found
                            mask_path = self.root_dir / 'ground_truth' / d_type / img_name
                            if mask_path.exists():
                                self.mask_paths.append(str(mask_path))
                            else:
                                self.mask_paths.append(None)
                    else:
                        self.mask_paths.append(None)

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int, Optional[torch.Tensor], str, str]:
        img_path = self.image_paths[idx]
        label = self.labels[idx]
        mask_path = self.mask_paths[idx]
        defect_type = self.defect_types[idx]
        
        # Load and convert image
        img = load_image(img_path)
        img = bgr_to_rgb(img)
        
        if self.transform:
            img = self.transform(img)
            
        if mask_path is not None:
            mask_img = load_image(mask_path)
            # Use only one channel for mask
            mask_img = mask_img[:, :, 0]
            # Binarize mask
            mask_img = (mask_img > 0).astype('float32')
            if self.target_transform:
                mask = self.target_transform(mask_img)
            else:
                mask = torch.from_numpy(mask_img).unsqueeze(0)
        else:
            # For good images, create a blank (zero) mask of the same size
            # img is already a tensor (C, H, W) if transformed, else numpy (H, W, C)
            if isinstance(img, torch.Tensor):
                mask = torch.zeros((1, img.shape[1], img.shape[2]), dtype=torch.float32)
            else:
                mask = torch.zeros((1, img.shape[0], img.shape[1]), dtype=torch.float32)
        
        return img, label, mask, defect_type, img_path
