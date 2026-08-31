import os
import sys
import json
import time
from ultralytics import YOLO

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
YOLO_DATASET_YAML = os.path.join(PROJECT_ROOT, "dataset_yolo", "dataset.yaml")
RUNS_DIR = os.path.join(PROJECT_ROOT, "runs", "detect")
PHASE4_4_DIR = os.path.join(RUNS_DIR, "yolo_phase4_4_architecture")
os.makedirs(PHASE4_4_DIR, exist_ok=True)

def train_and_evaluate_phase4_4():
    print("=" * 60)
    print("PHASE 4.4: ARCHITECTURE SCALING EXPERIMENT (YOLOv8s + AUGMENTATION)")
    print("=" * 60)
    print(f"Dataset YAML: {YOLO_DATASET_YAML}")
    print(f"Target Run Dir: {PHASE4_4_DIR}")

    # 1. Load YOLOv8s pretrained model (11.2M parameters)
    model = YOLO("yolov8s.pt")

    # 2. Identical Phase 4.3 Augmentation Configuration
    aug_params = {
        "fliplr": 0.5,
        "flipud": 0.0,
        "degrees": 10.0,
        "scale": 0.2,
        "translate": 0.1,
        "hsv_h": 0.015,
        "hsv_s": 0.2,
        "hsv_v": 0.2,
        "mosaic": 0.5,
        "mixup": 0.0
    }

    print("\n[PHASE 4.4] Training YOLOv8s with Phase 4.3 Augmentations (5 Epochs, imgsz=320)...")
    train_results = model.train(
        data=YOLO_DATASET_YAML,
        epochs=5,
        imgsz=320,
        batch=32,
        workers=0,
        device="cpu",
        project=RUNS_DIR,
        name="yolo_phase4_4_architecture",
        exist_ok=True,
        verbose=True,
        plots=False,
        seed=42,
        **aug_params
    )

    # 3. Load Trained Weights
    best_weights_path = os.path.join(PHASE4_4_DIR, "weights", "best.pt")
    if not os.path.exists(best_weights_path):
        best_weights_path = os.path.join(PHASE4_4_DIR, "weights", "last.pt")

    print(f"\n[PHASE 4.4] Training complete. Loading best model weights: {best_weights_path}")
    eval_model = YOLO(best_weights_path)

    # 4. OFFICIAL Native Ultralytics val() Evaluation on TEST split (imgsz=320)
    print("[PHASE 4.4] Running OFFICIAL Native Ultralytics model.val() on TEST set (889 test images)...")
    t0 = time.time()
    val_metrics = eval_model.val(
        data=YOLO_DATASET_YAML,
        split="test",
        batch=32,
        imgsz=320,
        workers=0,
        device="cpu",
        plots=True,
        project=RUNS_DIR,
        name="yolo_phase4_4_test_eval",
        exist_ok=True
    )
    t1 = time.time()

    total_test_images = 889
    avg_latency_ms = round(((t1 - t0) / float(total_test_images)) * 1000.0, 2)

    # 5. Extract Official Native Metrics
    box = val_metrics.box
    overall_p = round(float(box.mp), 4)
    overall_r = round(float(box.mr), 4)
    overall_map50 = round(float(box.map50), 4)
    overall_map50_95 = round(float(box.map), 4)

    # Extract Per-Class Metrics
    per_class_results = []
    names_dict = val_metrics.names

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
        "cable_cut_outer_insulation",
        "pill_scratch"
    ]

    target_small_defect_results = [item for item in per_class_results if item["class_name"] in target_small_defect_names]

    # Phase 4.3 Best Benchmark Metrics (YOLOv8n + Augmentation)
    phase4_3_metrics = {
        "precision": 0.5670,
        "recall": 0.2112,
        "map50": 0.1714,
        "map50_95": 0.0941,
        "avg_latency_ms": 41.75
    }

    comparison = {
        "precision": {
            "phase4_3": phase4_3_metrics["precision"],
            "phase4_4": overall_p,
            "change": round(overall_p - phase4_3_metrics["precision"], 4)
        },
        "recall": {
            "phase4_3": phase4_3_metrics["recall"],
            "phase4_4": overall_r,
            "change": round(overall_r - phase4_3_metrics["recall"], 4)
        },
        "map50": {
            "phase4_3": phase4_3_metrics["map50"],
            "phase4_4": overall_map50,
            "change": round(overall_map50 - phase4_3_metrics["map50"], 4)
        },
        "map50_95": {
            "phase4_3": phase4_3_metrics["map50_95"],
            "phase4_4": overall_map50_95,
            "change": round(overall_map50_95 - phase4_3_metrics["map50_95"], 4)
        },
        "avg_latency_ms": {
            "phase4_3": phase4_3_metrics["avg_latency_ms"],
            "phase4_4": avg_latency_ms,
            "change": round(avg_latency_ms - phase4_3_metrics["avg_latency_ms"], 2)
        }
    }

    report = {
        "experiment": "Phase 4.4 Architecture Scaling (YOLOv8s + Augmentation)",
        "model_name": "YOLOv8s Phase 4.4 (11.2M params, 320x320, 5 Epochs)",
        "weights_path": best_weights_path,
        "epochs": 5,
        "imgsz": 320,
        "batch_size": 32,
        "device": "CPU",
        "augmentation_parameters": aug_params,
        "official_native_metrics": {
            "precision": overall_p,
            "recall": overall_r,
            "map50": overall_map50,
            "map50_95": overall_map50_95,
            "avg_latency_ms": avg_latency_ms
        },
        "comparison_with_phase4_3": comparison,
        "target_small_defect_results": target_small_defect_results,
        "per_class_results": per_class_results
    }

    out_json = os.path.join(PHASE4_4_DIR, "yolo_phase4_4_evaluation.json")
    with open(out_json, "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 60)
    print("PHASE 4.4 SUMMARY RESULTS & PHASE 4.3 COMPARISON")
    print("=" * 60)
    print(f"Precision:    Phase 4.3 (v8n) = {phase4_3_metrics['precision']} | Phase 4.4 (v8s) = {overall_p} (Change: {comparison['precision']['change']:+})")
    print(f"Recall:       Phase 4.3 (v8n) = {phase4_3_metrics['recall']} | Phase 4.4 (v8s) = {overall_r} (Change: {comparison['recall']['change']:+})")
    print(f"mAP@0.5:      Phase 4.3 (v8n) = {phase4_3_metrics['map50']} | Phase 4.4 (v8s) = {overall_map50} (Change: {comparison['map50']['change']:+})")
    print(f"mAP@0.5:0.95: Phase 4.3 (v8n) = {phase4_3_metrics['map50_95']} | Phase 4.4 (v8s) = {overall_map50_95} (Change: {comparison['map50_95']['change']:+})")
    print(f"Latency:      Phase 4.3 (v8n) = {phase4_3_metrics['avg_latency_ms']} ms | Phase 4.4 (v8s) = {avg_latency_ms} ms (Change: {comparison['avg_latency_ms']['change']:+} ms)")
    print("=" * 60)
    print(f"Saved evaluation JSON report to: {out_json}")

if __name__ == "__main__":
    train_and_evaluate_phase4_4()
