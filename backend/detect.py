import sys
import os
from ultralytics import YOLO

# ============================================================
# CONFIGURATION
# ============================================================

MODEL_PATH = "saved_models/best.pt"

CLASS_NAMES = {
    0: "bottle",
    1: "cable",
    2: "capsule",
    3: "carpet",
    4: "grid",
    5: "hazelnut",
    6: "leather",
    7: "metal_nut",
    8: "pill",
    9: "screw",
    10: "tile",
    11: "toothbrush",
    12: "transistor",
    13: "wood",
    14: "zipper"
}

# ============================================================
# LOAD YOLO MODEL
# ============================================================

print("=" * 60)
print("VISIONINSPECT AI - DEFECT DETECTION")
print("=" * 60)

print("\nLoading YOLO model...")

model = YOLO(MODEL_PATH)

print("Model loaded successfully!")

# ============================================================
# CHECK INPUT
# ============================================================

if len(sys.argv) < 2:
    print("\nUsage:")
    print("python detect.py <image_path>")
    sys.exit(1)

image_path = sys.argv[1]

if not os.path.exists(image_path):
    print("\nImage not found!")
    print("Path:", image_path)
    sys.exit(1)

# ============================================================
# RUN DETECTION
# ============================================================

print("\nAnalyzing image...")
print("Image:", image_path)

results = model.predict(
    source=image_path,
    imgsz=640,
    conf=0.25,
    device="cpu",
    verbose=False
)

# ============================================================
# DISPLAY RESULTS
# ============================================================

print("\n" + "=" * 60)
print("DETECTION RESULTS")
print("=" * 60)

detected = False

for result in results:

    if result.boxes is None or len(result.boxes) == 0:
        continue

    detected = True

    for i in range(len(result.boxes)):

        class_id = int(result.boxes.cls[i].item())
        confidence = float(result.boxes.conf[i].item())

        # Use our correct class names
        class_name = CLASS_NAMES.get(
            class_id,
            f"class_{class_id}"
        )

        print("\nDefect/Object:")
        print("Class      :", class_name)
        print("Confidence :", f"{confidence * 100:.2f}%")

        # Bounding box
        box = result.boxes.xyxy[i].tolist()

        print(
            "Bounding Box:",
            [round(value, 2) for value in box]
        )

# ============================================================
# NO DETECTION
# ============================================================

if not detected:
    print("\nNo defect detected.")

# ============================================================
# SAVE RESULT IMAGE
# ============================================================

output_dir = "detection_results"
os.makedirs(output_dir, exist_ok=True)

for result in results:

    output_path = os.path.join(
        output_dir,
        "detection_result.jpg"
    )

    result.save(filename=output_path)

    print("\nResult image saved:")
    print(os.path.abspath(output_path))

# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 60)
print("DETECTION COMPLETE")
print("=" * 60)