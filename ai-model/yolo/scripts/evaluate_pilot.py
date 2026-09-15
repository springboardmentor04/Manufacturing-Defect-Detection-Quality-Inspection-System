import os
import cv2
import json
from pathlib import Path
from ultralytics import YOLO

def evaluate_model(model_path, imgsz, thresholds):
    print(f"\nEvaluating Model: {model_path} (imgsz={imgsz}) on VALIDATION set")
    model = YOLO(model_path)
    
    # We will run inference on validation images to manually calculate PASS/FAIL metrics
    val_images_dir = Path("ai-model/yolo/dataset/images/val")
    val_labels_dir = Path("ai-model/yolo/dataset/labels/val")
    
    results_by_thresh = {}
    
    # Load taxonomy
    with open("ai-model/yolo/taxonomy.json", "r") as f:
        taxonomy = json.load(f)
    classes = taxonomy["classes"]
    
    for thresh in thresholds:
        results_by_thresh[thresh] = {
            'FP': 0, 'FN': 0, 'TP': 0, 'TN': 0,
            'cat_stats': {}
        }
    
    # Pre-parse ground truths
    image_files = list(val_images_dir.glob("*.png"))
    for img_path in image_files:
        cat = img_path.stem.split('_')[0]
        
        # Ground truth
        label_path = val_labels_dir / f"{img_path.stem}.txt"
        has_defect_gt = False
        if label_path.exists():
            with open(label_path, "r") as f:
                if len(f.readlines()) > 0:
                    has_defect_gt = True
                    
        gt_status = "FAIL" if has_defect_gt else "PASS"
        
        # Run inference
        results = model.predict(source=str(img_path), imgsz=imgsz, verbose=False, device="cuda")
        
        for thresh in thresholds:
            has_defect_pred = False
            pred_classes = []
            
            for res in results:
                if res.boxes is not None:
                    for box in res.boxes:
                        if float(box.conf) >= thresh:
                            has_defect_pred = True
                            pred_classes.append(classes[int(box.cls)])
            
            pred_status = "FAIL" if has_defect_pred else "PASS"
            
            if cat not in results_by_thresh[thresh]['cat_stats']:
                results_by_thresh[thresh]['cat_stats'][cat] = {'GOOD_PASS':0, 'GOOD_FAIL':0, 'DEFECT_PASS':0, 'DEFECT_FAIL':0}
            
            if gt_status == "PASS" and pred_status == "PASS":
                results_by_thresh[thresh]['TN'] += 1
                results_by_thresh[thresh]['cat_stats'][cat]['GOOD_PASS'] += 1
            elif gt_status == "PASS" and pred_status == "FAIL":
                results_by_thresh[thresh]['FP'] += 1
                results_by_thresh[thresh]['cat_stats'][cat]['GOOD_FAIL'] += 1
            elif gt_status == "FAIL" and pred_status == "PASS":
                results_by_thresh[thresh]['FN'] += 1
                results_by_thresh[thresh]['cat_stats'][cat]['DEFECT_PASS'] += 1
            elif gt_status == "FAIL" and pred_status == "FAIL":
                results_by_thresh[thresh]['TP'] += 1
                results_by_thresh[thresh]['cat_stats'][cat]['DEFECT_FAIL'] += 1
                
    return results_by_thresh

def print_report(name, res):
    print(f"\n{'='*50}\n{name} VALIDATION SET RESULTS\n{'='*50}")
    for thresh, metrics in res.items():
        print(f"\n--- Threshold: {thresh} ---")
        tn, fp, fn, tp = metrics['TN'], metrics['FP'], metrics['FN'], metrics['TP']
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0
        
        print(f"PASS/FAIL (Image-level): TN={tn}, FP={fp}, FN={fn}, TP={tp}")
        print(f"FPR: {fpr:.4f} | FNR: {fnr:.4f}")
        print(f"Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f}")
        
        # Target specific categories for comparison
        target_cats = ['capsule', 'screw', 'tile', 'transistor', 'carpet', 'cable', 'bottle']
        for cat in target_cats:
            if cat in metrics['cat_stats']:
                s = metrics['cat_stats'][cat]
                print(f"  [{cat.capitalize()}] GOOD: {s['GOOD_PASS']}/{s['GOOD_PASS']+s['GOOD_FAIL']} | DEFECT: {s['DEFECT_FAIL']}/{s['DEFECT_FAIL']+s['DEFECT_PASS']}")

def main():
    thresholds = [0.10, 0.25, 0.35, 0.50]
    
    baseline_res = evaluate_model("ai-model/yolo/models/full_run/weights/best.pt", imgsz=640, thresholds=thresholds)
    pilot_res = evaluate_model("ai-model/yolo/models/pilot_run/weights/best.pt", imgsz=800, thresholds=thresholds)
    
    print_report("BASELINE MODEL", baseline_res)
    print_report("PILOT MODEL", pilot_res)
    
if __name__ == "__main__":
    main()
