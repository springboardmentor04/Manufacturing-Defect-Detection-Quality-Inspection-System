import os
import argparse
import json
import torch
import numpy as np
from tqdm import tqdm
from pathlib import Path
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

from .dataset_loader import create_dataloaders
from .cnn_model import CustomCNN

def evaluate_model(dataset_path: str, checkpoint_path: str = "model/checkpoints/best_model.pth"):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Evaluating on device: {device}")

    # Load dataloaders
    _, _, test_loader = create_dataloaders(dataset_path=dataset_path, batch_size=32)

    if len(test_loader.dataset) == 0:
        raise ValueError("Test dataset is empty.")

    # Load Model
    model = CustomCNN().to(device)
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found at {checkpoint_path}")
        
    checkpoint = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()

    all_preds = []
    all_probs = []
    all_labels = []

    print("Running evaluation on test set...")
    with torch.no_grad():
        for inputs, labels in tqdm(test_loader, desc="Evaluating"):
            inputs = inputs.to(device)
            labels = labels.cpu().numpy()
            
            outputs = model(inputs)
            probs = torch.sigmoid(outputs).cpu().numpy().flatten()
            preds = (probs >= 0.5).astype(int)
            
            all_preds.extend(preds)
            all_probs.extend(probs)
            all_labels.extend(labels)

    all_labels = np.array(all_labels)
    all_preds = np.array(all_preds)
    all_probs = np.array(all_probs)

    # Calculate metrics
    acc = accuracy_score(all_labels, all_preds)
    prec = precision_score(all_labels, all_preds, zero_division=0)
    rec = recall_score(all_labels, all_preds, zero_division=0)
    f1 = f1_score(all_labels, all_preds, zero_division=0)
    
    try:
        roc_auc = roc_auc_score(all_labels, all_probs)
    except ValueError:
        # If only one class is present in test set (can happen with small synthetic data)
        roc_auc = 0.0

    cm = confusion_matrix(all_labels, all_preds, labels=[0, 1])

    metrics = {
        "accuracy": float(acc),
        "precision": float(prec),
        "recall": float(rec),
        "f1_score": float(f1),
        "roc_auc": float(roc_auc)
    }
    
    # Optional: include training config
    if 'config' in checkpoint:
        metrics['model_info'] = checkpoint['config']
        metrics['model_info']['trained_epochs'] = checkpoint.get('epoch', 0)

    # Save Results
    output_dir = Path("outputs")
    output_dir.mkdir(exist_ok=True, parents=True)

    with open(output_dir / "evaluation_results.json", "w") as f:
        json.dump(metrics, f, indent=4)
        
    print("\n--- Evaluation Results ---")
    for k, v in metrics.items():
        if isinstance(v, float):
            print(f"{k}: {v:.4f}")
            
    plot_confusion_matrix(cm, str(output_dir / "confusion_matrix.png"))
    print("\nMetrics and confusion matrix saved to 'outputs/'")
    return metrics

def plot_confusion_matrix(cm, save_path):
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=['GOOD (0)', 'DEFECTIVE (1)'], yticklabels=['GOOD (0)', 'DEFECTIVE (1)'])
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.title('Confusion Matrix')
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Custom CNN for Defect Detection")
    parser.add_argument("--dataset-path", type=str, default="data/mvtec/bottle", help="Path to MVTec category dataset")
    parser.add_argument("--checkpoint", type=str, default="model/checkpoints/best_model.pth", help="Path to model checkpoint")
    
    args = parser.parse_args()
    
    evaluate_model(args.dataset_path, args.checkpoint)
