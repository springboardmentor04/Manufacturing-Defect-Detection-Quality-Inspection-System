import os
import torch
import torch.nn.functional as F
from pathlib import Path
from typing import Dict, Any

from .cnn_model import CustomCNN
from .preprocessing import preprocess_image_file

class CNNDefectPredictor:
    """
    Predictor class to load a trained model once and run inference on multiple images.
    """
    def __init__(self, checkpoint_path: str = "model/checkpoints/best_model.pth"):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        if not os.path.exists(checkpoint_path):
            raise FileNotFoundError(f"Checkpoint not found at {checkpoint_path}. Please train the model first.")
            
        self.checkpoint = torch.load(checkpoint_path, map_location=self.device)
        self.config = self.checkpoint.get('config', {})
        
        # Determine num_classes (fallback to 15 if not in config for compatibility)
        self.num_classes = self.config.get('num_classes', 15)
        self.class_names = self.config.get('class_names', {i: f'Class {i}' for i in range(self.num_classes)})
        
        self.model = CustomCNN(num_classes=self.num_classes).to(self.device)
        self.model.load_state_dict(self.checkpoint['model_state_dict'])
        self.model.eval()
        
    def predict(self, image_path: str) -> Dict[str, Any]:
        """
        Runs inference on a single image.
        Returns a dictionary with prediction and confidence.
        """
        try:
            # preprocess_image_file defaults to is_train=False transforms if not provided
            img_tensor = preprocess_image_file(image_path).unsqueeze(0).to(self.device)
        except Exception as e:
            raise ValueError(f"Error processing image {image_path}: {e}")
            
        with torch.no_grad():
            output = self.model(img_tensor)
            probs = F.softmax(output, dim=1)
            confidence, predicted_idx = torch.max(probs, 1)
            
            predicted_idx = predicted_idx.item()
            confidence = confidence.item()
            
        # The class names config stores indices as strings when loaded from JSON, 
        # so we cast the int idx to str just in case, but usually PyTorch saves it correctly.
        predicted_class_name = self.class_names.get(predicted_idx, self.class_names.get(str(predicted_idx), f"Unknown ({predicted_idx})"))
        
        confidence_pct = round(confidence * 100, 2)
        
        return {
            "prediction": predicted_class_name,
            "confidence": confidence_pct,
            "status": "Pass" # Kept for API compatibility, though we don't use it directly anymore
        }
