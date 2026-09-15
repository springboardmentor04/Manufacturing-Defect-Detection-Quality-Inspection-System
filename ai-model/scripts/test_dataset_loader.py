import sys
from pathlib import Path

# Setup paths so ai-model is treated as root package
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
sys.path.append(str(parent_dir))

from config.config import config
from dataset.manager import DatasetManager

def test_loader():
    print("=" * 48)
    print("VisionInspect AI Dataset Loader Test")
    print("=" * 48)
    
    manager = DatasetManager()
    
    # Check dataset presence
    val_report = manager.validate_dataset()
    dataset_found = "YES" if val_report["dataset_exists"] else "NO"
    print(f"Dataset Found : {dataset_found}")
    
    if not val_report["dataset_exists"]:
        print("Please download the MVTec AD dataset to dataset/mvtec_ad.")
        print("=" * 48)
        return
        
    category = "bottle"
    print(f"Category : {category}")
    
    # Loaders
    train_loader = manager.get_train_loader(category)
    test_loader = manager.get_test_loader(category)
    
    train_images = len(train_loader.dataset) if train_loader else 0
    test_images = len(test_loader.dataset) if test_loader else 0
    
    print(f"Training Images : {train_images}")
    print(f"Testing Images : {test_images}")
    
    print(f"Batch Size : {config.BATCH_SIZE}")
    
    tensor_shape = "N/A"
    if train_loader and train_images > 0:
        # Get one batch
        images, labels, paths = next(iter(train_loader))
        tensor_shape = str(tuple(images.shape)).replace(' ', '')
        
    print(f"Tensor Shape : {tensor_shape}")
    print(f"Device : {config.DEVICE.upper()}")
    print("=" * 48)

if __name__ == "__main__":
    test_loader()
