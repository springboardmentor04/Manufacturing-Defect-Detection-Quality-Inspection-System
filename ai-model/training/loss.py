import torch
import torch.nn as nn
from typing import Dict

class AnomalyLoss(nn.Module):
    def __init__(self):
        super().__init__()
        self.mse = nn.MSELoss()
        
    def forward(self, outputs: Dict[str, torch.Tensor], target: torch.Tensor = None) -> torch.Tensor:
        """
        Calculates the MSE between the Teacher's features and the Student's features.
        The target argument is ignored as this is unsupervised anomaly detection.
        """
        teacher_features = outputs["teacher"]
        student_features = outputs["student"]
        
        # Teacher is frozen, Student tries to mimic Teacher
        loss = self.mse(student_features, teacher_features)
        return loss
