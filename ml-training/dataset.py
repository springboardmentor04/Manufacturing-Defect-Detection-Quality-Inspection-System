```python
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

# ============================================================
# TRAINING TRANSFORMS
# ============================================================
# Augmentation is used ONLY for training.
# This helps the CNN learn variations in defect appearance.

train_transform = transforms.Compose([
    transforms.Resize((128, 128)),

    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(10),
    transforms.ColorJitter(
        brightness=0.2,
        contrast=0.2,
        saturation=0.2
    ),

    transforms.ToTensor(),
])


# ============================================================
# VALIDATION / TEST TRANSFORMS
# ============================================================
# No random augmentation here.
# Validation and test images should represent real performance.

eval_transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
])


# ============================================================
# DATASET PATHS
# ============================================================

train_path = "../dataset/cnn_dataset/train"
val_path = "../dataset/cnn_dataset/val"
test_path = "../dataset/cnn_dataset/test"


# ============================================================
# LOAD DATASETS
# ============================================================

train_dataset = datasets.ImageFolder(
    train_path,
    transform=train_transform
)

val_dataset = datasets.ImageFolder(
    val_path,
    transform=eval_transform
)

test_dataset = datasets.ImageFolder(
    test_path,
    transform=eval_transform
)


# ============================================================
# DATALOADERS
# ============================================================

train_loader = DataLoader(
    train_dataset,
    batch_size=16,
    shuffle=True
)

val_loader = DataLoader(
    val_dataset,
    batch_size=16,
    shuffle=False
)

test_loader = DataLoader(
    test_dataset,
    batch_size=16,
    shuffle=False
)


# ============================================================
# INFORMATION
# ============================================================

if __name__ == "__main__":
    print("Classes:", train_dataset.classes)
    print("Training Images:", len(train_dataset))
    print("Validation Images:", len(val_dataset))
    print("Testing Images:", len(test_dataset))
```
