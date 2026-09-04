from pathlib import Path
from ultralytics import YOLO

# ============================================================
# VisionInspect AI - All Category Demonstration
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATASET_ROOT = PROJECT_ROOT / "dataset" / "archive"

MODEL_PATH = (
    PROJECT_ROOT
    / "runs"
    / "detect"
    / "results"
    / "yolo_defect"
    / "weights"
    / "best.pt"
)

OUTPUT_ROOT = PROJECT_ROOT / "runs" / "detect" / "all_categories_demo"

CATEGORIES = [
    "bottle",
    "cable",
    "capsule",
    "carpet",
    "grid",
    "hazelnut",
    "leather",
    "metal_nut",
    "pill",
    "screw",
    "tile",
    "toothbrush",
    "transistor",
    "wood",
    "zipper",
]

print("=" * 70)
print("VISIONINSPECT AI - ALL CATEGORY INSPECTION DEMO")
print("=" * 70)

print(f"Model: {MODEL_PATH}")

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"YOLO model not found: {MODEL_PATH}")

model = YOLO(str(MODEL_PATH))

print("\nYOLO model loaded successfully.")
print(f"Categories available: {len(CATEGORIES)}")

total_images = 0

for category in CATEGORIES:

    test_dir = DATASET_ROOT / category / "test"

    if not test_dir.exists():
        print(f"\n[{category}] TEST DIRECTORY NOT FOUND")
        continue

    images = list(test_dir.rglob("*.png"))

    if not images:
        print(f"\n[{category}] No test images found")
        continue

    # Take one normal image and one defect image if available
    good_images = [
        x for x in images
        if x.parent.name.lower() == "good"
    ]

    defect_images = [
        x for x in images
        if x.parent.name.lower() != "good"
    ]

    selected = []

    if good_images:
        selected.append(good_images[0])

    if defect_images:
        selected.append(defect_images[0])

    print("\n" + "-" * 70)
    print(f"CATEGORY: {category}")
    print(f"Test images available: {len(images)}")

    for image_path in selected:

        print(f"\nImage: {image_path}")

        results = model.predict(
            source=str(image_path),
            save=True,
            project=str(OUTPUT_ROOT),
            name=category,
            exist_ok=True,
            verbose=False,
        )

        result = results[0]

        if result.boxes is not None and len(result.boxes) > 0:

            print("DEFECT DETECTED: YES")
            print("STATUS: REJECT")

            for i, box in enumerate(result.boxes):

                class_id = int(box.cls[0])
                confidence = float(box.conf[0])

                class_name = model.names[class_id]

                print(
                    f"  Detection {i + 1}: "
                    f"{class_name} "
                    f"({confidence * 100:.2f}%)"
                )

        else:

            print("DEFECT DETECTED: NO")
            print("STATUS: PASS")

        total_images += 1

print("\n" + "=" * 70)
print("DEMONSTRATION COMPLETED")
print("=" * 70)

print(f"Categories processed: {len(CATEGORIES)}")
print(f"Images inspected: {total_images}")
print(f"Results saved to: {OUTPUT_ROOT}")