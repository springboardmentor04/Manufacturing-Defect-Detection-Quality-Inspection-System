import os
import torch
from pathlib import Path
from typing import Dict, Any

class CheckpointManager:
    def __init__(self, checkpoint_dir: str):
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        
    def save(self, epoch: int, model: torch.nn.Module, optimizer: torch.optim.Optimizer, scheduler: Any, loss: float, is_best: bool = False) -> None:
        state = {
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'scheduler_state_dict': scheduler.state_dict(),
            'loss': loss
        }
        
        latest_path = self.checkpoint_dir / 'latest_model.pth'
        torch.save(state, latest_path)
        
        if is_best:
            best_path = self.checkpoint_dir / 'best_model.pth'
            torch.save(state, best_path)
            
    def load(self, path: str, model: torch.nn.Module, optimizer: torch.optim.Optimizer = None, scheduler: Any = None) -> Dict[str, Any]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Checkpoint not found at {path}")
            
        checkpoint = torch.load(path)
        model.load_state_dict(checkpoint['model_state_dict'])
        
        if optimizer and 'optimizer_state_dict' in checkpoint:
            optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
            
        if scheduler and 'scheduler_state_dict' in checkpoint:
            scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
            
        return checkpoint
