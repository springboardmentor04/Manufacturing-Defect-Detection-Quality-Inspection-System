import argparse
import os
import shutil
from pathlib import Path
from ultralytics import YOLO


def run_training_pipeline(
    epochs: int = 50,
    imgsz: int = 640,
    batch_size: int = 16,
    base_model: str = "yolov8n.pt",
    dataset_yaml_path: str | Path | None = None,
    project_dir: str | Path | None = None,
):
    """
    Trains the defect detection model on the prepared dataset and exports
    the best performing weights to backend/models/.
    """
    # 1. Resolve project directories
    backend_dir = Path(__file__).resolve().parent
    project_root = backend_dir.parent

    if dataset_yaml_path is None:
        dataset_yaml = project_root / "dataset" / "dataset.yaml"
    else:
        dataset_yaml = Path(dataset_yaml_path)

    if not dataset_yaml.exists():
        raise FileNotFoundError(
            f"Dataset configuration not found at {dataset_yaml}. "
            "Please run backend/utils/dataset_prep.py first."
        )

    if project_dir is None:
        project_dir = backend_dir / "runs"
    else:
        project_dir = Path(project_dir)

    print(f"🚀 Initializing model training using model: {base_model}")
    print(f"📄 Dataset config: {dataset_yaml}")
    print(f"📁 Output project folder: {project_dir}")

    # 2. Load pre-trained base model
    model = YOLO(base_model)

    # 3. Execute model training
    results = model.train(
        data=str(dataset_yaml.absolute()),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        name="defect_detection_run",
        project=str(project_dir.absolute()),
        exist_ok=True
    )

    # 4. Locate and export trained weights to backend/models/
    trained_weights = project_dir / "defect_detection_run" / "weights" / "best.pt"
    target_weights_dir = backend_dir / "models"
    os.makedirs(target_weights_dir, exist_ok=True)
    
    destination_path = target_weights_dir / "best.pt"

    if trained_weights.exists():
        shutil.copy(trained_weights, destination_path)
        print(f"\n✅ Model training complete!")
        print(f"📦 Saved trained weights to: {destination_path.absolute()}")
    else:
        print(f"⚠️ Warning: Could not locate trained weights at {trained_weights}")

    return str(destination_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the defect detection YOLO model")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image size")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--base-model", type=str, default="yolov8n.pt", help="Base YOLO model to finetune")
    parser.add_argument(
        "--dataset-yaml",
        type=str,
        default="dataset/dataset.yaml",
        help="Path to the dataset YAML config"
    )
    parser.add_argument(
        "--project-dir",
        type=str,
        default=None,
        help="Output folder for training runs (defaults to backend/runs)"
    )

    args = parser.parse_args()

    run_training_pipeline(
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch_size=args.batch_size,
        base_model=args.base_model,
        dataset_yaml_path=args.dataset_yaml,
        project_dir=args.project_dir,
    )