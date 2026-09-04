from pathlib import Path

from anomalib.engine import Engine
from anomalib.models import EfficientAd


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

MODEL_PATH = (
    PROJECT_ROOT
    / "training"
    / "results"
    / "EfficientAd"
    / "MVTecAD"
    / "bottle"
    / "v1"
    / "weights"
    / "lightning"
    / "model.ckpt"
)

IMAGE_PATH = (
    PROJECT_ROOT
    / "dataset"
    / "archive"
    / "bottle"
    / "test"
    / "broken_large"
    / "000.png"
)


# ============================================================
# CHECK FILES
# ============================================================

print("=" * 60)
print("VisionInspect AI - Industrial Visual Inspection")
print("=" * 60)

print("Model :", MODEL_PATH)
print("Image :", IMAGE_PATH)

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

if not IMAGE_PATH.exists():
    raise FileNotFoundError(f"Image not found: {IMAGE_PATH}")


# ============================================================
# LOAD MODEL
# ============================================================

print("\nLoading EfficientAD model...")

model = EfficientAd()

engine = Engine()

print("Model loaded.")
print("\nRunning inspection...")


# ============================================================
# PREDICTION
# ============================================================

predictions = engine.predict(
    model=model,
    ckpt_path=str(MODEL_PATH),
    data_path=str(IMAGE_PATH),
)


# ============================================================
# DISPLAY RESULT
# ============================================================

print("\n")
print("=" * 60)
print("INSPECTION RESULT")
print("=" * 60)

if predictions is None:
    print("No prediction returned.")
else:
    for prediction in predictions:
        print("\nPrediction object:")
        print(prediction)

        print("\nPrediction fields:")

        if hasattr(prediction, "pred_score"):
            print("Anomaly Score :", prediction.pred_score)

        if hasattr(prediction, "pred_label"):
            print("Prediction    :", prediction.pred_label)

        if hasattr(prediction, "anomaly_map"):
            print("Anomaly Map   : Available")

print("\nInspection completed.")