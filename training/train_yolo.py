"""Train the unified MVTec-derived YOLO detector.

Run from the repository root after ``prepare_yolo.py`` has generated the
dataset.  This is intentionally a training script, not a pre-trained model:
the resulting weights are saved below ``runs/detect`` and are the weights the
FastAPI application loads.
"""

from pathlib import Path

from ultralytics import YOLO


ROOT = Path(__file__).resolve().parents[1]
DATA_YAML = ROOT / "training" / "yolo_dataset" / "data.yaml"

if not DATA_YAML.is_file():
    raise FileNotFoundError("YOLO dataset missing. Run: python training/prepare_yolo.py")

# Create the YOLO architecture from its YAML definition, with random weights.
# This deliberately avoids COCO-pretrained ``.pt`` initialization.
model = YOLO("yolo11n.yaml")
model.train(
    data=str(DATA_YAML),
    epochs=50,
    imgsz=640,
    batch=8,
    patience=10,
    device="cpu",
    workers=0,
    project=str(ROOT / "runs" / "detect"),
    name="mvtec_unified_50ep",
    exist_ok=True,
    seed=42,
)
