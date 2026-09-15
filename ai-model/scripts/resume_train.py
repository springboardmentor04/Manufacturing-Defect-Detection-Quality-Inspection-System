import os
import sys
from pathlib import Path
import subprocess

base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

from config.config import config
from training.trainer import Trainer
from dataset.manager import DatasetManager
import shutil

def resume_train():
    categories_to_train = [
        "screw", "tile", "toothbrush", "transistor", "wood", "zipper"
    ]
    
    config.EPOCHS = 25
    config.BATCH_SIZE = 16
    manager = DatasetManager()
    
    for category in categories_to_train:
        print(f"\n{'='*40}")
        print(f"Training Model for: {category.upper()}")
        print(f"{'='*40}")
        
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

print("Starting resume retraining pipeline...")
resume_train()
print("Starting calibration...")
subprocess.run(["python", str(base_dir / "scripts" / "calibrate_thresholds.py")], check=True)
print("DONE.")
