import os
import json
import pickle
from pathlib import Path
from typing import Any
import torch

def save_pickle(obj: Any, file_path: str) -> None:
    """Save an object as a pickle file."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'wb') as f:
        pickle.dump(obj, f)

def load_pickle(file_path: str) -> Any:
    """Load an object from a pickle file."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Pickle file not found: {file_path}")
    with open(file_path, 'rb') as f:
        return pickle.load(f)

def save_json(data: dict, file_path: str) -> None:
    """Save a dictionary as a JSON file."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

def load_json(file_path: str) -> dict:
    """Load a dictionary from a JSON file."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"JSON file not found: {file_path}")
    with open(file_path, 'r') as f:
        return json.load(f)

def save_tensor(tensor: torch.Tensor, file_path: str) -> None:
    """Save a PyTorch tensor."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    torch.save(tensor, file_path)

def load_tensor(file_path: str) -> torch.Tensor:
    """Load a PyTorch tensor."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Tensor file not found: {file_path}")
    return torch.load(file_path)

import torch.nn as nn
import torch.nn.functional as F

class FocalLoss(nn.Module):
    def __init__(self, alpha=1.0, gamma=2.0, reduction='mean'):
        super(FocalLoss, self).__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(self, inputs, targets):
        bce_loss = F.binary_cross_entropy_with_logits(inputs, targets, reduction='none')
        pt = torch.exp(-bce_loss)
        
        # Treat alpha as pos_weight: weight = alpha for target=1, weight = 1.0 for target=0
        alpha_t = targets * self.alpha + (1 - targets) * 1.0
        
        focal_loss = alpha_t * (1 - pt) ** self.gamma * bce_loss

        if self.reduction == 'mean':
            return focal_loss.mean()
        elif self.reduction == 'sum':
            return focal_loss.sum()
        else:
            return focal_loss
