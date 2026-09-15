import os
import sys
from pathlib import Path
import torch
import shutil

# Setup paths
base_dir = Path(__file__).resolve().parent
sys.path.append(str(base_dir))

from config.config import config
from training.trainer import Trainer
from dataset.manager import DatasetManager

def train_fast():
    print("="*50)
    print("Starting Fast Retraining Pipeline")
    print("="*50)
    
    # Temporarily override epochs for speed
    config.EPOCHS = 10
    config.BATCH_SIZE = 16
    
    trainer = Trainer()
    manager = DatasetManager()
    
    # Train on all categories to ensure uniform baseline
    categories = ['bottle', 'cable', 'capsule', 'wood']
    
    for cat in categories:
        print(f"\nLoading dataset for {cat}...")
        train_loader = manager.get_train_loader(cat)
        val_loader = manager.get_test_loader(cat)
        
        if train_loader is None or val_loader is None:
            continue
            
        print(f"Training on {cat} for {config.EPOCHS} epochs...")
        best_epoch, best_loss, total_time, train_loss = trainer.run(train_loader, val_loader)
        
        print(f"\n{cat.upper()} Training completed in {total_time:.2f} mins.")
        print(f"{cat.upper()} Best Validation Loss: {best_loss:.4f} at epoch {best_epoch}")
    
    # Copy best_model.pth to production_model.pth
    best_model_path = Path(config.WEIGHTS_PATH) / "checkpoints" / "best_model.pth"
    prod_model_path = Path(config.WEIGHTS_PATH) / config.DEFAULT_MODEL
    
    if best_model_path.exists():
        shutil.copy2(best_model_path, prod_model_path)
        print(f"\nExported {best_model_path.name} to {prod_model_path.name}")
    else:
        print("\nERROR: best_model.pth not found!")

if __name__ == "__main__":
    train_fast()
