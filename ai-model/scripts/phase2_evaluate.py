import os
import sys
import json
import csv
import numpy as np
from pathlib import Path
from tqdm import tqdm

base_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai")
ai_model_dir = base_dir / "ai-model"
sys.path.append(str(ai_model_dir))

from inference.infer import InferenceEngine
from config.config import config

dataset_dir = base_dir / "dataset" / "mvtec_ad"
reports_dir = ai_model_dir / "reports"
os.makedirs(reports_dir, exist_ok=True)

def evaluate_all():
    engine = InferenceEngine()
    
    results_by_cat = {}
    all_failures = []
    
    for category in config.SUPPORTED_CATEGORIES:
        print(f"Evaluating {category}...")
        cat_test_dir = dataset_dir / category / "test"
        if not cat_test_dir.exists():
            print(f"Skipping {category}: no test dir")
            continue
            
        stats = {
            "good_count": 0,
            "defect_count": 0,
            "correct_pass": 0,
            "correct_fail": 0,
            "false_positives": 0,
            "false_negatives": 0,
            "good_scores": [],
            "defect_scores": []
        }
        
        for subtype in cat_test_dir.iterdir():
            if not subtype.is_dir():
                continue
            is_good = (subtype.name == "good")
            
            for img_path in subtype.glob("*.png"):
                try:
                    res = engine.infer(str(img_path), category)
                except Exception as e:
                    print(f"Error inferring {img_path}: {e}")
                    continue
                    
                score = res.anomaly_score
                pred = res.prediction # PASS or FAIL
                
                if is_good:
                    stats["good_count"] += 1
                    stats["good_scores"].append(score)
                    if pred == "PASS":
                        stats["correct_pass"] += 1
                    else:
                        stats["false_positives"] += 1
                        all_failures.append({
                            "category": category,
                            "image_path": str(img_path),
                            "ground_truth": "good",
                            "predicted": pred,
                            "score": score,
                            "defect_type": res.defect_type
                        })
                else:
                    stats["defect_count"] += 1
                    stats["defect_scores"].append(score)
                    if pred == "FAIL":
                        stats["correct_fail"] += 1
                    else:
                        stats["false_negatives"] += 1
                        all_failures.append({
                            "category": category,
                            "image_path": str(img_path),
                            "ground_truth": subtype.name,
                            "predicted": pred,
                            "score": score,
                            "defect_type": res.defect_type
                        })
                        
        # Calc metrics
        tp = stats["correct_fail"]
        tn = stats["correct_pass"]
        fp = stats["false_positives"]
        fn = stats["false_negatives"]
        
        eps = 1e-7
        stats["accuracy"] = (tp + tn) / (tp + tn + fp + fn + eps)
        stats["precision"] = tp / (tp + fp + eps)
        stats["recall"] = tp / (tp + fn + eps)
        stats["specificity"] = tn / (tn + fp + eps)
        stats["f1"] = 2 * (stats["precision"] * stats["recall"]) / (stats["precision"] + stats["recall"] + eps)
        stats["balanced_accuracy"] = (stats["recall"] + stats["specificity"]) / 2
        
        results_by_cat[category] = stats

    # Save to JSON
    with open(reports_dir / "evaluation_report.json", "w") as f:
        json.dump(results_by_cat, f, indent=4)
        
    # Save Failures
    with open(reports_dir / "evaluation_failures.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["category", "image_path", "ground_truth", "predicted", "score", "defect_type"])
        writer.writeheader()
        writer.writerows(all_failures)
        
    # Print summary
    for cat, stats in results_by_cat.items():
        print(f"\\n--- {cat} ---")
        print(f"Acc: {stats['accuracy']:.4f}, Prec: {stats['precision']:.4f}, Rec: {stats['recall']:.4f}, Spec: {stats['specificity']:.4f}")
        print(f"FP: {stats['false_positives']}, FN: {stats['false_negatives']}")
        if stats['good_scores']:
            print(f"Good scores -> min: {min(stats['good_scores']):.3f}, max: {max(stats['good_scores']):.3f}, mean: {np.mean(stats['good_scores']):.3f}")
        if stats['defect_scores']:
            print(f"Defect scores -> min: {min(stats['defect_scores']):.3f}, max: {max(stats['defect_scores']):.3f}, mean: {np.mean(stats['defect_scores']):.3f}")

if __name__ == "__main__":
    evaluate_all()
