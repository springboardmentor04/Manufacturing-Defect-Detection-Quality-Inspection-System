import torch
from torch.optim.lr_scheduler import LRScheduler, CosineAnnealingLR

def get_scheduler(optimizer: torch.optim.Optimizer, epochs: int) -> LRScheduler:
    """Initialize and return CosineAnnealingLR scheduler."""
    return CosineAnnealingLR(optimizer, T_max=epochs)
