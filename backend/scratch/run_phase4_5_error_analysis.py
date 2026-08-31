import os
import sys
import json
import cv2
import numpy as np
import torch
from ultralytics import YOLO

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
YOLO_DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset_yolo")
YOLO_DATASET_YAML = os.path.join(YOLO_DATASET_DIR, "dataset.yaml")
TEST_IMAGES_DIR = os.path.join(YOLO_DATASET_DIR, "images", "test")
TEST_LABELS_DIR = os.path.join(YOLO_DATASET_DIR, "labels", "test")

BEST_WEIGHTS = os.path.join(PROJECT_ROOT, "runs", "detect", "yolo_phase4_4_architecture", "weights", "best.pt")
PHASE4_5_DIR = os.path.join(PROJECT_ROOT, "runs", "detect", "yolo_phase4_5_error_analysis")
VIS_DIR = os.path.join(PHASE4_5_DIR, "visualizations")
os.makedirs(VIS_DIR, exist_ok=True)

with open(os.path.join(YOLO_DATASET_DIR, "class_mapping.json")) as f:
    class_mapping = json.load(f)

inv_class_mapping = {v: k for k, v in class_mapping.items()}

def run_error_analysis():
    print("=" * 60)
    print("PHASE 4.5: FINAL MODEL SELECTION & DETAILED ERROR ANALYSIS")
    print("=" * 60)
    print(f"Loading Best Model Weights: {BEST_WEIGHTS}")

    model = YOLO(BEST_WEIGHTS)

    # 1. Run Official Native Test Set Evaluation to retrieve per-class metrics
    print("\n[STEP 1] Running Native model.val() on TEST set (889 test images)...")
    val_results = model.val(
        data=YOLO_DATASET_YAML,
        split="test",
        batch=32,
        imgsz=320,
        workers=0,
        device="cpu",
        plots=False,
        project=PHASE4_5_DIR,
        name="native_eval",
        exist_ok=True
    )

    val_box = val_results.box
    names_dict = val_results.names

    per_class_table = []
    for idx, c_name in names_dict.items():
        try:
            p = float(val_box.p[idx])
            r = float(val_box.r[idx])
            map50 = float(val_box.ap50[idx])
            map50_95 = float(val_box.ap[idx])
        except Exception:
            p, r, map50, map50_95 = 0.0, 0.0, 0.0, 0.0

        # Count GT instances in test set
        gt_count = 0
        for fname in os.listdir(TEST_IMAGES_DIR):
            stem = os.path.splitext(fname)[0]
            lbl_p = os.path.join(TEST_LABELS_DIR, f"{stem}.txt")
            if os.path.exists(lbl_p):
                with open(lbl_p) as lf:
                    for line in lf:
                        parts = line.strip().split()
                        if len(parts) >= 5 and int(parts[0]) == idx:
                            gt_count += 1

        per_class_table.append({
            "class_id": idx,
            "class_name": c_name,
            "gt_instances": gt_count,
            "precision": round(p, 4),
            "recall": round(r, 4),
            "map50": round(map50, 4),
            "map50_95": round(map50_95, 4)
        })

    # Sort table from worst performing (mAP50 = 0.0) to best performing
    per_class_table.sort(key=lambda x: (x["map50"], x["recall"]))

    # Categorize error types
    zero_map_classes = [item for item in per_class_table if item["map50"] == 0.0]
    low_map_classes = [item for item in per_class_table if 0.0 < item["map50"] < 0.25]
    high_rec_classes = [item for item in per_class_table if item["recall"] >= 0.75]
    top_perf_classes = [item for item in per_class_table if item["map50"] >= 0.75]
    small_gt_classes = [item for item in per_class_table if item["gt_instances"] < 5]

    print(f"\nTotal Classes: {len(per_class_table)}")
    print(f"Zero mAP Classes: {len(zero_map_classes)}")
    print(f"Low mAP (<0.25) Classes: {len(low_map_classes)}")
    print(f"High Recall (>=0.75) Classes: {len(high_rec_classes)}")
    print(f"Top Performing (mAP>=0.75) Classes: {len(top_perf_classes)}")
    print(f"Small Sample Size (<5 GT) Classes: {len(small_gt_classes)}")

    # 2. Run Inference & Generate Representative Error Visualizations
    print("\n[STEP 2] Generating Representative Visual Examples for Error Categories...")
    
    test_files = sorted([f for f in os.listdir(TEST_IMAGES_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
    
    cat_samples = {
        "A_correct_detection": [],
        "B_missed_defect": [],
        "C_false_positive": [],
        "D_small_defect_detected": [],
        "E_small_defect_missed": []
    }

    for fname in test_files:
        stem = os.path.splitext(fname)[0]
        lbl_p = os.path.join(TEST_LABELS_DIR, f"{stem}.txt")
        img_p = os.path.join(TEST_IMAGES_DIR, fname)

        img = cv2.imread(img_p)
        if img is None:
            continue
        h, w, _ = img.shape

        # Ground truth boxes
        gt_boxes = []
        if os.path.exists(lbl_p):
            with open(lbl_p) as lf:
                for line in lf:
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        cid = int(parts[0])
                        xc, yc, bw, bh = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
                        gt_boxes.append((
                            cid,
                            int((xc - bw / 2.0) * w), int((yc - bh / 2.0) * h),
                            int((xc + bw / 2.0) * w), int((yc + bh / 2.0) * h),
                            bw * bh
                        ))

        # Predict with YOLOv8s
        res = model.predict(img_p, imgsz=320, conf=0.25, verbose=False)[0]
        preds = []
        for det in res.boxes:
            cid = int(det.cls[0].item())
            conf = float(det.conf[0].item())
            xyxy = det.xyxy[0].tolist()
            preds.append((cid, conf, int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])))

        # Classification heuristics
        if len(gt_boxes) > 0 and len(preds) > 0:
            if len(cat_samples["A_correct_detection"]) < 3:
                cat_samples["A_correct_detection"].append((fname, img, gt_boxes, preds))
        if len(gt_boxes) > 0 and len(preds) == 0:
            if len(cat_samples["B_missed_defect"]) < 3:
                cat_samples["B_missed_defect"].append((fname, img, gt_boxes, preds))
        if len(gt_boxes) == 0 and len(preds) > 0:
            if len(cat_samples["C_false_positive"]) < 3:
                cat_samples["C_false_positive"].append((fname, img, gt_boxes, preds))
        if len(gt_boxes) > 0 and any(g[5] < 0.02 for g in gt_boxes) and len(preds) > 0:
            if len(cat_samples["D_small_defect_detected"]) < 3:
                cat_samples["D_small_defect_detected"].append((fname, img, gt_boxes, preds))
        if len(gt_boxes) > 0 and any(g[5] < 0.02 for g in gt_boxes) and len(preds) == 0:
            if len(cat_samples["E_small_defect_missed"]) < 3:
                cat_samples["E_small_defect_missed"].append((fname, img, gt_boxes, preds))

    # Render image panels
    for cat_key, samples in cat_samples.items():
        for i, (fname, cv_img, gts, prs) in enumerate(samples):
            vis_img = cv_img.copy()
            # Draw GT (Blue)
            for g in gts:
                cv2.rectangle(vis_img, (g[1], g[2]), (g[3], g[4]), (255, 0, 0), 2)
                cv2.putText(vis_img, f"GT: {inv_class_mapping[g[0]]}", (g[1], max(15, g[2] - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 0, 0), 1)

            # Draw Pred (Red/Green)
            for p in prs:
                color = (0, 255, 0) if len(gts) > 0 else (0, 0, 255)
                cv2.rectangle(vis_img, (p[2], p[3]), (p[4], p[5]), color, 2)
                cv2.putText(vis_img, f"Pred: {inv_class_mapping[p[0]]} {p[1]:.2f}", (p[2], max(15, p[3] - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

            out_path = os.path.join(VIS_DIR, f"{cat_key}_{i+1:02d}_{fname}")
            cv2.imwrite(out_path, vis_img)

    # 3. Output Json Summary
    analysis_report = {
        "best_model_weights": BEST_WEIGHTS,
        "overall_metrics": {
            "precision": round(float(val_box.mp), 4),
            "recall": round(float(val_box.mr), 4),
            "map50": round(float(val_box.map50), 4),
            "map50_95": round(float(val_box.map), 4),
            "latency_ms": 72.75
        },
        "summary": {
            "total_classes": len(per_class_table),
            "zero_map_classes": len(zero_map_classes),
            "low_map_classes": len(low_map_classes),
            "high_recall_classes": len(high_rec_classes),
            "top_performing_classes": len(top_perf_classes),
            "small_sample_classes": len(small_gt_classes)
        },
        "per_class_table": per_class_table
    }

    out_json = os.path.join(PHASE4_5_DIR, "yolo_phase4_5_analysis.json")
    with open(out_json, "w") as f:
        json.dump(analysis_report, f, indent=2)

    print(f"\n[PHASE 4.5 COMPLETE] Saved error analysis JSON to: {out_json}")

if __name__ == "__main__":
    run_error_analysis()
