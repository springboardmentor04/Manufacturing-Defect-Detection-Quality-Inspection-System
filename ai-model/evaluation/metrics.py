import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

class EvaluatorMetrics:
    @staticmethod
    def compute_all(y_true, y_pred, y_scores=None):
        metrics = {
            "accuracy": accuracy_score(y_true, y_pred),
            "precision": precision_score(y_true, y_pred, zero_division=0),
            "recall": recall_score(y_true, y_pred, zero_division=0),
            "f1_score": f1_score(y_true, y_pred, zero_division=0)
        }
        
        if y_scores is not None and len(np.unique(y_true)) > 1:
            try:
                metrics["roc_auc"] = roc_auc_score(y_true, y_scores)
            except Exception:
                metrics["roc_auc"] = None
        else:
            metrics["roc_auc"] = None
            
        metrics["confusion_matrix"] = confusion_matrix(y_true, y_pred).tolist()
        
        return metrics
