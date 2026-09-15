import os
import json
from pathlib import Path
from ultralytics import YOLO

def generate_report():
    model_path = "ai-model/yolo/models/optimized_run/weights/best.pt"
    model = YOLO(model_path)
    
    split = "test"
    images_dir = Path(f"ai-model/yolo/dataset/images/{split}")
    labels_dir = Path(f"ai-model/yolo/dataset/labels/{split}")
    
    categories = [
        "bottle", "cable", "capsule", "carpet", "grid", "hazelnut",
        "leather", "metal_nut", "pill", "screw", "tile", "toothbrush",
        "transistor", "wood", "zipper"
    ]
    
    threshold = 0.15
    
    stats = {cat: {"TP": 0, "FP": 0, "TN": 0, "FN": 0} for cat in categories}
    overall = {"TP": 0, "FP": 0, "TN": 0, "FN": 0}
    
    for img_path in images_dir.glob("*.png"):
        cat = img_path.stem.split('_')[0]
        if cat == "metal":
            cat = "metal_nut"
            
        # Check GT
        label_path = labels_dir / f"{img_path.stem}.txt"
        is_defect = False
        if label_path.exists():
            with open(label_path, "r") as f:
                if len(f.readlines()) > 0:
                    is_defect = True
                    
        # Predict
        results = model.predict(source=str(img_path), imgsz=800, verbose=False, device="cuda", conf=threshold)
        
        pred_fail = False
        for res in results:
            if res.boxes is not None and len(res.boxes) > 0:
                pred_fail = True
                break
                
        # Update stats
        if is_defect and pred_fail:
            stats[cat]["TP"] += 1
            overall["TP"] += 1
        elif is_defect and not pred_fail:
            stats[cat]["FN"] += 1
            overall["FN"] += 1
        elif not is_defect and pred_fail:
            stats[cat]["FP"] += 1
            overall["FP"] += 1
        elif not is_defect and not pred_fail:
            stats[cat]["TN"] += 1
            overall["TN"] += 1
            
    # Print report
    lines = []
    lines.append("# Comprehensive Evaluation Report (Test Set)\n")
    lines.append(f"**Model:** YOLO11n-seg (Optimized)\n")
    lines.append(f"**Threshold:** {threshold}\n")
    
    lines.append("## Overall Metrics\n")
    lines.append("| Metric | Value |")
    lines.append("|---|---|")
    lines.append(f"| True Positives (Defect correctly caught) | {overall['TP']} |")
    lines.append(f"| True Negatives (Good item passed) | {overall['TN']} |")
    lines.append(f"| False Positives (Good item rejected) | {overall['FP']} |")
    lines.append(f"| False Negatives (Defect missed) | {overall['FN']} |")
    
    prec = overall['TP'] / (overall['TP'] + overall['FP']) if (overall['TP'] + overall['FP']) > 0 else 0
    rec = overall['TP'] / (overall['TP'] + overall['FN']) if (overall['TP'] + overall['FN']) > 0 else 0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0
    fpr = overall['FP'] / (overall['FP'] + overall['TN']) if (overall['FP'] + overall['TN']) > 0 else 0
    fnr = overall['FN'] / (overall['FN'] + overall['TP']) if (overall['FN'] + overall['TP']) > 0 else 0
    
    lines.append(f"| Precision | {prec:.4f} |")
    lines.append(f"| Recall | {rec:.4f} |")
    lines.append(f"| F1-Score | {f1:.4f} |")
    lines.append(f"| False Positive Rate (FPR) | {fpr:.4f} ({fpr*100:.2f}%) |")
    lines.append(f"| False Negative Rate (FNR) | {fnr:.4f} ({fnr*100:.2f}%) |")
    lines.append("\n")
    
    lines.append("## Per-Category Breakdown\n")
    lines.append("| Category | TP | TN | FP | FN | Precision | Recall | F1 | FPR | FNR |")
    lines.append("|---|---|---|---|---|---|---|---|---|---|")
    
    for cat in categories:
        s = stats[cat]
        c_tp, c_tn, c_fp, c_fn = s["TP"], s["TN"], s["FP"], s["FN"]
        c_prec = c_tp / (c_tp + c_fp) if (c_tp + c_fp) > 0 else 0
        c_rec = c_tp / (c_tp + c_fn) if (c_tp + c_fn) > 0 else 0
        c_f1 = 2 * c_prec * c_rec / (c_prec + c_rec) if (c_prec + c_rec) > 0 else 0
        c_fpr = c_fp / (c_fp + c_tn) if (c_fp + c_tn) > 0 else 0
        c_fnr = c_fn / (c_fn + c_tp) if (c_fn + c_tp) > 0 else 0
        
        lines.append(f"| **{cat.capitalize()}** | {c_tp} | {c_tn} | {c_fp} | {c_fn} | {c_prec:.3f} | {c_rec:.3f} | {c_f1:.3f} | {c_fpr:.3f} | {c_fnr:.3f} |")
        
    with open("reports/comprehensive_test_report.md", "w") as f:
        f.write("\n".join(lines))
        
    print("Report saved to reports/comprehensive_test_report.md")

if __name__ == "__main__":
    generate_report()
