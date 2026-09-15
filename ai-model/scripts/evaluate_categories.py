import os
import sys
from pathlib import Path
import json

base_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(base_dir))

from inference.infer import InferenceEngine
from dataset.manager import DatasetManager

def evaluate_all():
    print("="*50)
    print("Evaluating Production Model on All Categories")
    print("="*50)
    
    engine = InferenceEngine()
    manager = DatasetManager()
    
    categories = manager.get_categories()
    dataset_path = manager.dataset_path
    
    report = {}
    total_acc = 0
    total_prec = 0
    total_rec = 0
    total_f1 = 0
    
    with open('evaluation_report.txt', 'w') as f:
        f.write("Category-Wise Evaluation Report\n")
        f.write("="*30 + "\n\n")
        
        for cat in categories:
            print(f"Evaluating {cat}...")
            
            good_dir = dataset_path / cat / 'test' / 'good'
            
            TP = 0
            TN = 0
            FP = 0
            FN = 0
            
            # Normal images -> True Negative if Pass, False Positive if Fail
            if good_dir.exists():
                for img in good_dir.glob('*.png'):
                    res = engine.infer(str(img), cat)
                    if res.prediction == 'PASS':
                        TN += 1
                    else:
                        FP += 1
                        
            # Defect images -> True Positive if Fail, False Negative if Pass
            for defect_dir in (dataset_path / cat / 'test').iterdir():
                if defect_dir.is_dir() and defect_dir.name != 'good':
                    for img in defect_dir.glob('*.png'):
                        res = engine.infer(str(img), cat)
                        if res.prediction == 'FAIL':
                            TP += 1
                        else:
                            FN += 1
                            
            accuracy = (TP + TN) / max(1, TP + TN + FP + FN)
            precision = TP / max(1, TP + FP)
            recall = TP / max(1, TP + FN)
            f1 = 2 * (precision * recall) / max(1e-9, precision + recall)
            
            total_acc += accuracy
            total_prec += precision
            total_rec += recall
            total_f1 += f1
            
            f.write(f"Category: {cat}\n")
            f.write(f"Accuracy:  {accuracy:.4f}\n")
            f.write(f"Precision: {precision:.4f}\n")
            f.write(f"Recall:    {recall:.4f}\n")
            f.write(f"F1 Score:  {f1:.4f}\n")
            f.write(f"Confusion Matrix: [TP: {TP}, TN: {TN}, FP: {FP}, FN: {FN}]\n")
            f.write("-" * 30 + "\n")
            
        n = len(categories)
        f.write("\nOverall Metrics\n")
        f.write(f"Mean Accuracy:  {total_acc/n:.4f}\n")
        f.write(f"Mean Precision: {total_prec/n:.4f}\n")
        f.write(f"Mean Recall:    {total_rec/n:.4f}\n")
        f.write(f"Mean F1 Score:  {total_f1/n:.4f}\n")
    
    print("\nEvaluation complete. Results saved to evaluation_report.txt.")

if __name__ == "__main__":
    evaluate_all()
