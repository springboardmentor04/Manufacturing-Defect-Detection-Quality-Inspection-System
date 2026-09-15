import torch
from torch.optim import Optimizer, AdamW

def get_optimizer(model: torch.nn.Module, learning_rate: float, weight_decay: float) -> Optimizer:
    """Initialize and return AdamW optimizer."""
    return AdamW(model.parameters(), lr=learning_rate, weight_decay=weight_decay)
