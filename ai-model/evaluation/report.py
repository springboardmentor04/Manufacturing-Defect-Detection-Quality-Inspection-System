import json
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
import torch

from config.config import config

class ReportGenerator:
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def generate_reports(self, metrics: Dict[str, Any]):
        timestamp = datetime.now().isoformat()
        
        report_data = {
            "model_name": config.MODEL_NAME,
            "dataset": "MVTec AD",
            "evaluation_date": timestamp,
            "model_version": getattr(config, 'MODEL_VERSION', '1.0.0'),
            "training_configuration": {
                "batch_size": config.BATCH_SIZE,
                "image_size": config.IMAGE_SIZE,
                "epochs": getattr(config, 'EPOCHS', 100),
                "learning_rate": getattr(config, 'LEARNING_RATE', 1e-4)
            },
            "metrics": metrics
        }
        
        with open(self.output_dir / "evaluation_report.json", "w") as f:
            json.dump(report_data, f, indent=4)
            
        with open(self.output_dir / "evaluation_report.csv", "w", newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["Metric", "Value"])
            for key, val in metrics.items():
                if key != "confusion_matrix":
                    writer.writerow([key, val])
                    
        with open(self.output_dir / "classification_report.txt", "w") as f:
            f.write(f"VisionInspect AI Classification Report\n")
            f.write(f"====================================\n")
            f.write(f"Model: {config.MODEL_NAME}\n")
            f.write(f"Date: {timestamp}\n\n")
            for key, val in metrics.items():
                if key != "confusion_matrix":
                    f.write(f"{key.capitalize()}: {val}\n")
            f.write(f"\nConfusion Matrix:\n{metrics.get('confusion_matrix', [])}\n")
            
    def export_production_model(self, model: torch.nn.Module, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        metadata = {
            "model_version": getattr(config, 'MODEL_VERSION', '1.0.0'),
            "training_date": datetime.now().isoformat(),
            "dataset": "MVTec AD",
            "image_size": config.IMAGE_SIZE,
            "backbone": getattr(config, 'BACKBONE', 'resnet18'),
            "framework_version": torch.__version__
        }
        
        export_dict = {
            "state_dict": model.state_dict(),
            "metadata": metadata
        }
        
        torch.save(export_dict, path)
