import os
import argparse
import json
import torch
import torch.nn as nn
import torch.optim as optim
from tqdm import tqdm
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import numpy as np

from .dataset_loader import create_dataloaders
from .cnn_model import CustomCNN

def train_model(
    dataset_path: str,
    epochs: int,
    batch_size: int,
    learning_rate: float
):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training on device: {device}")

    # Setup directories
    output_dir = Path("outputs")
    output_dir.mkdir(exist_ok=True, parents=True)
    
    checkpoint_dir = Path("model/checkpoints")
    checkpoint_dir.mkdir(exist_ok=True, parents=True)

    # 1. Load Data
    train_loader, val_loader, test_loader, class_to_idx = create_dataloaders(
        dataset_path=dataset_path, 
        batch_size=batch_size
    )
    
    num_classes = len(class_to_idx)
    idx_to_class = {v: k for k, v in class_to_idx.items()}

    # 2. Initialize Model
    model = CustomCNN(num_classes=num_classes).to(device)
    
    # 3. Loss and Optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    # Early stopping config
    patience = 15
    best_val_loss = float('inf')
    epochs_no_improve = 0

    # History for learning curves
    history = {
        'train_loss': [], 'val_loss': [],
        'train_acc': [], 'val_acc': [],
        'train_prec': [], 'val_prec': [],
        'train_rec': [], 'val_rec': [],
        'train_f1': [], 'val_f1': []
    }

    print(f"Starting training for {epochs} epochs across {num_classes} classes...")

    for epoch in range(1, epochs + 1):
        # -----------------
        # Training Phase
        # -----------------
        model.train()
        train_loss = 0.0
        train_preds_list = []
        train_labels_list = []

        train_bar = tqdm(train_loader, desc=f"Epoch {epoch}/{epochs} [Train]")
        for inputs, labels in train_bar:
            inputs = inputs.to(device)
            labels = labels.to(device).long()

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)  # Gradient clipping
            optimizer.step()

            train_loss += loss.item() * inputs.size(0)
            
            # Save for metrics
            _, preds = torch.max(outputs, 1)
            train_preds_list.extend(preds.cpu().numpy())
            train_labels_list.extend(labels.cpu().numpy())
            
            train_bar.set_postfix({'loss': loss.item()})

        epoch_train_loss = train_loss / len(train_labels_list)
        epoch_train_acc = accuracy_score(train_labels_list, train_preds_list)
        epoch_train_prec = precision_score(train_labels_list, train_preds_list, average='macro', zero_division=0)
        epoch_train_rec = recall_score(train_labels_list, train_preds_list, average='macro', zero_division=0)
        epoch_train_f1 = f1_score(train_labels_list, train_preds_list, average='macro', zero_division=0)

        # -----------------
        # Validation Phase
        # -----------------
        model.eval()
        val_loss = 0.0
        val_preds_list = []
        val_labels_list = []

        val_bar = tqdm(val_loader, desc=f"Epoch {epoch}/{epochs} [Val]")
        with torch.no_grad():
            for inputs, labels in val_bar:
                inputs = inputs.to(device)
                labels = labels.to(device).long()

                outputs = model(inputs)
                loss = criterion(outputs, labels)

                val_loss += loss.item() * inputs.size(0)
                
                _, preds = torch.max(outputs, 1)
                val_preds_list.extend(preds.cpu().numpy())
                val_labels_list.extend(labels.cpu().numpy())

        if len(val_labels_list) > 0:
            epoch_val_loss = val_loss / len(val_labels_list)
            epoch_val_acc = accuracy_score(val_labels_list, val_preds_list)
            epoch_val_prec = precision_score(val_labels_list, val_preds_list, average='macro', zero_division=0)
            epoch_val_rec = recall_score(val_labels_list, val_preds_list, average='macro', zero_division=0)
            epoch_val_f1 = f1_score(val_labels_list, val_preds_list, average='macro', zero_division=0)
        else:
            epoch_val_loss = epoch_val_acc = epoch_val_prec = epoch_val_rec = epoch_val_f1 = 0.0

        history['train_loss'].append(epoch_train_loss)
        history['train_acc'].append(epoch_train_acc)
        history['train_prec'].append(epoch_train_prec)
        history['train_rec'].append(epoch_train_rec)
        history['train_f1'].append(epoch_train_f1)
        
        history['val_loss'].append(epoch_val_loss)
        history['val_acc'].append(epoch_val_acc)
        history['val_prec'].append(epoch_val_prec)
        history['val_rec'].append(epoch_val_rec)
        history['val_f1'].append(epoch_val_f1)

        print(f"Epoch {epoch}/{epochs} -> "
              f"Train Loss: {epoch_train_loss:.4f}, Acc: {epoch_train_acc:.4f}, Prec: {epoch_train_prec:.4f}, Rec: {epoch_train_rec:.4f}, F1: {epoch_train_f1:.4f} | "
              f"Val Loss: {epoch_val_loss:.4f}, Acc: {epoch_val_acc:.4f}, Prec: {epoch_val_prec:.4f}, Rec: {epoch_val_rec:.4f}, F1: {epoch_val_f1:.4f}")

        # Checkpointing and Early Stopping
        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            epochs_no_improve = 0
            
            # Save best model
            model_path = checkpoint_dir / "best_model.pth"
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': best_val_loss,
                'config': {
                    'num_classes': num_classes,
                    'image_size': 224,
                    'normalization': {
                        'mean': [0.485, 0.456, 0.406],
                        'std': [0.229, 0.224, 0.225]
                    },
                    'class_names': idx_to_class
                }
            }, str(model_path))
            print(f"  [!] New best model saved to {model_path}")
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                print(f"Early stopping triggered after {epoch} epochs.")
                break
        
        # Step the scheduler
        scheduler.step()
        
        # Print current learning rate
        current_lr = optimizer.param_groups[0]['lr']
        print(f"Current Learning Rate: {current_lr}")

    # Save Learning Curves
    plot_learning_curves(history, str(output_dir / "training_curves.png"))
    print("Training complete.")

