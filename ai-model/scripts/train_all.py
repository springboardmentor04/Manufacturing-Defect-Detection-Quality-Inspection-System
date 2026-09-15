import os
import sys
from pathlib import Path
import torch
import shutil
import time

# Setup paths
base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

from config.config import config
from training.trainer import Trainer
from dataset.manager import DatasetManager

def train_all():
    print("="*50)
    print("Starting Per-Category Retraining Pipeline")
    print("="*50)
    
    # We use fewer epochs per category to speed up the process, 25 is enough for MVTec AD with EfficientAD
    config.EPOCHS = 25
    config.BATCH_SIZE = 16
    
    manager = DatasetManager()
    
    for category in config.SUPPORTED_CATEGORIES:
        print(f"\n{'='*40}")
        print(f"Training Model for: {category.upper()}")
        print(f"{'='*40}")
        
        # We must NOT use the test_loader for validation because it contains defects!
        # If we use test_loader, early stopping selects the model that learns to reconstruct defects.
        # Instead, we split the normal training data into 90% train, 10% val.
        from torch.utils.data import random_split
        
        full_train_dataset = manager.get_train_loader(category).dataset
        if full_train_dataset is None or len(full_train_dataset) == 0:
            print(f"Failed to load dataset for {category}! Skipping...")
            continue
            
        train_size = int(0.9 * len(full_train_dataset))
        val_size = len(full_train_dataset) - train_size
        train_dataset, val_dataset = random_split(full_train_dataset, [train_size, val_size])
        
        from torch.utils.data import DataLoader
        train_loader = DataLoader(train_dataset, batch_size=config.BATCH_SIZE, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=config.BATCH_SIZE, shuffle=False)
            
        trainer = Trainer()
        
        print(f"Training on {category} for {config.EPOCHS} epochs...")
        best_epoch, best_loss, total_time, train_loss = trainer.run(train_loader, val_loader)
        
        print(f"\n{category.upper()} Training completed in {total_time:.2f} mins.")
        print(f"Best Validation Loss: {best_loss:.4f} at epoch {best_epoch}")
        
        best_model_path = Path(config.WEIGHTS_PATH) / "checkpoints" / "best_model.pth"
        prod_model_path = Path(config.WEIGHTS_PATH) / getattr(config, 'MULTI_MODEL_FORMAT').format(category=category)
        
        if best_model_path.exists():
            shutil.copy2(best_model_path, prod_model_path)
            print(f"Exported to {prod_model_path.name}")
        else:
            print(f"ERROR: best_model.pth not found for {category}!")
            
if __name__ == "__main__":
    train_all()
