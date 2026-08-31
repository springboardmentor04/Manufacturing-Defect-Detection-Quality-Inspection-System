import os
import sys
import json
import time
import torch
from ultralytics import YOLO

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
YOLO_DATASET_YAML = os.path.join(PROJECT_ROOT, "dataset_yolo", "dataset.yaml")
RUNS_DIR = os.path.join(PROJECT_ROOT, "runs", "detect")
PHASE4_1_DIR = os.path.join(RUNS_DIR, "yolo_phase4_1_640")

def execute_phase4_1():
    print("=" * 60)
    print("PHASE 4.1 CONTROLLED EXPERIMENT: 640x640 RESOLUTION & EXTENDED TRAINING")
    print("=" * 60)

    # 1. Load YOLOv8n pretrained model
    model = YOLO("yolov8n.pt")

    # 2. Fast CPU Controlled Training (plots=False to prevent sub-process render hangs)
    print("[PHASE 4.1] Starting YOLOv8n training at 640x640 resolution (5 epochs)...")
    results = model.train(
        data=YOLO_DATASET_YAML,
        epochs=5,
        imgsz=640,
        batch=16,
        workers=0,
        fraction=0.35,
        device="cpu",
        project=RUNS_DIR,
        name="yolo_phase4_1_640",
        exist_ok=True,
        verbose=True,
        plots=False,
        seed=42
    )

    # 3. Evaluate on TEST set at 640x640
    best_weights_path = os.path.join(PHASE4_1_DIR, "weights", "best.pt")
    if not os.path.exists(best_weights_path):
        best_weights_path = os.path.join(PHASE4_1_DIR, "weights", "last.pt")

    print(f"\n[PHASE 4.1] Loading trained weights from: {best_weights_path}")
    eval_model = YOLO(best_weights_path)

    print("[PHASE 4.1] Running test set evaluation on 889 test images at 640x640...")
    t0 = time.time()
    test_metrics = eval_model.val(
        data=YOLO_DATASET_YAML,
        split="test",
        batch=16,
        imgsz=640,
        workers=0,
        device="cpu",
        plots=True,
        project=RUNS_DIR,
        name="yolo_phase4_1_test_eval",
        exist_ok=True
    )
    t1 = time.time()

    total_test_images = 889
    total_test_time_sec = t1 - t0
    avg_latency_ms = (total_test_time_sec / float(total_test_images)) * 1000.0

    # 4. Overall metrics
    box = test_metrics.box
    overall_p = round(float(box.mp), 4)
    overall_r = round(float(box.mr), 4)
    overall_map50 = round(float(box.map50), 4)
    overall_map50_95 = round(float(box.map), 4)

    # Per-class metrics
    per_class_results = []
    names_dict = test_metrics.names

    for idx, c_name in names_dict.items():
        try:
            p_c = round(float(box.p[idx]), 4)
            r_c = round(float(box.r[idx]), 4)
            map50_c = round(float(box.ap50[idx]), 4)
            map50_95_c = round(float(box.ap[idx]), 4)
        except Exception:
            p_c, r_c, map50_c, map50_95_c = 0.0, 0.0, 0.0, 0.0

        per_class_results.append({
            "class_id": idx,
            "class_name": c_name,
            "precision": p_c,
            "recall": r_c,
            "map50": map50_c,
            "map50_95": map50_95_c
        })

    # Target small defect classes
    target_small_defect_names = [
        "capsule_scratch",
        "hazelnut_hole",
        "pill_crack",
        "screw_scratch_head",
        "transistor_bent_lead",
        "cable_cut_outer_insulation"
    ]

    target_small_defect_results = [item for item in per_class_results if item["class_name"] in target_small_defect_names]

    # Baseline comparison metrics
    baseline_metrics = {
        "precision": 0.9270,
        "recall": 0.0293,
        "map50": 0.0528,
        "map50_95": 0.0401,
        "avg_latency_ms": 51.53
    }

    comparison = {
        "precision": {
            "baseline": baseline_metrics["precision"],
            "phase4_1": overall_p,
            "change": round(overall_p - baseline_metrics["precision"], 4)
        },
        "recall": {
            "baseline": baseline_metrics["recall"],
            "phase4_1": overall_r,
            "change": round(overall_r - baseline_metrics["recall"], 4)
        },
        "map50": {
            "baseline": baseline_metrics["map50"],
            "phase4_1": overall_map50,
            "change": round(overall_map50 - baseline_metrics["map50"], 4)
        },
        "map50_95": {
            "baseline": baseline_metrics["map50_95"],
            "phase4_1": overall_map50_95,
            "change": round(overall_map50_95 - baseline_metrics["map50_95"], 4)
        },
        "avg_latency_ms": {
            "baseline": baseline_metrics["avg_latency_ms"],
            "phase4_1": round(avg_latency_ms, 2),
            "change": round(avg_latency_ms - baseline_metrics["avg_latency_ms"], 2)
        }
    }

    report = {
        "model_name": "YOLOv8n Phase 4.1 (640x640, 5 Epochs)",
        "weights_path": best_weights_path,
        "epochs": 5,
        "imgsz": 640,
        "batch_size": 16,
        "device": "CPU",
        "avg_latency_ms": round(avg_latency_ms, 2),
        "overall_metrics": {
            "precision": overall_p,
            "recall": overall_r,
            "map50": overall_map50,
            "map50_95": overall_map50_95
        },
        "comparison_with_baseline": comparison,
        "target_small_defect_results": target_small_defect_results,
        "per_class_results": per_class_results
    }

    out_json = os.path.join(RUNS_DIR, "yolo_phase4_1_evaluation.json")
    with open(out_json, "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 60)
    print("PHASE 4.1 EVALUATION SUMMARY & COMPARISON")
    print("=" * 60)
    print(f"Precision:    Baseline = {baseline_metrics['precision']} | Phase 4.1 = {overall_p} (Change: {comparison['precision']['change']:+})")
    print(f"Recall:       Baseline = {baseline_metrics['recall']} | Phase 4.1 = {overall_r} (Change: {comparison['recall']['change']:+})")
    print(f"mAP@0.5:      Baseline = {baseline_metrics['map50']} | Phase 4.1 = {overall_map50} (Change: {comparison['map50']['change']:+})")
    print(f"mAP@0.5:0.95: Baseline = {baseline_metrics['map50_95']} | Phase 4.1 = {overall_map50_95} (Change: {comparison['map50_95']['change']:+})")
    print(f"Latency:      Baseline = {baseline_metrics['avg_latency_ms']} ms | Phase 4.1 = {round(avg_latency_ms, 2)} ms (Change: {comparison['avg_latency_ms']['change']:+} ms)")
    print("=" * 60)
    print(f"Saved evaluation JSON to: {out_json}")

if __name__ == "__main__":
    execute_phase4_1()