def plot_learning_curves(history, save_path):
    epochs = range(1, len(history['train_loss']) + 1)
    
    plt.figure(figsize=(18, 5))
    
    # Plot Loss
    plt.subplot(1, 3, 1)
    plt.plot(epochs, history['train_loss'], label='Train Loss', marker='o')
    plt.plot(epochs, history['val_loss'], label='Val Loss', marker='o')
    plt.title('Loss vs Epoch')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    plt.grid(True)
    
    # Plot Accuracy & F1
    plt.subplot(1, 3, 2)
    plt.plot(epochs, history['train_acc'], label='Train Acc', marker='o')
    plt.plot(epochs, history['val_acc'], label='Val Acc', marker='o')
    plt.plot(epochs, history['train_f1'], label='Train F1', marker='x', linestyle='--')
    plt.plot(epochs, history['val_f1'], label='Val F1', marker='x', linestyle='--')
    plt.title('Accuracy & F1 vs Epoch')
    plt.xlabel('Epoch')
    plt.ylabel('Score')
    plt.legend()
    plt.grid(True)
    
    # Plot Precision & Recall
    plt.subplot(1, 3, 3)
    plt.plot(epochs, history['train_prec'], label='Train Precision', marker='o')
    plt.plot(epochs, history['val_prec'], label='Val Precision', marker='o')
    plt.plot(epochs, history['train_rec'], label='Train Recall', marker='x', linestyle='--')
    plt.plot(epochs, history['val_rec'], label='Val Recall', marker='x', linestyle='--')
    plt.title('Precision & Recall vs Epoch')
    plt.xlabel('Epoch')
    plt.ylabel('Score')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Custom CNN for Object Category Classification")
    parser.add_argument("--dataset-path", type=str, default="data/archive", help="Path to dataset directory")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--learning-rate", type=float, default=0.0001, help="Learning rate")
    
    args = parser.parse_args()
    
    train_model(
        dataset_path=args.dataset_path,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate
    )
