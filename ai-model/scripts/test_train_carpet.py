import os
import sys
from pathlib import Path
import torch
from torch.utils.data import DataLoader, random_split
import shutil

base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

from config.config import config
from training.trainer import Trainer
from dataset.manager import DatasetManager

def test_train():
    config.EPOCHS = 5
    config.BATCH_SIZE = 16
    category = "carpet"
    
    manager = DatasetManager()
    full_train_dataset = manager.get_train_loader(category).dataset
    
    train_size = int(0.9 * len(full_train_dataset))
    val_size = len(full_train_dataset) - train_size
    train_dataset, val_dataset = random_split(full_train_dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=config.BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=config.BATCH_SIZE, shuffle=False)
        
    trainer = Trainer()
    
    print(f"Training on {category} for {config.EPOCHS} epochs...")
    trainer.run(train_loader, val_loader)
    
    best_model_path = Path(config.WEIGHTS_PATH) / "checkpoints" / "best_model.pth"
    prod_model_path = Path(config.WEIGHTS_PATH) / f"model_{category}.pth"
    shutil.copy2(best_model_path, prod_model_path)
    print("Done training. Now evaluating...")
    
    from inference.infer import InferenceEngine
    # Reset singleton to ensure fresh load
    from inference.model_loader import ModelLoader
    ModelLoader._instance = None
    
    engine = InferenceEngine()
    
    dataset_dir = base_dir.parent / "dataset" / "mvtec_ad"
    cat_test_dir = dataset_dir / category / "test"
    
    good_scores = []
    defect_scores = []
    
    for subtype in cat_test_dir.iterdir():
        if not subtype.is_dir(): continue
        is_good = (subtype.name == "good")
        for img_path in subtype.glob("*.png"):
            res = engine.infer(str(img_path), category)
            if is_good: good_scores.append(res.anomaly_score)
            else: defect_scores.append(res.anomaly_score)
            
    print(f"Good scores (count {len(good_scores)}): min={min(good_scores):.3f} max={max(good_scores):.3f} mean={sum(good_scores)/len(good_scores):.3f}")
    if len(defect_scores) > 0:
        print(f"Defect scores (count {len(defect_scores)}): min={min(defect_scores):.3f} max={max(defect_scores):.3f} mean={sum(defect_scores)/len(defect_scores):.3f}")
        
if __name__ == "__main__":
    test_train()
