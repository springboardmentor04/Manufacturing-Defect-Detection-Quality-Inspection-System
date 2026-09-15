import os
import json
from pathlib import Path
from ultralytics import YOLO
import cv2
import numpy as np

def calculate_metrics(model, img_dir, lbl_dir, taxonomy, class_names, conf_thresh, device="cpu"):
    images = list(img_dir.glob("*.png"))
    
    results_summary = {
        "PASS_CORRECT": 0, "PASS_WRONG": 0,
        "FAIL_CORRECT": 0, "FAIL_WRONG": 0,
        "failures": []
    }
    
    cat_metrics = {}
    defect_metrics = {}
    
    for img_path in images:
        name = img_path.name
        cat = name.split('_')[0]
        
        if cat not in cat_metrics:
            cat_metrics[cat] = {"tp": 0, "fp": 0, "fn": 0, "tn": 0}
            
        lbl_file = lbl_dir / (img_path.stem + ".txt")
        gt_is_defect = lbl_file.exists() and lbl_file.stat().st_size > 0
        
        gt_classes = set()
        if gt_is_defect:
            with open(lbl_file, 'r') as f:
                for line in f:
                    pts = line.strip().split()
                    if pts:
                        gt_classes.add(int(pts[0]))
                        
        res = model(str(img_path), verbose=False, device=device, conf=conf_thresh)[0]
        boxes = res.boxes
        
        pred_is_defect = len(boxes) > 0
        pred_classes = set()
        highest_conf = 0.0
        top_defect_name = "None"
        
        if pred_is_defect:
            for box in boxes:
                c_id = int(box.cls[0].item())
                c_conf = float(box.conf[0].item())
                pred_classes.add(c_id)
                if c_conf > highest_conf:
                    highest_conf = c_conf
                    top_defect_name = class_names.get(c_id, f"Unknown-{c_id}")
                    
        # PASS/FAIL Image-level evaluation
        gt_status = "FAIL" if gt_is_defect else "PASS"
        pred_status = "FAIL" if pred_is_defect else "PASS"
        
        if gt_status == "PASS" and pred_status == "PASS":
            results_summary["PASS_CORRECT"] += 1
            cat_metrics[cat]["tn"] += 1
        elif gt_status == "PASS" and pred_status == "FAIL":
            results_summary["FAIL_WRONG"] += 1
            cat_metrics[cat]["fp"] += 1
            results_summary["failures"].append({
                "image": name, "category": cat, "gt": gt_status, "pred": pred_status,
                "conf": highest_conf, "pred_defect": top_defect_name
            })
        elif gt_status == "FAIL" and pred_status == "FAIL":
            results_summary["FAIL_CORRECT"] += 1
            cat_metrics[cat]["tp"] += 1
        elif gt_status == "FAIL" and pred_status == "PASS":
            results_summary["PASS_WRONG"] += 1
            cat_metrics[cat]["fn"] += 1
            results_summary["failures"].append({
                "image": name, "category": cat, "gt": gt_status, "pred": pred_status,
                "conf": 0.0, "pred_defect": "None"
            })
            
    return results_summary, cat_metrics

def calibrate_threshold(model, val_img_dir, val_lbl_dir, taxonomy, class_names, device):
    print("Calibrating threshold on validation set...")
    thresholds = [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6]
    best_thresh = 0.25
    best_f1 = 0.0
    
    for t in thresholds:
        summary, _ = calculate_metrics(model, val_img_dir, val_lbl_dir, taxonomy, class_names, t, device)
        tp = summary["FAIL_CORRECT"]
        fp = summary["FAIL_WRONG"]
        fn = summary["PASS_WRONG"]
        
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0
        
        print(f"Thresh {t:.2f} | P: {prec:.3f}, R: {rec:.3f}, F1: {f1:.3f} | FP: {fp}, FN: {fn}")
        
        if f1 > best_f1:
            best_f1 = f1
            best_thresh = t
            
    print(f"Selected Best Threshold: {best_thresh}")
    return best_thresh

