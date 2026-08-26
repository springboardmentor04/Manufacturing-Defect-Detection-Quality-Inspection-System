"""
check_detector_recall.py

Runs your existing product-category detector against every DEFECTIVE
image in the raw MVTec dataset (skips 'good' folders) and reports what
fraction it actually detects something on (recall), broken down by
category.

This does NOT touch your model or training data — it's read-only,
just for diagnosis.

Run inside ml-training (or backend-fastapi) venv:

    python check_detector_recall.py
"""

from ultralytics import YOLO
from pathlib import Path

MODEL_PATH = Path(
    r"C:\Users\veene.LAPTOP-VQNJ8SHT\runs\detect\runs\mvtec_unseen_1200_101_to_150\weights\best.pt"
)

SOURCE_DIR = Path(
    r"C:\Users\veene.LAPTOP-VQNJ8SHT\Downloads\mvtec_anomaly_detection"
)

CONF_THRESHOLD = 0.10

model = YOLO(str(MODEL_PATH))


def main():

    categories = sorted([p for p in SOURCE_DIR.iterdir() if p.is_dir()])

    overall_total = 0
    overall_detected = 0

    print(f"{'Category':20s} {'Detected':>10s} {'Total':>8s} {'Recall':>8s}")
    print("-" * 50)

    for category_dir in categories:
        test_dir = category_dir / "test"

        if not test_dir.exists():
            continue

        defect_dirs = [
            d for d in test_dir.iterdir()
            if d.is_dir() and d.name != "good"
        ]

        cat_total = 0
        cat_detected = 0

        for defect_dir in defect_dirs:
            for img_path in defect_dir.glob("*.png"):

                results = model.predict(
                    source=str(img_path),
                    imgsz=640,
                    conf=CONF_THRESHOLD,
                    device="cpu",
                    verbose=False
                )

                result = results[0]

                cat_total += 1

                if result.boxes is not None and len(result.boxes) > 0:
                    cat_detected += 1

        if cat_total > 0:
            recall = cat_detected / cat_total * 100
            print(f"{category_dir.name:20s} {cat_detected:>10d} {cat_total:>8d} {recall:>7.1f}%")

            overall_total += cat_total
            overall_detected += cat_detected

    print("-" * 50)
    if overall_total > 0:
        overall_recall = overall_detected / overall_total * 100
        print(f"{'OVERALL':20s} {overall_detected:>10d} {overall_total:>8d} {overall_recall:>7.1f}%")


if __name__ == "__main__":
    main()