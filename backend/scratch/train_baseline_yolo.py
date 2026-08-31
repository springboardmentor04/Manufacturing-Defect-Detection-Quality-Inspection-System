import os
import sys
import json
import time
from ultralytics import YOLO

# Paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
YOLO_DATASET_YAML = os.path.join(PROJECT_ROOT, "dataset_yolo", "dataset.yaml")
RUNS_DIR = os.path.join(PROJECT_ROOT, "runs", "detect")

def train_and_evaluate_baseline():
    print(f"[YOLO BASELINE] Initializing fast CPU YOLOv8n baseline training...")
    print(f"[YOLO BASELINE] Dataset YAML: {YOLO_DATASET_YAML}")

    # 1. Load YOLOv8n pretrained weights
    model = YOLO("yolov8n.pt")

    # 2. Fast CPU Train Configuration
    train_results = model.train(
        data=YOLO_DATASET_YAML,
        epochs=3,
        imgsz=320,
        batch=32,
        workers=0,
        device="cpu",
        project=RUNS_DIR,
        name="yolo_baseline",
        exist_ok=True,
        verbose=True,
        seed=42
    )

    print("\n[YOLO BASELINE] Training completed. Loading best trained model weights...")
    best_weights_path = os.path.join(RUNS_DIR, "yolo_baseline", "weights", "best.pt")
    
    if not os.path.exists(best_weights_path):
        best_weights_path = os.path.join(RUNS_DIR, "yolo_baseline", "weights", "last.pt")

    trained_model = YOLO(best_weights_path)

    # 3. Evaluate on TEST Set
    print("\n[YOLO BASELINE] Evaluating baseline model on TEST set...")
    t0 = time.time()
    test_metrics = trained_model.val(
        data=YOLO_DATASET_YAML,
        split="test",
        batch=32,
        imgsz=320,
        workers=0,
        device="cpu",
        project=RUNS_DIR,
        name="yolo_baseline_test_eval",
        exist_ok=True
    )
    t1 = time.time()

    total_test_images = 889
    total_test_time_sec = t1 - t0
    avg_latency_ms = (total_test_time_sec / float(total_test_images)) * 1000.0

    # 4. Extract Overall Metrics
    box = test_metrics.box
    overall_p = round(float(box.mp), 4)
    overall_r = round(float(box.mr), 4)
    overall_map50 = round(float(box.map50), 4)
    overall_map50_95 = round(float(box.map), 4)

    # Extract Per-Class Metrics
    per_class_results = []
    poor_performing_classes = []

    names_dict = test_metrics.names
    for idx, c_name in names_dict.items():
        try:
            p_c = round(float(box.p[idx]), 4)
            r_c = round(float(box.r[idx]), 4)
            map50_c = round(float(box.ap50[idx]), 4)
            map50_95_c = round(float(box.ap[idx]), 4)
        except Exception:
            p_c, r_c, map50_c, map50_95_c = 0.0, 0.0, 0.0, 0.0

        item = {
            "class_id": idx,
            "class_name": c_name,
            "precision": p_c,
            "recall": r_c,
            "map50": map50_c,
            "map50_95": map50_95_c
        }
        per_class_results.append(item)

        if map50_c < 0.50 or r_c < 0.40:
            poor_performing_classes.append(item)

    # Sort poor classes ascending by mAP50
    poor_performing_classes.sort(key=lambda x: x["map50"])

    evaluation_report = {
        "model_name": "YOLOv8n Baseline",
        "weights_path": best_weights_path,
        "epochs": 3,
        "imgsz": 320,
        "batch_size": 32,
        "device": "CPU",
        "avg_latency_ms": round(avg_latency_ms, 2),
        "overall_metrics": {
            "precision": overall_p,
            "recall": overall_r,
            "map50": overall_map50,
            "map50_95": overall_map50_95
        },
        "poor_performing_count": len(poor_performing_classes),
        "poor_performing_classes": poor_performing_classes,
        "per_class_results": per_class_results
    }

    out_json = os.path.join(RUNS_DIR, "yolo_baseline_evaluation.json")
    with open(out_json, "w") as f:
        json.dump(evaluation_report, f, indent=2)

    print("\n--- BASELINE EVALUATION COMPLETE ---")
    print(f"Precision: {overall_p}")
    print(f"Recall: {overall_r}")
    print(f"mAP@0.5: {overall_map50}")
    print(f"mAP@0.5:0.95: {overall_map50_95}")
    print(f"Avg Inference Latency: {round(avg_latency_ms, 2)} ms/image")
    print(f"Poor Performing Classes (<50% mAP50): {len(poor_performing_classes)} classes")
    print(f"Results saved to: {out_json}")

if __name__ == "__main__":
    train_and_evaluate_baseline()