def evaluate_test_set():
    import torch
    base_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai/ai-model/yolo")
    model_path = base_dir / "models" / "full_run" / "weights" / "best.pt"
    
    if not model_path.exists():
        print(f"Model not found at {model_path}. Please train first.")
        return
        
    device = "0" if torch.cuda.is_available() else "cpu"
    print(f"Loading model on {device}")
    model = YOLO(str(model_path))
    
    with open(base_dir / "taxonomy.json", 'r') as f:
        taxonomy = json.load(f)
    class_names = {i: name for i, name in enumerate(taxonomy["classes"])}
    
    val_img_dir = base_dir / "dataset" / "images" / "val"
    val_lbl_dir = base_dir / "dataset" / "labels" / "val"
    
    test_img_dir = base_dir / "dataset" / "images" / "test"
    test_lbl_dir = base_dir / "dataset" / "labels" / "test"
    
    best_thresh = calibrate_threshold(model, val_img_dir, val_lbl_dir, taxonomy, class_names, device)
    
    print("\nEvaluating on untouched test set...")
    summary, cat_metrics = calculate_metrics(model, test_img_dir, test_lbl_dir, taxonomy, class_names, best_thresh, device)
    
    # Also get YOLO native metrics (mAP etc)
    print("Running YOLO validation to get mAP...")
    metrics = model.val(data=str(base_dir / "dataset" / "data.yaml"), split="test", device=device, conf=best_thresh, save_json=True)
    
    print("\n==================================================")
    print("OVERALL METRICS (YOLO native)")
    print("==================================================")
    print(f"mAP50: {metrics.box.map50:.4f}")
    print(f"mAP50-95: {metrics.box.map:.4f}")
    print(f"Precision: {metrics.box.mp:.4f}")
    print(f"Recall: {metrics.box.mr:.4f}")
    
    tp = summary["FAIL_CORRECT"]
    fp = summary["FAIL_WRONG"]
    tn = summary["PASS_CORRECT"]
    fn = summary["PASS_WRONG"]
    
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0
    pass_acc = tn / (tn + fp) if (tn + fp) > 0 else 0
    fail_acc = tp / (tp + fn) if (tp + fn) > 0 else 0
    
    print("\n==================================================")
    print("PASS/FAIL METRICS")
    print("==================================================")
    print(f"Good -> PASS (TN): {tn}")
    print(f"Good -> FAIL (FP): {fp}")
    print(f"Defect -> PASS (FN): {fn}")
    print(f"Defect -> FAIL (TP): {tp}")
    print(f"False Positive Rate (FPR): {fpr:.4f}")
    print(f"False Negative Rate (FNR): {fnr:.4f}")
    print(f"PASS Accuracy: {pass_acc:.4f}")
    print(f"FAIL Accuracy: {fail_acc:.4f}")
    
    print("\n==================================================")
    print("CRITICAL CATEGORIES")
    print("==================================================")
    for cat in ["carpet", "cable", "capsule", "bottle"]:
        if cat in cat_metrics:
            cm = cat_metrics[cat]
            print(f"--- {cat.upper()} ---")
            print(f"GOOD samples:  correct PASS: {cm['tn']}, false FAIL: {cm['fp']}")
            print(f"DEFECT samples: correct FAIL: {cm['tp']}, false PASS: {cm['fn']}")
            
    print("\n==================================================")
    print("CRITICAL FAILURE ANALYSIS")
    print("==================================================")
    if summary["failures"]:
        for f in summary["failures"]:
            print(f"Image: {f['image']} | Cat: {f['category']} | GT: {f['gt']} -> Pred: {f['pred']} (Conf: {f['conf']:.2f}, Defect: {f['pred_defect']})")
    else:
        print("No failures found on test set! Perfect.")
        
    print("\n==================================================")
    print("PRODUCTION DECISION")
    print("==================================================")
    if fnr < 0.05 and fpr < 0.05:
        print("PRODUCTION READY")
    else:
        print("NOT PRODUCTION READY")
        print("Some failures persist. Check the failure analysis.")

if __name__ == '__main__':
    evaluate_test_set()
