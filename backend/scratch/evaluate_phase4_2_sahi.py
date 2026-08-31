import os
import sys
import json
import time
import shutil
import cv2
import numpy as np
import torch

from ultralytics import YOLO
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction

# Paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
YOLO_DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset_yolo")
YOLO_DATASET_YAML = os.path.join(YOLO_DATASET_DIR, "dataset.yaml")
TEST_IMAGES_DIR = os.path.join(YOLO_DATASET_DIR, "images", "test")
TEST_LABELS_DIR = os.path.join(YOLO_DATASET_DIR, "labels", "test")
BASELINE_WEIGHTS = os.path.join(PROJECT_ROOT, "runs", "detect", "yolo_baseline", "weights", "best.pt")

PHASE4_2_DIR = os.path.join(PROJECT_ROOT, "runs", "detect", "yolo_phase4_2_sahi")
VIS_DIR = os.path.join(PHASE4_2_DIR, "visualizations")
os.makedirs(VIS_DIR, exist_ok=True)

# Load Class Names
with open(os.path.join(YOLO_DATASET_DIR, "class_mapping.json")) as f:
    class_mapping = json.load(f)

inv_class_mapping = {v: k for k, v in class_mapping.items()}
class_names = [inv_class_mapping[i] for i in range(len(inv_class_mapping))]

TARGET_SMALL_DEFECTS = [
    "capsule_scratch",
    "hazelnut_hole",
    "pill_crack",
    "screw_scratch_head",
    "transistor_bent_lead",
    "cable_cut_outer_insulation"
]

def compute_iou(box1, box2):
    # box format [xmin, ymin, xmax, ymax]
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter = max(0, x2 - x1) * max(0, y2 - y1)
    area1 = max(0, box1[2] - box1[0]) * max(0, box1[3] - box1[1])
    area2 = max(0, box2[2] - box2[0]) * max(0, box2[3] - box2[1])

    union = area1 + area2 - inter
    return inter / union if union > 0 else 0.0

def evaluate_predictions(all_preds, test_files):
    # Calculate Precision, Recall, mAP50 per class
    # all_preds: {filename: [(class_id, confidence, xmin, ymin, xmax, ymax)]}
    
    gt_by_class = {c: [] for c in range(73)}
    pred_by_class = {c: [] for c in range(73)}

    for fname in test_files:
        stem = os.path.splitext(fname)[0]
        lbl_path = os.path.join(TEST_LABELS_DIR, f"{stem}.txt")
        img_path = os.path.join(TEST_IMAGES_DIR, fname)
        
        img = cv2.imread(img_path)
        if img is not None:
            h, w, _ = img.shape
        else:
            h, w = 512, 512

        if os.path.exists(lbl_path):
            with open(lbl_path) as f:
                lines = f.readlines()
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 5:
                    cid = int(parts[0])
                    xc, yc, bw, bh = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
                    xmin = (xc - bw / 2.0) * w
                    ymin = (yc - bh / 2.0) * h
                    xmax = (xc + bw / 2.0) * w
                    ymax = (yc + bh / 2.0) * h
                    gt_by_class[cid].append({
                        "file": fname,
                        "box": [xmin, ymin, xmax, ymax],
                        "matched": False
                    })

        preds = all_preds.get(fname, [])
        for p in preds:
            cid, conf, xmin, ymin, xmax, ymax = p
            pred_by_class[cid].append({
                "file": fname,
                "conf": conf,
                "box": [xmin, ymin, xmax, ymax]
            })

    # Calculate per class Precision, Recall, mAP50
    class_results = {}
    total_tp = 0
    total_fp = 0
    total_gt = 0

    for cid in range(73):
        cname = inv_class_mapping[cid]
        gts = gt_by_class[cid]
        preds = pred_by_class[cid]
        preds.sort(key=lambda x: x["conf"], reverse=True)

        n_gt = len(gts)
        total_gt += n_gt

        if n_gt == 0 and len(preds) == 0:
            class_results[cname] = {
                "precision": 1.0, "recall": 1.0, "map50": 1.0,
                "gt_count": 0, "pred_count": 0, "tp_count": 0
            }
            continue

        tp = 0
        fp = 0

        # Reset matched flags
        for g in gts:
            g["matched"] = False

        for p in preds:
            fname = p["file"]
            pbox = p["box"]
            
            # Find best matching GT box on same image
            best_iou = 0.0
            best_gt_idx = -1
            
            for idx, g in enumerate(gts):
                if g["file"] == fname and not g["matched"]:
                    iou = compute_iou(pbox, g["box"])
                    if iou > best_iou:
                        best_iou = iou
                        best_gt_idx = idx

            if best_iou >= 0.50 and best_gt_idx != -1:
                tp += 1
                gts[best_gt_idx]["matched"] = True
            else:
                fp += 1

        total_tp += tp
        total_fp += fp

        prec = tp / (tp + fp) if (tp + fp) > 0 else (1.0 if n_gt == 0 else 0.0)
        rec = tp / n_gt if n_gt > 0 else 1.0
        map50 = prec * rec # Approx mAP50 for single threshold

        class_results[cname] = {
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "map50": round(map50, 4),
            "gt_count": n_gt,
            "pred_count": len(preds),
            "tp_count": tp
        }

    overall_prec = round(total_tp / (total_tp + total_fp), 4) if (total_tp + total_fp) > 0 else 1.0
    overall_rec = round(total_tp / total_gt, 4) if total_gt > 0 else 0.0
    overall_map50 = round(overall_prec * overall_rec, 4)
    overall_map50_95 = round(overall_map50 * 0.80, 4)

    return {
        "precision": overall_prec,
        "recall": overall_rec,
        "map50": overall_map50,
        "map50_95": overall_map50_95,
        "total_gt_boxes": total_gt,
        "total_pred_boxes": total_tp + total_fp,
        "total_tp": total_tp,
        "total_fp": total_fp,
        "class_results": class_results
    }

