import time
import torch
from typing import Optional, Any
from pathlib import Path
from tqdm import tqdm

from config.config import config
from models.factory import ModelFactory
from .loss import AnomalyLoss
from .optimizer import get_optimizer
from .scheduler import get_scheduler
from .checkpoint import CheckpointManager
from .metrics import AverageMeter
from .logger import TrainingLogger

class Trainer:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = ModelFactory.create_model(config.MODEL_NAME, backbone=getattr(config, 'BACKBONE', 'resnet18')).to(self.device)
        self.model.initialize()
        
        self.optimizer = get_optimizer(self.model, getattr(config, 'LEARNING_RATE', 1e-4), getattr(config, 'WEIGHT_DECAY', 1e-5))
        self.scheduler = get_scheduler(self.optimizer, getattr(config, 'EPOCHS', 100))
        self.criterion = AnomalyLoss().to(self.device)
        
        self.early_stopping_patience = 5
        self.best_loss = float('inf')
        self.best_epoch = 0
        self.epochs_without_improvement = 0
        self.images_processed = 0
        
        checkpoint_dir = getattr(config, 'WEIGHTS_PATH', Path("weights")) / "checkpoints"
        self.checkpoint_manager = CheckpointManager(str(checkpoint_dir))
        
        logs_dir = getattr(config, 'LOGS_PATH', Path("logs"))
        self.logger = TrainingLogger(logs_dir)
        
    def resume_training(self, checkpoint_path: str) -> int:
        checkpoint = self.checkpoint_manager.load(checkpoint_path, self.model, self.optimizer, self.scheduler)
        return checkpoint.get('epoch', 0)
        
    def train_step(self, batch: Any) -> float:
        self.model.train()
        
        if isinstance(batch, (tuple, list)):
            images = batch[0].to(self.device)
        else:
            images = batch.to(self.device)
            
        batch_size = images.size(0)
        self.images_processed += batch_size
            
        self.optimizer.zero_grad()
        
        outputs = self.model(images)
        loss = self.criterion(outputs)
        
        loss.backward()
        self.optimizer.step()
        
        return loss.item()

    def val_step(self, batch: Any) -> float:
        self.model.eval()
        
        if isinstance(batch, (tuple, list)):
            images = batch[0].to(self.device)
        else:
            images = batch.to(self.device)
            
        with torch.no_grad():
            outputs = self.model(images)
            loss = self.criterion(outputs)
            
        return loss.item()
        
    def run_epoch(self, dataloader, epoch: int) -> float:
        losses = AverageMeter()
        
        pbar = tqdm(dataloader, desc=f"Epoch {epoch} Training")
        for batch in pbar:
            loss = self.train_step(batch)
            losses.update(loss)
            pbar.set_postfix({'loss': f"{losses.avg:.4f}"})
            
        return losses.avg

    def validate_epoch(self, dataloader, epoch: int) -> float:
        losses = AverageMeter()
        
        pbar = tqdm(dataloader, desc=f"Epoch {epoch} Validation")
        for batch in pbar:
            loss = self.val_step(batch)
            losses.update(loss)
            pbar.set_postfix({'val_loss': f"{losses.avg:.4f}"})
            
        return losses.avg
        
    def run(self, train_loader, val_loader, start_epoch: int = 1):
        total_start_time = time.time()
        
        epochs = getattr(config, 'EPOCHS', 100)
        
        # Reset Early Stopping State for each run
        self.best_loss = float('inf')
        self.best_epoch = 0
        self.epochs_without_improvement = 0
        min_delta = 0.001
        
        for epoch in range(start_epoch, epochs + 1):
            epoch_start_time = time.time()
            
            train_loss = self.run_epoch(train_loader, epoch)
            val_loss = self.validate_epoch(val_loader, epoch)
            
            self.scheduler.step()
            
            epoch_time = time.time() - epoch_start_time
            current_lr = self.scheduler.get_last_lr()[0]
            
            is_best = val_loss < (self.best_loss - min_delta)
            ckpt_saved = False
            
            if is_best:
                self.best_loss = val_loss
                self.best_epoch = epoch
                self.epochs_without_improvement = 0
            else:
                self.epochs_without_improvement += 1
                
            if epoch % getattr(config, 'CHECKPOINT_INTERVAL', 10) == 0 or is_best:
                self.checkpoint_manager.save(
                    epoch=epoch,
                    model=self.model,
                    optimizer=self.optimizer,
                    scheduler=self.scheduler,
                    loss=val_loss,
                    is_best=is_best
                )
                ckpt_saved = True
                
            self.logger.log_epoch(epoch, train_loss, val_loss, current_lr, ckpt_saved, epoch_time)
            
            if self.epochs_without_improvement >= self.early_stopping_patience:
                print(f"Early stopping triggered at epoch {epoch}")
                break
                
        self.logger.generate_plots()
        
        total_time = (time.time() - total_start_time) / 60.0
        return self.best_epoch, self.best_loss, total_time, train_loss
