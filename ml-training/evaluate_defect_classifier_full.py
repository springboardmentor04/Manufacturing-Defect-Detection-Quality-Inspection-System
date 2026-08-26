"""
evaluate_defect_classifier_full.py

Full evaluation report for the CURRENT LIVE defect-type classifier
(defect_classifier_v3, used in defect_engine.py).

For each defect type (crack, scratch, hole, etc.), reports:
  - Precision  (of all images predicted as this class, how many were correct)
  - Recall     (of all images that ARE this class, how many were caught)
  - F1-score   (balance of precision and recall)
  - Support    (how many validation images exist for this class)

Plus overall accuracy and macro/weighted averages.

Run inside ml-training venv:

    python evaluate_defect_classifier_full.py
"""

from ultralytics import YOLO
from pathlib import Path
from collections import defaultdict

MODEL_PATH = Path(
    r"C:\Users\veene.LAPTOP-VQNJ8SHT\OneDrive\Infosys\intern\visioninspect-ai"
    r"\visioninspect-ai\ml-training\saved_models\defect_classifier\best.pt"
)

VAL_DIR = Path("classifier_dataset/val")

model = YOLO(str(MODEL_PATH))


def main():

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found:\n{MODEL_PATH}")

    if not VAL_DIR.exists():
        raise FileNotFoundError(f"Validation set not found:\n{VAL_DIR}")

    class_dirs = sorted([d for d in VAL_DIR.iterdir() if d.is_dir()])
    class_names = [d.name for d in class_dirs]

    # Counts needed for precision/recall/F1 per class
    true_positive = defaultdict(int)   # predicted X, actually X
    false_positive = defaultdict(int)  # predicted X, actually NOT X
    false_negative = defaultdict(int)  # actually X, predicted NOT X
    support = defaultdict(int)         # total actual images of class X

    total_images = 0
    total_correct = 0

    print("=" * 78)
    print("DEFECT CLASSIFICATION MODEL — FULL EVALUATION REPORT")
    print(f"Model: {MODEL_PATH.name}  (defect_classifier_v3)")
    print("=" * 78)
    print()
    print("Running inference on validation set...")
    print()

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

            support[true_label] += 1
            total_images += 1

            if predicted_label == true_label:
                true_positive[true_label] += 1
                total_correct += 1
            else:
                false_negative[true_label] += 1     # missed this class
                false_positive[predicted_label] += 1  # wrongly claimed other class

    overall_accuracy = (total_correct / total_images * 100) if total_images > 0 else 0

    # ------------------------------------------------------------
    # Per-class precision / recall / F1
    # ------------------------------------------------------------
    print(f"{'Defect Type':20s} {'Precision':>10s} {'Recall':>10s} {'F1-Score':>10s} {'Support':>10s}")
    print("-" * 78)

    macro_precision_sum = 0
    macro_recall_sum = 0
    macro_f1_sum = 0
    weighted_precision_sum = 0
    weighted_recall_sum = 0
    weighted_f1_sum = 0

    for label in class_names:
        tp = true_positive[label]
        fp = false_positive[label]
        fn = false_negative[label]
        n = support[label]

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

        macro_precision_sum += precision
        macro_recall_sum += recall
        macro_f1_sum += f1

        weighted_precision_sum += precision * n
        weighted_recall_sum += recall * n
        weighted_f1_sum += f1 * n

        print(f"{label:20s} {precision*100:>9.1f}% {recall*100:>9.1f}% {f1*100:>9.1f}% {n:>10d}")

    n_classes = len(class_names)
    macro_precision = macro_precision_sum / n_classes * 100
    macro_recall = macro_recall_sum / n_classes * 100
    macro_f1 = macro_f1_sum / n_classes * 100

    weighted_precision = weighted_precision_sum / total_images * 100
    weighted_recall = weighted_recall_sum / total_images * 100
    weighted_f1 = weighted_f1_sum / total_images * 100

    print("-" * 78)
    print(f"{'Macro average':20s} {macro_precision:>9.1f}% {macro_recall:>9.1f}% {macro_f1:>9.1f}% {total_images:>10d}")
    print(f"{'Weighted average':20s} {weighted_precision:>9.1f}% {weighted_recall:>9.1f}% {weighted_f1:>9.1f}% {total_images:>10d}")

    print()
    print("=" * 78)
    print("OVERALL SUMMARY")
    print("=" * 78)
    print(f"Overall Accuracy:        {overall_accuracy:.1f}%  ({total_correct}/{total_images})")
    print(f"Macro Avg F1-Score:      {macro_f1:.1f}%   (treats all classes equally)")
    print(f"Weighted Avg F1-Score:   {weighted_f1:.1f}%   (accounts for class imbalance)")
    print(f"Number of defect types:  {n_classes}")
    print(f"Total validation images: {total_images}")

    # Highlight strongest / weakest classes
    class_f1 = []
    for label in class_names:
        tp = true_positive[label]
        fp = false_positive[label]
        fn = false_negative[label]
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        class_f1.append((f1, label, support[label]))

    class_f1.sort(reverse=True)

    print()
    print("Strongest defect types (by F1-score):")
    for f1, label, n in class_f1[:3]:
        print(f"  {label:20s} F1: {f1*100:.1f}%  (n={n})")

    print()
    print("Weakest defect types (by F1-score):")
    for f1, label, n in class_f1[-3:]:
        print(f"  {label:20s} F1: {f1*100:.1f}%  (n={n})")

    print("=" * 78)


if __name__ == "__main__":
    main()