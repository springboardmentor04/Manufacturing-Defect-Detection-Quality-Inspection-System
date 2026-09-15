import time
import torch
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple

from config.config import config
from models.factory import ModelFactory
from training.checkpoint import CheckpointManager
from .metrics import EvaluatorMetrics

class Evaluator:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = ModelFactory.create_model(config.MODEL_NAME, backbone=getattr(config, 'BACKBONE', 'resnet18')).to(self.device)
        self.model.initialize()
        
        checkpoint_dir = getattr(config, 'WEIGHTS_PATH', Path("weights")) / "checkpoints"
        self.checkpoint_manager = CheckpointManager(str(checkpoint_dir))
        
    def load_best_model(self) -> None:
        best_model_path = self.checkpoint_manager.checkpoint_dir / "best_model.pth"
        if not best_model_path.exists():
            raise FileNotFoundError(f"Best model not found at {best_model_path}")
            
        print(f"Loading best model from {best_model_path}")
        self.checkpoint_manager.load(str(best_model_path), self.model)
        self.model.eval()
        
    def evaluate(self, dataloader) -> Tuple[Dict[str, Any], np.ndarray, np.ndarray, np.ndarray]:
        self.model.eval()
        
        all_labels = []
        all_preds = []
        all_scores = []
        
        total_time = 0
        total_loss = 0
        
        criterion = torch.nn.MSELoss()
        
        with torch.no_grad():
            for batch in dataloader:
                if isinstance(batch, (tuple, list)):
                    images = batch[0].to(self.device)
                    if torch.is_tensor(batch[1]):
                        labels = batch[1].cpu().numpy()
                    else:
                        labels = np.zeros(images.shape[0])
                else:
                    images = batch.to(self.device)
                    labels = np.zeros(images.shape[0])
                    
                start_time = time.time()
                outputs = self.model(images)
                end_time = time.time()
                
                total_time += (end_time - start_time)
                
                # Calculate MSE per image (batch size may be > 1)
                teacher_feat = outputs.get("teacher")
                student_feat = outputs.get("student")
                
                if teacher_feat is not None and student_feat is not None:
                    loss = criterion(student_feat, teacher_feat)
                    total_loss += loss.item()
                    
                    # Compute MSE along channels, H, W (dims 1, 2, 3)
                    mse_per_image = torch.nn.functional.mse_loss(student_feat, teacher_feat, reduction='none')
                    scores = mse_per_image.mean(dim=[1, 2, 3]).cpu().numpy()
                else:
                    scores = np.zeros(images.shape[0])
                
                all_labels.extend(labels)
                all_scores.extend(scores)
                
        all_labels = np.array(all_labels)
        all_scores = np.array(all_scores)
        
        threshold = np.median(all_scores) if len(all_scores) > 0 else 0
        all_preds = (all_scores > threshold).astype(int)
        
        metrics = EvaluatorMetrics.compute_all(all_labels, all_preds, all_scores)
        
        avg_loss = total_loss / len(dataloader) if len(dataloader) > 0 else 0
        avg_inference_time = (total_time / len(all_labels)) * 1000 if len(all_labels) > 0 else 0
        
        metrics["validation_loss"] = avg_loss
        metrics["average_inference_time_ms"] = avg_inference_time
        metrics["images_evaluated"] = len(all_labels)
        
        return metrics, all_labels, all_preds, all_scores
