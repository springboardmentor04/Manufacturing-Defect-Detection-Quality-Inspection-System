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

def train_unified():
    print("="*50)
    print("Starting Unified Retraining Pipeline")
    print("="*50)
    
    config.EPOCHS = 25
    config.BATCH_SIZE = 16
    
    trainer = Trainer()
    manager = DatasetManager()
    
    print("\nLoading combined dataset...")
    train_loader = manager.get_combined_train_loader()
    val_loader = manager.get_combined_test_loader()
    
    if train_loader is None or val_loader is None:
        print("Failed to load combined datasets!")
        return
        
    print(f"Training on combined dataset for {config.EPOCHS} epochs...")
    best_epoch, best_loss, total_time, train_loss = trainer.run(train_loader, val_loader)
    
    print(f"\nUNIFIED Training completed in {total_time:.2f} mins.")
    print(f"Best Validation Loss: {best_loss:.4f} at epoch {best_epoch}")
    
    best_model_path = Path(config.WEIGHTS_PATH) / "checkpoints" / "best_model.pth"
    prod_model_path = Path(config.WEIGHTS_PATH) / config.DEFAULT_MODEL
    latest_model_path = Path(config.WEIGHTS_PATH) / "checkpoints" / "latest_model.pth"
    
    if best_model_path.exists():
        shutil.copy2(best_model_path, prod_model_path)
        print(f"\nExported {best_model_path.name} to {prod_model_path.name}")
    else:
        print("\nERROR: best_model.pth not found!")

if __name__ == "__main__":
    train_unified()
