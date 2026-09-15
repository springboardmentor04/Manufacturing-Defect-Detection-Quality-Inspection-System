import os
import sys
from pathlib import Path
import torch

# Add ai-model root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from config.config import config
from training.trainer import Trainer

def test_training_pipeline():
    print("========================================")
    print("VisionInspect AI Training Pipeline")
    print("========================================")
    
    # 1. Dataset loads (Mock dataloader for verification)
    try:
        # Dummy batch: [batch_size, channels, height, width]
        dummy_batch = torch.randn(2, 3, config.INPUT_SIZE[0], config.INPUT_SIZE[1])
        # Wrap in a dummy dataloader
        dataloader = [dummy_batch]
        print("Dataset Ready")
    except Exception as e:
        print(f"Dataset Error: {e}")
        return

    # 2. Initialize Trainer (covers model, optimizer, scheduler)
    try:
        trainer = Trainer()
        print("Model Ready")
        print("Optimizer Ready")
        print("Scheduler Ready")
    except Exception as e:
        print(f"Trainer Initialization Error: {e}")
        return
        
    # 3. One training step executes successfully
    try:
        # Running just one step
        loss = trainer.train_step(dummy_batch)
        print("Training Step Passed")
    except Exception as e:
        print(f"Training Step Error: {e}")
        return
        
    # 4. Checkpoint directory is created and saved
    try:
        trainer.checkpoint_manager.save(
            epoch=0, 
            model=trainer.model, 
            optimizer=trainer.optimizer, 
            scheduler=trainer.scheduler, 
            loss=loss, 
            is_best=True
        )
        print("Checkpoint Ready")
    except Exception as e:
        print(f"Checkpoint Error: {e}")
        return
        
    print("Status : READY FOR FULL TRAINING")
    print("========================================")

if __name__ == "__main__":
    test_training_pipeline()
