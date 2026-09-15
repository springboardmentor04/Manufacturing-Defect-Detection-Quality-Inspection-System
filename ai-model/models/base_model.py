from abc import ABC, abstractmethod
import torch
import torch.nn as nn
from typing import Dict, Any, Optional

class BaseAnomalyModel(ABC, nn.Module):
    """Base class for all anomaly detection models."""
    
    def __init__(self):
        super().__init__()
        
    @abstractmethod
    def initialize(self) -> None:
        """Initialize model components and load backbones."""
        pass
        
    @abstractmethod
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass for the model."""
        pass
        
    @abstractmethod
    def extract_features(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        """Extract features from the backbone."""
        pass
        
    @abstractmethod
    def save_weights(self, path: str) -> None:
        """Save model weights to a file."""
        pass
        
    @abstractmethod
    def load_weights(self, path: str) -> None:
        """Load model weights from a file."""
        pass
        
    @abstractmethod
    def summary(self) -> str:
        """Return a string summary of the model."""
        pass
