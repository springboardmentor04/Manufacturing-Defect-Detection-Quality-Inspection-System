import os
import glob
from pathlib import Path
from typing import Tuple, List, Dict
import torch
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from sklearn.model_selection import train_test_split
from .preprocessing import preprocess_image_file, get_transforms

def get_all_images(dataset_path: str) -> Tuple[List[str], List[int], Dict[str, int]]:
    """
    Scans the MVTec dataset folder and returns a list of all image paths
    and their corresponding defect category labels (e.g. 0 = bent, 1 = broken).
    """
    root_dir = Path(dataset_path)
    image_paths = []
    labels = []

    if (root_dir / 'train').exists() or (root_dir / 'test').exists():
        category_dirs = [root_dir]
    else:
        category_dirs = [d for d in root_dir.iterdir() if d.is_dir()]

    defect_types = set()
    for cat_dir in category_dirs:
        for split in ['train', 'test']:
            split_dir = cat_dir / split
            if not split_dir.exists(): continue
            for defect_dir in [d for d in os.scandir(split_dir) if d.is_dir()]:
                raw_defect = defect_dir.name
                base_defect = raw_defect.split('_')[0]
                if base_defect == 'squeezed': base_defect = 'squeeze'
                defect_types.add(base_defect)
                
    defect_types = sorted(list(defect_types))
    class_to_idx = {name: idx for idx, name in enumerate(defect_types)}
    
    for cat_dir in category_dirs:
        for split in ['train', 'test']:
            split_dir = cat_dir / split
            if not split_dir.exists(): continue
            for defect_dir in [d for d in os.scandir(split_dir) if d.is_dir()]:
                raw_defect = defect_dir.name
                base_defect = raw_defect.split('_')[0]
                if base_defect == 'squeezed': base_defect = 'squeeze'
                
                idx = class_to_idx[base_defect]
                
                img_files = glob.glob(str(Path(defect_dir.path) / '*.png'))
                for img_path in img_files:
                    image_paths.append(img_path)
                    labels.append(idx)
                    
    return image_paths, labels, class_to_idx

class DefectDataset(Dataset):
    """
    PyTorch Dataset for multi-class object classification.
    """
    def __init__(self, image_paths: List[str], labels: List[int], is_train: bool = True):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = get_transforms(is_train=is_train)
        
    def __len__(self) -> int:
        return len(self.image_paths)
        
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        img_path = self.image_paths[idx]
        label = self.labels[idx]
        
        # preprocess_image_file handles BGR->RGB and apply transform
        img_tensor = preprocess_image_file(img_path, transform=self.transform)
        
        return img_tensor, label

def create_dataloaders(dataset_path: str, batch_size: int = 32, seed: int = 42) -> Tuple[DataLoader, DataLoader, DataLoader, Dict[str, int]]:
    """
    Splits the dataset into train/val/test and creates dataloaders.
    Uses WeightedRandomSampler for training to handle class imbalance.
    """
    image_paths, labels, class_to_idx = get_all_images(dataset_path)
    
    if len(image_paths) == 0:
        raise ValueError(f"No images found in dataset path: {dataset_path}")

    # Split into Train (70%), Temp (30%)
    try:
        train_paths, temp_paths, train_labels, temp_labels = train_test_split(
            image_paths, labels, test_size=0.3, random_state=seed, stratify=labels
        )
    except ValueError:
        # Fallback if too small for stratify
        train_paths, temp_paths, train_labels, temp_labels = train_test_split(
            image_paths, labels, test_size=0.3, random_state=seed
        )
    
    # Split Temp into Validation (15%), Test (15%)
    try:
        val_paths, test_paths, val_labels, test_labels = train_test_split(
            temp_paths, temp_labels, test_size=0.5, random_state=seed, stratify=temp_labels
        )
    except ValueError:
        val_paths, test_paths, val_labels, test_labels = train_test_split(
            temp_paths, temp_labels, test_size=0.5, random_state=seed
        )
    
    print("==================================================")
    print("DATASET SPLIT SUMMARY")
    print("==================================================")
    print(f"Total Images: {len(image_paths)}")
    print(f"Training: {len(train_paths)}")
    print(f"Validation: {len(val_paths)}")
    print(f"Testing: {len(test_paths)}")
    print(f"Classes: {class_to_idx}")
    print("==================================================")

    train_dataset = DefectDataset(train_paths, train_labels, is_train=True)
    val_dataset = DefectDataset(val_paths, val_labels, is_train=False)
    test_dataset = DefectDataset(test_paths, test_labels, is_train=False)
    
    num_classes = len(class_to_idx)
    
    # Calculate weights for WeightedRandomSampler
    class_counts = [train_labels.count(i) for i in range(num_classes)]
    class_weights = [1.0 / count if count > 0 else 0 for count in class_counts]
    sample_weights = [class_weights[label] for label in train_labels]
    
    sampler = WeightedRandomSampler(weights=sample_weights, num_samples=len(sample_weights), replacement=True)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, sampler=sampler)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    return train_loader, val_loader, test_loader, class_to_idx

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Test dataset loader")
    parser.add_argument("--dataset_path", type=str, default="../data/archive", help="Path to the dataset directory")
    args = parser.parse_args()

    try:
        train_loader, val_loader, test_loader, class_to_idx = create_dataloaders(args.dataset_path, batch_size=16)
        print(f"Train Loader batches: {len(train_loader)}")
        print(f"Val Loader batches: {len(val_loader)}")
        print(f"Test Loader batches: {len(test_loader)}")
        
        # Test fetching a batch
        if len(train_loader) > 0:
            images, labels = next(iter(train_loader))
            print(f"Batch Image Shape: {images.shape}")
            print(f"Batch Labels: {labels}")
    except Exception as e:
        print(f"Error testing dataset loader: {e}")
