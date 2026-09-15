import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, precision_recall_curve
from pathlib import Path
import numpy as np

class EvaluationVisualizer:
    def __init__(self, output_dir: Path):
        self.plots_dir = output_dir / "plots"
        self.plots_dir.mkdir(parents=True, exist_ok=True)
        
    def plot_confusion_matrix(self, cm: list):
        plt.figure(figsize=(8, 6))
        cm_array = np.array(cm)
        im = plt.imshow(cm_array, interpolation='nearest', cmap=plt.cm.Blues)
        plt.colorbar(im)
        for i in range(cm_array.shape[0]):
            for j in range(cm_array.shape[1]):
                plt.text(j, i, str(cm_array[i, j]), horizontalalignment="center", color="white" if cm_array[i, j] > cm_array.max() / 2 else "black")
        plt.title('Confusion Matrix')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.savefig(self.plots_dir / "confusion_matrix.png")
        plt.close()
        
    def plot_roc_curve(self, y_true: np.ndarray, y_scores: np.ndarray):
        if len(np.unique(y_true)) > 1:
            fpr, tpr, _ = roc_curve(y_true, y_scores)
            plt.figure(figsize=(8, 6))
            plt.plot(fpr, tpr, color='darkorange', lw=2, label='ROC curve')
            plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
            plt.xlabel('False Positive Rate')
            plt.ylabel('True Positive Rate')
            plt.title('Receiver Operating Characteristic')
            plt.legend(loc="lower right")
            plt.grid(True)
            plt.savefig(self.plots_dir / "roc_curve.png")
            plt.close()
            
    def plot_precision_recall_curve(self, y_true: np.ndarray, y_scores: np.ndarray):
        if len(np.unique(y_true)) > 1:
            precision, recall, _ = precision_recall_curve(y_true, y_scores)
            plt.figure(figsize=(8, 6))
            plt.plot(recall, precision, color='blue', lw=2, label='PR curve')
            plt.xlabel('Recall')
            plt.ylabel('Precision')
            plt.title('Precision-Recall Curve')
            plt.legend(loc="lower left")
            plt.grid(True)
            plt.savefig(self.plots_dir / "precision_recall_curve.png")
            plt.close()
            
    def generate_all(self, metrics: dict, y_true: np.ndarray, y_scores: np.ndarray):
        if "confusion_matrix" in metrics:
            self.plot_confusion_matrix(metrics["confusion_matrix"])
        self.plot_roc_curve(y_true, y_scores)
        self.plot_precision_recall_curve(y_true, y_scores)
