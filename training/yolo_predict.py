from pathlib import Path
from ultralytics import YOLO

# ==============================
# VisionInspect AI - YOLO
# ==============================

MODEL_PATH = Path(
    r"D:\visioninspect-ai\runs\detect\results\yolo_defect\weights\best.pt"
)

# Change this to any test image you want to demonstrate
IMAGE_PATH = Path(
    r"D:\visioninspect-ai\dataset\archive\bottle\test\broken_large\000.png"
)

print("=" * 60)
print("VISIONINSPECT AI - YOLO INSPECTION")
print("=" * 60)

print(f"Model : {MODEL_PATH}")
print(f"Image : {IMAGE_PATH}")
print()

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

if not IMAGE_PATH.exists():
    raise FileNotFoundError(f"Image not found: {IMAGE_PATH}")

# Load trained YOLO model
model = YOLO(str(MODEL_PATH))

print("Model loaded.")
print("Running inspection...")
print()

# Run prediction
results = model.predict(
    source=str(IMAGE_PATH),
    conf=0.25,
    save=True,
    project=r"D:\visioninspect-ai\runs\detect",
    name="single_inspection",
    exist_ok=True,
    verbose=False,
)

result = results[0]

print("=" * 60)
print("INSPECTION RESULT")
print("=" * 60)

if result.boxes is None or len(result.boxes) == 0:
    print("Defect detected : NO")
    print("Status           : PASS")
else:
    print("Defect detected : YES")

    for i, box in enumerate(result.boxes):
        class_id = int(box.cls[0])
        confidence = float(box.conf[0])
        class_name = model.names[class_id]

        print()
        print(f"Detection {i + 1}")
        print(f"Defect type     : {class_name}")
        print(f"Confidence      : {confidence * 100:.2f}%")

    print()
    print("Status           : REJECT")

print("=" * 60)
print("Inspection completed.")
print()
print("Annotated image saved to:")
print(r"D:\visioninspect-ai\runs\detect\single_inspection")