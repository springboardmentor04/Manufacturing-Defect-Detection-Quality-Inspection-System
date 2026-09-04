from pathlib import Path
import sys

from ultralytics import YOLO
from anomalib.engine import Engine
from anomalib.models import EfficientAd


# ============================================================
# VISIONINSPECT AI - COMBINED INSPECTION
# YOLO + EfficientAD
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

YOLO_MODEL = (
    PROJECT_ROOT
    / "runs"
    / "detect"
    / "results"
    / "yolo_defect"
    / "weights"
    / "best.pt"
)

EFFICIENTAD_MODEL = (
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


# ------------------------------------------------------------
# Get image from command line
# ------------------------------------------------------------

if len(sys.argv) < 2:
    print("Usage:")
    print("python combined_inspection.py <image_path>")
    sys.exit(1)

IMAGE_PATH = Path(sys.argv[1])

if not IMAGE_PATH.exists():
    print(f"ERROR: Image not found: {IMAGE_PATH}")
    sys.exit(1)

if not YOLO_MODEL.exists():
    print(f"ERROR: YOLO model not found: {YOLO_MODEL}")
    sys.exit(1)

if not EFFICIENTAD_MODEL.exists():
    print(f"ERROR: EfficientAD model not found: {EFFICIENTAD_MODEL}")
    sys.exit(1)


print("=" * 70)
print("             VISIONINSPECT AI")
print("        INDUSTRIAL VISUAL INSPECTION")
print("=" * 70)

print(f"\nImage: {IMAGE_PATH}")

# ============================================================
# YOLO
# ============================================================

print("\n[1/2] Loading YOLO...")
yolo = YOLO(str(YOLO_MODEL))

print("Running YOLO inspection...")

results = yolo.predict(
    source=str(IMAGE_PATH),
    conf=0.25,
    verbose=False
)

result = results[0]

defects = []

if result.boxes is not None:
    for box in result.boxes:
        class_id = int(box.cls[0])
        confidence = float(box.conf[0])

        class_name = result.names[class_id]

        defects.append(
            {
                "type": class_name,
                "confidence": confidence,
            }
        )


# ============================================================
# EfficientAD
# ============================================================

print("[2/2] Loading EfficientAD...")

model = EfficientAd()
engine = Engine()

print("Running anomaly inspection...")

predictions = engine.predict(
    model=model,
    ckpt_path=str(EFFICIENTAD_MODEL),
    data_path=str(IMAGE_PATH),
)

prediction = predictions[0]

anomaly_score = float(prediction.pred_score[0][0])
anomaly = bool(prediction.pred_label[0])


# ============================================================
# FINAL RESULT
# ============================================================

print("\n")
print("=" * 70)
print("                 INSPECTION RESULT")
print("=" * 70)

print("\nYOLO DEFECT DETECTION")
print("-" * 70)

if defects:
    print("Defect detected : YES")

    for i, defect in enumerate(defects, 1):
        print(f"\nDetection {i}")
        print(f"Defect type     : {defect['type']}")
        print(f"Confidence      : {defect['confidence'] * 100:.2f}%")

else:
    print("Defect detected : NO")


print("\nEFFICIENTAD ANOMALY DETECTION")
print("-" * 70)

print(f"Anomaly score   : {anomaly_score:.4f}")
print(f"Anomaly         : {'YES' if anomaly else 'NO'}")


# ============================================================
# FINAL DECISION
# ============================================================

reject = bool(defects) or anomaly

print("\nFINAL INSPECTION")
print("-" * 70)

if reject:
    print("STATUS          : REJECT")
else:
    print("STATUS          : ACCEPT")


if defects:
    defect_types = sorted(set(d["type"] for d in defects))
    print(f"Reason          : {', '.join(defect_types)} detected")
elif anomaly:
    print("Reason          : Anomalous product")
else:
    print("Reason          : No defect detected")


print("=" * 70)
print("Inspection completed.")
print("=" * 70)