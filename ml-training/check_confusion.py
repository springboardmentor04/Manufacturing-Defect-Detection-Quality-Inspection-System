"""
check_confusion.py

Runs the trained defect classifier on the validation set and prints
a confusion matrix + per-class accuracy, so we know exactly which
defect types are being mixed up with which.

Run inside ml-training venv:

    python check_confusion.py
"""

from ultralytics import YOLO
from pathlib import Path
from collections import defaultdict

MODEL_PATH = Path(
    r"C:\Users\veene.LAPTOP-VQNJ8SHT\runs\classify\runs\defect_classifier_v2\weights\best.pt"
)

VAL_DIR = Path("classifier_dataset/val")

model = YOLO(str(MODEL_PATH))


def main():

    class_dirs = sorted([d for d in VAL_DIR.iterdir() if d.is_dir()])
    class_names = [d.name for d in class_dirs]

    # confusion[true_label][predicted_label] = count
    confusion = defaultdict(lambda: defaultdict(int))
    total_per_class = defaultdict(int)
    correct_per_class = defaultdict(int)

    for class_dir in class_dirs:
        true_label = class_dir.name

        for img_path in class_dir.glob("*.png"):

            results = model.predict(
                source=str(img_path),
                imgsz=224,
                device="cpu",
                verbose=False
            )

            result = results[0]
            top1_index = int(result.probs.top1)
            predicted_label = result.names.get(top1_index, "unknown")

            confusion[true_label][predicted_label] += 1
            total_per_class[true_label] += 1

            if predicted_label == true_label:
                correct_per_class[true_label] += 1

    # -----------------------------------------
    # Per-class accuracy
    # -----------------------------------------
    print("\nPer-class accuracy:")
    print(f"{'Class':20s} {'Correct':>8s} {'Total':>8s} {'Accuracy':>10s}")
    print("-" * 50)

    for label in class_names:
        total = total_per_class[label]
        correct = correct_per_class[label]
        acc = (correct / total * 100) if total > 0 else 0
        print(f"{label:20s} {correct:>8d} {total:>8d} {acc:>9.1f}%")

    # -----------------------------------------
    # Confusion matrix
    # -----------------------------------------
    print("\nConfusion matrix (rows = true label, columns = predicted):")
    header = "TRUE\\PRED".ljust(20) + "".join(n[:6].ljust(8) for n in class_names)
    print(header)

    for true_label in class_names:
        row = true_label.ljust(20)
        for pred_label in class_names:
            count = confusion[true_label][pred_label]
            row += str(count).ljust(8)
        print(row)

    # -----------------------------------------
    # Top confusions (excluding correct predictions)
    # -----------------------------------------
    print("\nTop confusions (true -> predicted, count):")
    mistakes = []
    for true_label in class_names:
        for pred_label in class_names:
            if true_label != pred_label:
                count = confusion[true_label][pred_label]
                if count > 0:
                    mistakes.append((count, true_label, pred_label))

    mistakes.sort(reverse=True)
    for count, true_label, pred_label in mistakes[:15]:
        print(f"  {true_label} -> {pred_label}: {count}")


if __name__ == "__main__":
    main()