import os
from pathlib import Path
from typing import Dict, Any
from ultralytics import YOLO


def evaluate_defect_model(
    model_path: str = None, 
    dataset_yaml: str = None
) -> Dict[str, Any]:
    """
    Evaluates the trained defect detection model on the validation dataset
    and returns key performance telemetry metrics (Precision, Recall, mAP).
    """
    backend_dir = Path(__file__).resolve().parent.parent
    project_root = backend_dir.parent

    # 1. Resolve default file paths if not explicitly passed
    if model_path is None:
        model_path = str(backend_dir / "models" / "best.pt")

    if dataset_yaml is None:
        dataset_yaml = str(project_root / "dataset" / "dataset.yaml")

    # 2. Path verification checks
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Trained model file not found at '{model_path}'. "
            "Please complete model training before running evaluation."
        )

    if not os.path.exists(dataset_yaml):
        raise FileNotFoundError(
            f"Dataset YAML file not found at '{dataset_yaml}'."
        )

    print(f"📊 Loading trained model for validation: {model_path}")
    model = YOLO(model_path)

    # 3. Run evaluation process
    print("🔍 Computing metrics on validation set...")
    metrics = model.val(data=dataset_yaml, split="val")

    # 4. Extract metrics
    precision = round(float(metrics.box.mp), 4)
    recall = round(float(metrics.box.mr), 4)
    map50 = round(float(metrics.box.map50), 4)
    map50_95 = round(float(metrics.box.map), 4)

    results = {
        "precision": precision,
        "recall": recall,
        "map50": map50,
        "map50_95": map50_95,
        "fitness_score": round(float(metrics.fitness), 4)
    }

    print("\n✅ Model Evaluation Summary:")
    print(f"  • Precision:  {precision:.2%}")
    print(f"  • Recall:     {recall:.2%}")
    print(f"  • mAP@50:     {map50:.2%}")
    print(f"  • mAP@50-95:  {map50_95:.2%}")

    return results


if __name__ == "__main__":
    evaluate_defect_model()