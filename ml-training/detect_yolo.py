from ultralytics import YOLO
from pathlib import Path

# Load trained YOLO model
MODEL_PATH = r"C:\YOLO_TRAINING\metal_nut_from_scratch\weights\best.pt"

# Change this to an actual image
IMAGE_PATH = r"C:\YOLO_DATASET\images\test\scratch_003.png"

# Load model
model = YOLO(MODEL_PATH)

print("YOLO model loaded successfully!")
print("Running detection...")

# Run detection
results = model.predict(
    source=IMAGE_PATH,
    conf=0.10,
    save=True,
    save_txt=True
)

for result in results:
    print("\nDetection Results:")
    
    if result.boxes is None or len(result.boxes) == 0:
        print("No defect detected.")
    else:
        for box in result.boxes:
            confidence = float(box.conf[0])
            class_id = int(box.cls[0])

            print(f"Defect detected!")
            print(f"Class: {class_id}")
            print(f"Confidence: {confidence * 100:.2f}%")

print("\nDetection completed.")
print("Check the 'runs/detect' folder for the output image.")