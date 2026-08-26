from ultralytics import YOLO
import os
import csv

# ============================================================
# CONFIGURATION - train-12 (100 epoch YOLO11n model)
# ============================================================

MODEL_PATH = r"C:\Users\veene.LAPTOP-VQNJ8SHT\runs\detect\train-12\weights\best.pt"

DATA_YAML = r"C:\Users\veene.LAPTOP-VQNJ8SHT\OneDrive\Infosys\intern\visioninspect-ai\visioninspect-ai\ml-training\multiclass_defect_dataset\data.yaml"

RESULTS_DIR = r"evaluation_results_train12"

# ============================================================
# DEFECT CATEGORIES (from data.yaml)
# ============================================================

CLASS_NAMES = {
    0: "broken",
    1: "contamination",
    2: "crack",
    3: "cut",
    4: "deformation",
    5: "discoloration",
    6: "foreign_material",
    7: "hole",
    8: "missing_component",
    9: "other",
    10: "scratch",
}

os.makedirs(RESULTS_DIR, exist_ok=True)

print()
print("=" * 100)
print("VISIONINSPECT AI - train-12 (100 EPOCH) MODEL EVALUATION")
print("=" * 100)
print("\nModel:", MODEL_PATH)
print("Dataset:", DATA_YAML)

print("\nLoading model...")
model = YOLO(MODEL_PATH)
print("Model loaded. Number of classes:", len(model.names))

print("\nRunning evaluation...\n")
results = model.val(
    data=DATA_YAML,
    split="val",
    imgsz=640,
    batch=16,
    device="cpu",
    workers=0,
    plots=True,
    verbose=True,
    project=RESULTS_DIR,
    name="train12_evaluation",
)

precision = float(results.box.mp)
recall = float(results.box.mr)
map50 = float(results.box.map50)
map50_95 = float(results.box.map)
f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

class_precision = results.box.p
class_recall = results.box.r
class_f1 = results.box.f1
class_map50 = results.box.ap50
class_map50_95 = results.box.maps

print("\n" + "=" * 110)
print("DEFECT CATEGORY - CLASS-WISE EVALUATION")
print("=" * 110)
print(f"{'Defect Category':<20}{'Precision':>15}{'Recall':>15}{'F1-Score':>15}{'mAP50':>15}{'mAP50-95':>17}")
print("-" * 110)

rows = []
class_indexes = results.box.ap_class_index
for i, class_id in enumerate(class_indexes):
    class_id = int(class_id)
    class_name = CLASS_NAMES.get(class_id, f"class_{class_id}")
    p = float(class_precision[i])
    r = float(class_recall[i])
    f1_value = float(class_f1[i])
    ap50 = float(class_map50[i])
    ap50_95 = float(class_map50_95[class_id])

    print(f"{class_name:<20}{p*100:>14.2f}%{r*100:>14.2f}%{f1_value*100:>14.2f}%{ap50*100:>14.2f}%{ap50_95*100:>16.2f}%")
    rows.append([class_name, f"{p*100:.2f}%", f"{r*100:.2f}%", f"{f1_value*100:.2f}%", f"{ap50*100:.2f}%", f"{ap50_95*100:.2f}%"])

print("\n" + "=" * 100)
print("FINAL OVERALL SCORES")
print("=" * 100)
print(f"{'Precision':<20}: {precision*100:.2f}%")
print(f"{'Recall':<20}: {recall*100:.2f}%")
print(f"{'F1-Score':<20}: {f1*100:.2f}%")
print(f"{'mAP50':<20}: {map50*100:.2f}%")
print(f"{'mAP50-95':<20}: {map50_95*100:.2f}%")
print("=" * 100)

csv_path = os.path.join(RESULTS_DIR, "class_wise_evaluation.csv")
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["Defect Category", "Precision", "Recall", "F1-Score", "mAP50", "mAP50-95"])
    writer.writerows(rows)

overall_csv_path = os.path.join(RESULTS_DIR, "overall_evaluation.csv")
with open(overall_csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["Precision", "Recall", "F1-Score", "mAP50", "mAP50-95"])
    writer.writerow([f"{precision*100:.2f}%", f"{recall*100:.2f}%", f"{f1*100:.2f}%", f"{map50*100:.2f}%", f"{map50_95*100:.2f}%"])

print("\nClass-wise CSV :", os.path.abspath(csv_path))
print("Overall CSV    :", os.path.abspath(overall_csv_path))
print("Plots saved to :", os.path.abspath(os.path.join(RESULTS_DIR, "train12_evaluation")))
print("\nEvaluation completed successfully.")
