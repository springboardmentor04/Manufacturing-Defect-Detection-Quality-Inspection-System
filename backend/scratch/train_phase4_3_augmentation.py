import os
import sys
import json
import time
from ultralytics import YOLO

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
YOLO_DATASET_YAML = os.path.join(PROJECT_ROOT, "dataset_yolo", "dataset.yaml")
RUNS_DIR = os.path.join(PROJECT_ROOT, "runs", "detect")
PHASE4_3_DIR = os.path.join(RUNS_DIR, "yolo_phase4_3_augmentation")
os.makedirs(PHASE4_3_DIR, exist_ok=True)

def train_and_evaluate_phase4_3():
    print("=" * 60)
    print("PHASE 4.3: TARGETED INDUSTRIAL DATA AUGMENTATION EXPERIMENT")
    print("=" * 60)
    print(f"Dataset YAML: {YOLO_DATASET_YAML}")
    print(f"Target Run Dir: {PHASE4_3_DIR}")

    # 1. Load YOLOv8n pretrained model
    model = YOLO("yolov8n.pt")

    # 2. Augmentation Hyperparameter Configuration
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

    print("\n[PHASE 4.3] Training YOLOv8n with Targeted Industrial Augmentations (5 Epochs, imgsz=320)...")
    train_results = model.train(
        data=YOLO_DATASET_YAML,
        epochs=5,
        imgsz=320,
        batch=32,
        workers=0,
        device="cpu",
        project=RUNS_DIR,
        name="yolo_phase4_3_augmentation",
        exist_ok=True,
        verbose=True,
        plots=False,
        seed=42,
        **aug_params
    )

    # 3. Load Trained Weights
    best_weights_path = os.path.join(PHASE4_3_DIR, "weights", "best.pt")
    if not os.path.exists(best_weights_path):
        best_weights_path = os.path.join(PHASE4_3_DIR, "weights", "last.pt")

    print(f"\n[PHASE 4.3] Training complete. Loading best model weights: {best_weights_path}")
    eval_model = YOLO(best_weights_path)

    # 4. OFFICIAL Native Ultralytics val() Evaluation on TEST split (imgsz=320)
    print("[PHASE 4.3] Running OFFICIAL Native Ultralytics model.val() on TEST set (889 test images)...")
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
        name="yolo_phase4_3_test_eval",
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
        "cable_cut_outer_insulation"
    ]

    target_small_defect_results = [item for item in per_class_results if item["class_name"] in target_small_defect_names]

    # Official Baseline Metrics (Phase 3 Baseline)
    baseline_metrics = {
        "precision": 0.9270,
        "recall": 0.0293,
        "map50": 0.0528,
        "map50_95": 0.0401,
        "avg_latency_ms": 39.90
    }

    comparison = {
        "precision": {
            "baseline": baseline_metrics["precision"],
            "phase4_3": overall_p,
            "change": round(overall_p - baseline_metrics["precision"], 4)
        },
        "recall": {
            "baseline": baseline_metrics["recall"],
            "phase4_3": overall_r,
            "change": round(overall_r - baseline_metrics["recall"], 4)
        },
        "map50": {
            "baseline": baseline_metrics["map50"],
            "phase4_3": overall_map50,
            "change": round(overall_map50 - baseline_metrics["map50"], 4)
        },
        "map50_95": {
            "baseline": baseline_metrics["map50_95"],
            "phase4_3": overall_map50_95,
            "change": round(overall_map50_95 - baseline_metrics["map50_95"], 4)
        },
        "avg_latency_ms": {
            "baseline": baseline_metrics["avg_latency_ms"],
            "phase4_3": avg_latency_ms,
            "change": round(avg_latency_ms - baseline_metrics["avg_latency_ms"], 2)
        }
    }

    report = {
        "experiment": "Phase 4.3 Targeted Industrial Data Augmentation",
        "model_name": "YOLOv8n Phase 4.3 (320x320, 5 Epochs, Augmentations)",
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
        "comparison_with_official_baseline": comparison,
        "target_small_defect_results": target_small_defect_results,
        "per_class_results": per_class_results
    }

    out_json = os.path.join(PHASE4_3_DIR, "yolo_phase4_3_evaluation.json")
    with open(out_json, "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 60)
    print("PHASE 4.3 EVALUATION SUMMARY & OFFICIAL BASELINE COMPARISON")
    print("=" * 60)
    print(f"Precision:    Official Baseline = {baseline_metrics['precision']} | Phase 4.3 = {overall_p} (Change: {comparison['precision']['change']:+})")
    print(f"Recall:       Official Baseline = {baseline_metrics['recall']} | Phase 4.3 = {overall_r} (Change: {comparison['recall']['change']:+})")
    print(f"mAP@0.5:      Official Baseline = {baseline_metrics['map50']} | Phase 4.3 = {overall_map50} (Change: {comparison['map50']['change']:+})")
    print(f"mAP@0.5:0.95: Official Baseline = {baseline_metrics['map50_95']} | Phase 4.3 = {overall_map50_95} (Change: {comparison['map50_95']['change']:+})")
    print(f"Latency:      Official Baseline = {baseline_metrics['avg_latency_ms']} ms | Phase 4.3 = {avg_latency_ms} ms (Change: {comparison['avg_latency_ms']['change']:+} ms)")
    print("=" * 60)
    print(f"Saved evaluation JSON report to: {out_json}")

if __name__ == "__main__":
    train_and_evaluate_phase4_3()
