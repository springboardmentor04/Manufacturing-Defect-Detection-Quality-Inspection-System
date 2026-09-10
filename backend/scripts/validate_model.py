import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import sys
import glob
import argparse
from typing import List, Dict, Any

# Ensure backend folder is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.defect_detection import run_inference, get_yolo_model

def collect_sample_images(dataset_root: str, sample_per_category: int = 7) -> List[Dict[str, Any]]:
    """
    Collects a balanced sample of images across defective and good categories from MVTec AD dataset.
    """
    samples = []
    
    # Check for test categories in dataset_root
    test_dir = os.path.join(dataset_root, "test")
    if not os.path.exists(test_dir):
        test_dir = dataset_root

    categories = [d for d in os.listdir(test_dir) if os.path.isdir(os.path.join(test_dir, d))]
    
    # Sort categories putting 'good' at the end for clean order
    categories = sorted(categories, key=lambda c: (1 if c == "good" else 0, c))

    for cat in categories:
        cat_path = os.path.join(test_dir, cat)
        img_files = []
        for ext in ("*.png", "*.jpg", "*.jpeg", "*.bmp"):
            img_files.extend(glob.glob(os.path.join(cat_path, ext)))
        
        img_files = sorted(img_files)[:sample_per_category]
        is_good = (cat.lower() == "good")

        for img_path in img_files:
            samples.append({
                "path": img_path,
                "filename": os.path.basename(img_path),
                "category": cat,
                "expected": "good" if is_good else "defective"
            })

    # Also check train/good if test/good was short
    train_good_dir = os.path.join(dataset_root, "train", "good")
    if os.path.exists(train_good_dir) and len([s for s in samples if s["expected"] == "good"]) < sample_per_category:
        train_files = sorted(glob.glob(os.path.join(train_good_dir, "*.png")) + glob.glob(os.path.join(train_good_dir, "*.jpg")))
        for img_path in train_files[:sample_per_category]:
            samples.append({
                "path": img_path,
                "filename": f"train_{os.path.basename(img_path)}",
                "category": "train_good",
                "expected": "good"
            })

    return samples

def validate_model(dataset_dir: str, sample_size: int = 7, conf_threshold: float = 0.25):
    os.environ["DETECTION_CONFIDENCE_THRESHOLD"] = str(conf_threshold)

    print("=" * 80)
    print(" VISIONINSPECT AI — DEFECT DETECTION MODEL VALIDATION BENCHMARK")
    print("=" * 80)
    print(f" Dataset Directory: {os.path.abspath(dataset_dir)}")
    print(f" Confidence Threshold: {conf_threshold}")
    
    # Preload model to initialize
    model = get_yolo_model()
    print(f" Model Loaded: {len(model.names)} classes")
    print("-" * 80)

    samples = collect_sample_images(dataset_dir, sample_per_category=sample_size)
    if not samples:
        print(f"[!] No sample images found in {dataset_dir}")
        return

    print(f"Collected {len(samples)} test sample images across {len(set(s['category'] for s in samples))} categories.\n")

    results = []
    
    # Table header
    header_fmt = "{:<4} | {:<22} | {:<16} | {:<10} | {:<8} | {:<25} | {:<8}"
    row_fmt    = "{:<4} | {:<22} | {:<16} | {:<10} | {:<8} | {:<25} | {:<8}"

    print(header_fmt.format("#", "Filename", "Category", "Expected", "Detected", "Confidences / Types", "Status"))
    print("-" * 105)

    defective_total = 0
    defective_detected = 0 # True Positives
    good_total = 0
    good_clean = 0         # True Negatives

    for idx, item in enumerate(samples, 1):
        img_path = item["path"]
        expected = item["expected"]
        category = item["category"]
        filename = item["filename"]

        detections = run_inference(img_path)
        num_det = len(detections)
        confs = [f"{d['confidence_score']:.2f}" for d in detections]
        types = [d["defect_type"] for d in detections]

        confs_types_str = ", ".join([f"{t}({c})" for t, c in zip(types, confs)]) if detections else "None"
        if len(confs_types_str) > 25:
            confs_types_str = confs_types_str[:22] + "..."

        if expected == "defective":
            defective_total += 1
            if num_det >= 1:
                defective_detected += 1
                status = "PASS (TP)"
            else:
                status = "FAIL (FN)"
        else:
            good_total += 1
            if num_det == 0:
                good_clean += 1
                status = "PASS (TN)"
            else:
                status = "FAIL (FP)"

        print(row_fmt.format(idx, filename[:22], category[:16], expected, num_det, confs_types_str, status))
        results.append({
            "filename": filename,
            "category": category,
            "expected": expected,
            "detected": num_det,
            "status": status,
            "detections": detections
        })

    # Metric Calculations
    recall_proxy = (defective_detected / defective_total * 100.0) if defective_total > 0 else 0.0
    specificity_proxy = (good_clean / good_total * 100.0) if good_total > 0 else 0.0
    overall_accuracy = ((defective_detected + good_clean) / (defective_total + good_total) * 100.0) if (defective_total + good_total) > 0 else 0.0

    print("=" * 105)
    print(" MODEL VALIDATION SUMMARY METRICS")
    print("=" * 105)
    print(f" Total Images Evaluated           : {len(samples)}")
    print(f" Defective Samples Tested         : {defective_total}")
    print(f" True Positives (Defect Detected) : {defective_detected}")
    print(f" False Negatives (Missed Defect)  : {defective_total - defective_detected}")
    print(f" Defect Detection Recall (Proxy)  : {recall_proxy:.2f}%")
    print("-" * 50)
    print(f" Good/Clean Samples Tested        : {good_total}")
    print(f" True Negatives (0 Defects)       : {good_clean}")
    print(f" False Positives (False Alarm)    : {good_total - good_clean}")
    print(f" Clean Image Specificity (Proxy)  : {specificity_proxy:.2f}%")
    print("-" * 50)
    print(f" Overall Classification Accuracy  : {overall_accuracy:.2f}%")
    print("=" * 105)

    return {
        "total_images": len(samples),
        "defective_total": defective_total,
        "defective_detected": defective_detected,
        "recall_proxy": round(recall_proxy, 2),
        "good_total": good_total,
        "good_clean": good_clean,
        "specificity_proxy": round(specificity_proxy, 2),
        "overall_accuracy": round(overall_accuracy, 2)
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VisionInspect AI Model Validation Benchmark Script")
    parser.add_argument("--dir", type=str, default=os.path.join(os.path.dirname(__file__), "..", "sample_data", "mvtec_ad", "bottle"), help="Path to MVTec AD object dataset directory")
    parser.add_argument("--samples", type=int, default=7, help="Number of sample images per category folder (default: 7)")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold for YOLO inference (default: 0.25)")
    args = parser.parse_args()

    validate_model(args.dir, sample_size=args.samples, conf_threshold=args.conf)
