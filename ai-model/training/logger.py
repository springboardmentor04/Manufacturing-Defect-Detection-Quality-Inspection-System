import os
import json
import csv
import matplotlib.pyplot as plt
from pathlib import Path
from typing import Dict, List

class TrainingLogger:
    def __init__(self, logs_dir: Path):
        self.logs_dir = logs_dir
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        
        self.plots_dir = self.logs_dir / "plots"
        self.plots_dir.mkdir(parents=True, exist_ok=True)
        
        self.log_file = self.logs_dir / "training.log"
        self.csv_file = self.logs_dir / "metrics.csv"
        self.json_file = self.logs_dir / "training_history.json"
        
        self.history = []
        
        # Initialize CSV
        with open(self.csv_file, mode='w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Epoch', 'TrainLoss', 'ValLoss', 'LearningRate', 'CheckpointSaved', 'EpochTime'])
            
    def log_epoch(self, epoch: int, train_loss: float, val_loss: float, lr: float, ckpt_saved: bool, epoch_time: float):
        entry = {
            "epoch": epoch,
            "train_loss": train_loss,
            "val_loss": val_loss,
            "learning_rate": lr,
            "checkpoint_saved": ckpt_saved,
            "epoch_time": epoch_time
        }
        self.history.append(entry)
        
        # Log to file
        with open(self.log_file, "a") as f:
            f.write(f"Epoch {epoch} - Train Loss: {train_loss:.6f} - Val Loss: {val_loss:.6f} - LR: {lr:.6f} - Time: {epoch_time:.2f}s\n")
            
        # Log to CSV
        with open(self.csv_file, mode='a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([epoch, train_loss, val_loss, lr, ckpt_saved, epoch_time])
            
        # Log to JSON
        with open(self.json_file, "w") as f:
            json.dump(self.history, f, indent=4)
            
    def generate_plots(self):
        if not self.history:
            return
            
        epochs = [x['epoch'] for x in self.history]
        train_loss = [x['train_loss'] for x in self.history]
        val_loss = [x['val_loss'] for x in self.history]
        
        # Training Loss
        plt.figure(figsize=(10, 6))
        plt.plot(epochs, train_loss, label='Training Loss', color='blue', linewidth=2)
        plt.xlabel('Epoch')
        plt.ylabel('Loss')
        plt.title('Training Loss over Epochs')
        plt.legend()
        plt.grid(True)
        plt.savefig(self.plots_dir / "training_loss.png")
        plt.close()
        
        # Validation Loss
        plt.figure(figsize=(10, 6))
        plt.plot(epochs, val_loss, label='Validation Loss', color='orange', linewidth=2)
        plt.xlabel('Epoch')
        plt.ylabel('Loss')
        plt.title('Validation Loss over Epochs')
        plt.legend()
        plt.grid(True)
        plt.savefig(self.plots_dir / "validation_loss.png")
        plt.close()
