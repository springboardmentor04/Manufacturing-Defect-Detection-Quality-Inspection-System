import torch
import torch.nn as nn
from torchvision import models
from typing import Dict, Optional, Any
from .base_model import BaseAnomalyModel

class EfficientADModel(BaseAnomalyModel):
    """
    Simplified Knowledge Distillation architecture for anomaly detection.
    The Teacher is pretrained on ImageNet and frozen.
    The Student has the same architecture but is trained to match the Teacher's features on normal images.
    """
    def __init__(self, backbone_name: str = 'resnet18'):
        super().__init__()
        self.backbone_name = backbone_name
        self.teacher = None
        self.student = None
        # We explicitly skip the Autoencoder for this fast production pipeline to ensure rapid convergence
        # self.autoencoder = None
        
    def initialize(self) -> None:
        if self.backbone_name.lower() == 'resnet18':
            weights = models.ResNet18_Weights.DEFAULT
            base_teacher = models.resnet18(weights=weights)
            base_student = models.resnet18(weights=None) # Initialize Student randomly
        else:
            raise ValueError(f"Unsupported backbone for fast version: {self.backbone_name}")
            
        # Extract features up to layer 3 (a common choice for KD anomaly detection)
        self.teacher = nn.Sequential(*list(base_teacher.children())[:-2])
        self.student = nn.Sequential(*list(base_student.children())[:-2])
        
        # Freeze Teacher
        for param in self.teacher.parameters():
            param.requires_grad = False
            
        self.teacher.eval()
        
    def forward(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        if self.teacher is None or self.student is None:
            raise RuntimeError("Model not initialized. Call initialize() first.")
            
        # Teacher is always in eval mode
        self.teacher.eval()
        with torch.no_grad():
            teacher_features = self.teacher(x)
            
        # Student extracts features (it stays in train mode if training, eval if evaluating)
        student_features = self.student(x)
        
        return {
            "teacher": teacher_features,
            "student": student_features
        }

    def extract_features(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        # Same as forward for this architecture
        return self.forward(x)
        
    def save_weights(self, path: str) -> None:
        # Only save student weights to save space (teacher is always loaded from torchvision)
        torch.save(self.student.state_dict(), path)
        
    def load_weights(self, path: str) -> None:
        # Load student weights
        state_dict = torch.load(path, map_location='cpu')
        # Handle cases where it was saved nested inside another dict
        if "state_dict" in state_dict:
            state_dict = state_dict["state_dict"]
        elif "model_state_dict" in state_dict:
            state_dict = state_dict["model_state_dict"]
            
        # Filter for student keys if needed
        student_dict = {k.replace('student.', ''): v for k, v in state_dict.items() if 'teacher' not in k}
        if len(student_dict) > 0:
            self.student.load_state_dict(student_dict, strict=False)
        else:
            # Fallback if saved directly
            self.student.load_state_dict(state_dict, strict=False)
        
    def summary(self) -> str:
        if self.student is None:
            return "EfficientAD (UNINITIALIZED)"
        param_count = sum(p.numel() for p in self.student.parameters())
        return f"EfficientAD (Teacher-Student, Backbone: {self.backbone_name}, Student Params: {param_count})"