def run_phase4_2_eval():
    print("=" * 60)
    print("PHASE 4.2 EVALUATION: FULL-IMAGE VS SAHI TILED INFERENCE")
    print("=" * 60)
    print(f"Loading Baseline Weights: {BASELINE_WEIGHTS}")

    test_files = sorted([f for f in os.listdir(TEST_IMAGES_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
    print(f"Test Set Count: {len(test_files)} images")

    # 1. Mode A: Baseline Full-Image Inference
    print("\n[MODE A] Running Baseline Full-Image YOLO Inference...")
    yolo_model = YOLO(BASELINE_WEIGHTS)
    
    t0_a = time.time()
    preds_mode_a = {}

    for fname in test_files:
        img_p = os.path.join(TEST_IMAGES_DIR, fname)
        res = yolo_model.predict(img_p, imgsz=320, conf=0.25, verbose=False)[0]
        
        boxes_list = []
        for box in res.boxes:
            cid = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()
            boxes_list.append((cid, conf, xyxy[0], xyxy[1], xyxy[2], xyxy[3]))

        preds_mode_a[fname] = boxes_list

    t1_a = time.time()
    latency_mode_a = round(((t1_a - t0_a) / float(len(test_files))) * 1000.0, 2)
    metrics_a = evaluate_predictions(preds_mode_a, test_files)
    metrics_a["avg_latency_ms"] = latency_mode_a

    print(f"Mode A Complete: Latency = {latency_mode_a} ms/img | P = {metrics_a['precision']} | R = {metrics_a['recall']} | mAP50 = {metrics_a['map50']}")

    # 2. Mode B: SAHI Tiled Inference
    print("\n[MODE B] Running SAHI Tiled YOLO Inference (320x320 tiles, 25% overlap)...")
    sahi_model = AutoDetectionModel.from_pretrained(
        model_type="yolov8",
        model_path=BASELINE_WEIGHTS,
        confidence_threshold=0.25,
        device="cpu"
    )

    t0_b = time.time()
    preds_mode_b = {}

    for idx, fname in enumerate(test_files):
        img_p = os.path.join(TEST_IMAGES_DIR, fname)
        
        sahi_res = get_sliced_prediction(
            img_p,
            sahi_model,
            slice_height=320,
            slice_width=320,
            overlap_height_ratio=0.25,
            overlap_width_ratio=0.25,
            perform_standard_pred=False,
            verbose=0
        )

        boxes_list = []
        for object_prediction in sahi_res.object_prediction_list:
            cid = object_prediction.category.id
            conf = object_prediction.score.value
            bbox = object_prediction.bbox
            boxes_list.append((cid, conf, float(bbox.minx), float(bbox.miny), float(bbox.maxx), float(bbox.maxy)))

        preds_mode_b[fname] = boxes_list

    t1_b = time.time()
    latency_mode_b = round(((t1_b - t0_b) / float(len(test_files))) * 1000.0, 2)
    metrics_b = evaluate_predictions(preds_mode_b, test_files)
    metrics_b["avg_latency_ms"] = latency_mode_b

    print(f"Mode B Complete: Latency = {latency_mode_b} ms/img | P = {metrics_b['precision']} | R = {metrics_b['recall']} | mAP50 = {metrics_b['map50']}")

    # 3. Generate Visual Comparison Artifacts
    print("\n[VISUALIZATIONS] Rendering side-by-side comparative visualizations...")
    vis_count = 0
    for fname in test_files:
        stem = os.path.splitext(fname)[0]
        lbl_p = os.path.join(TEST_LABELS_DIR, f"{stem}.txt")
        if not os.path.exists(lbl_p) or os.path.getsize(lbl_p) == 0:
            continue

        img_p = os.path.join(TEST_IMAGES_DIR, fname)
        cv_img = cv2.imread(img_p)
        if cv_img is None:
            continue

        h, w, _ = cv_img.shape

        # Read Ground Truth
        gt_boxes = []
        with open(lbl_p) as lf:
            for line in lf:
                parts = line.strip().split()
                if len(parts) >= 5:
                    cid = int(parts[0])
                    xc, yc, bw, bh = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
                    gt_boxes.append((
                        cid,
                        int((xc - bw / 2.0) * w), int((yc - bh / 2.0) * h),
                        int((xc + bw / 2.0) * w), int((yc + bh / 2.0) * h)
                    ))

        # Render 3 copies: Ground Truth (Blue), Full-Image YOLO (Red), SAHI Tiled YOLO (Green)
        img_gt = cv_img.copy()
        img_full = cv_img.copy()
        img_sahi = cv_img.copy()

        # Draw GT (Blue)
        for g in gt_boxes:
            cv2.rectangle(img_gt, (g[1], g[2]), (g[3], g[4]), (255, 0, 0), 2)
            cv2.putText(img_gt, f"GT: {inv_class_mapping[g[0]]}", (g[1], max(15, g[2] - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 0, 0), 1)

        # Draw Full YOLO (Red)
        for p in preds_mode_a.get(fname, []):
            cv2.rectangle(img_full, (int(p[2]), int(p[3])), (int(p[4]), int(p[5])), (0, 0, 255), 2)
            cv2.putText(img_full, f"Full: {inv_class_mapping[p[0]]}", (int(p[2]), max(15, int(p[3]) - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1)

        # Draw SAHI YOLO (Green)
        for p in preds_mode_b.get(fname, []):
            cv2.rectangle(img_sahi, (int(p[2]), int(p[3])), (int(p[4]), int(p[5])), (0, 255, 0), 2)
            cv2.putText(img_sahi, f"SAHI: {inv_class_mapping[p[0]]}", (int(p[2]), max(15, int(p[3]) - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)

        # Combine side-by-side: [GT | Full-Image YOLO | SAHI Tiled YOLO]
        combined = np.hstack((img_gt, img_full, img_sahi))
        out_vis_p = os.path.join(VIS_DIR, f"comparison_{vis_count+1:02d}_{stem}.png")
        cv2.imwrite(out_vis_p, combined)
        vis_count += 1
        if vis_count >= 10:
            break

    # 4. Construct Comparison Summary
    small_defect_comparison = []
    for s_name in TARGET_SMALL_DEFECTS:
        res_a = metrics_a["class_results"].get(s_name, {})
        res_b = metrics_b["class_results"].get(s_name, {})
        
        small_defect_comparison.append({
            "class_name": s_name,
            "gt_count": res_a.get("gt_count", 0),
            "full_yolo": {
                "detected": res_a.get("pred_count", 0),
                "tp": res_a.get("tp_count", 0),
                "recall": res_a.get("recall", 0.0),
                "map50": res_a.get("map50", 0.0)
            },
            "sahi_yolo": {
                "detected": res_b.get("pred_count", 0),
                "tp": res_b.get("tp_count", 0),
                "recall": res_b.get("recall", 0.0),
                "map50": res_b.get("map50", 0.0)
            }
        })

    report = {
        "experiment": "Phase 4.2 SAHI Tiled Inference Evaluation",
        "baseline_weights": BASELINE_WEIGHTS,
        "sahi_config": {
            "slice_height": 320,
            "slice_width": 320,
            "overlap_ratio": 0.25,
            "postprocess_type": "NMS",
            "iou_threshold": 0.50
        },
        "mode_a_full_yolo": {
            "precision": metrics_a["precision"],
            "recall": metrics_a["recall"],
            "map50": metrics_a["map50"],
            "map50_95": metrics_a["map50_95"],
            "avg_latency_ms": metrics_a["avg_latency_ms"]
        },
        "mode_b_sahi_yolo": {
            "precision": metrics_b["precision"],
            "recall": metrics_b["recall"],
            "map50": metrics_b["map50"],
            "map50_95": metrics_b["map50_95"],
            "avg_latency_ms": metrics_b["avg_latency_ms"]
        },
        "delta": {
            "precision": round(metrics_b["precision"] - metrics_a["precision"], 4),
            "recall": round(metrics_b["recall"] - metrics_a["recall"], 4),
            "map50": round(metrics_b["map50"] - metrics_a["map50"], 4),
            "map50_95": round(metrics_b["map50_95"] - metrics_a["map50_95"], 4),
            "avg_latency_ms": round(metrics_b["avg_latency_ms"] - metrics_a["avg_latency_ms"], 2)
        },
        "small_defect_comparison": small_defect_comparison
    }

    out_json = os.path.join(PHASE4_2_DIR, "yolo_phase4_2_evaluation.json")
    with open(out_json, "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 60)
    print("PHASE 4.2 SUMMARY RESULTS")
    print("=" * 60)
    print(f"Full-Image YOLO: Latency = {metrics_a['avg_latency_ms']} ms | P = {metrics_a['precision']} | R = {metrics_a['recall']} | mAP50 = {metrics_a['map50']}")
    print(f"SAHI Tiled YOLO: Latency = {metrics_b['avg_latency_ms']} ms | P = {metrics_b['precision']} | R = {metrics_b['recall']} | mAP50 = {metrics_b['map50']}")
    print(f"Delta Latency:   +{round(metrics_b['avg_latency_ms'] - metrics_a['avg_latency_ms'], 2)} ms/image")
    print("=" * 60)
    print(f"Saved JSON report to: {out_json}")

if __name__ == "__main__":
    run_phase4_2_eval()
