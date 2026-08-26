from ultralytics import YOLO
import os
import csv

# ============================================================
# CONFIGURATION - 200 EPOCH YOLO11n MODEL
# ============================================================

MODEL_PATH = r"C:\Users\veene.LAPTOP-VQNJ8SHT\runs\detect\runs\mvtec_unseen_1200_101_to_150\weights\best.pt"

DATA_YAML = r"C:\Users\veene.LAPTOP-VQNJ8SHT\OneDrive\Infosys\intern\visioninspect-ai\visioninspect-ai\ml-training\mvtec_yolo_unseen_1200\data.yaml"

RESULTS_DIR = r"evaluation_results_200"

# ============================================================
# MVTec AD DEFECT CATEGORIES
# ============================================================

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
# CREATE RESULTS DIRECTORY
# ============================================================

os.makedirs(RESULTS_DIR, exist_ok=True)

# ============================================================
# HEADER
# ============================================================

print()
print("=" * 100)
print("VISIONINSPECT AI - YOLO11n 200 EPOCH MODEL EVALUATION")
print("=" * 100)

print("\nModel:")
print(MODEL_PATH)

print("\nDataset:")
print(DATA_YAML)

# ============================================================
# LOAD MODEL
# ============================================================

print("\nLoading model...")

model = YOLO(MODEL_PATH)

print("Model loaded successfully.")
print("Number of classes:", len(model.names))

# ============================================================
# RUN VALIDATION
# ============================================================

print("\nRunning evaluation...")
print("Please wait...\n")

results = model.val(
    data=DATA_YAML,
    split="val",
    imgsz=320,
    batch=16,
    device="cpu",
    workers=0,
    plots=True,
    verbose=True,
    project=RESULTS_DIR,
    name="yolo11n_200_epoch_evaluation"
)

# ============================================================
# OVERALL METRICS
# ============================================================

precision = float(results.box.mp)
recall = float(results.box.mr)
map50 = float(results.box.map50)
map50_95 = float(results.box.map)

# F1 Score
if precision + recall > 0:
    f1 = 2 * precision * recall / (precision + recall)
else:
    f1 = 0.0

# ============================================================
# CLASS-WISE METRICS
# ============================================================

class_precision = results.box.p
class_recall = results.box.r
class_f1 = results.box.f1
class_map50 = results.box.ap50
class_map50_95 = results.box.maps

# ============================================================
# 1. DEFECT CATEGORY EVALUATION
# ============================================================

print("\n")
print("=" * 110)
print("DEFECT CATEGORY - CLASS-WISE EVALUATION")
print("=" * 110)

print(
    f"{'Defect Category':<20}"
    f"{'Precision':>15}"
    f"{'Recall':>15}"
    f"{'F1-Score':>15}"
    f"{'mAP50':>15}"
    f"{'mAP50-95':>17}"
)

print("-" * 110)

rows = []

# Get class indexes evaluated by YOLO
class_indexes = results.box.ap_class_index

for i, class_id in enumerate(class_indexes):

    class_id = int(class_id)

    class_name = CLASS_NAMES.get(
        class_id,
        f"class_{class_id}"
    )

    p = float(class_precision[i])
    r = float(class_recall[i])
    f1_value = float(class_f1[i])
    ap50 = float(class_map50[i])
    ap50_95 = float(class_map50_95[class_id])

    print(
        f"{class_name:<20}"
        f"{p * 100:>14.2f}%"
        f"{r * 100:>14.2f}%"
        f"{f1_value * 100:>14.2f}%"
        f"{ap50 * 100:>14.2f}%"
        f"{ap50_95 * 100:>16.2f}%"
    )

    rows.append([
        class_name,
        f"{p * 100:.2f}%",
        f"{r * 100:.2f}%",
        f"{f1_value * 100:.2f}%",
        f"{ap50 * 100:.2f}%",
        f"{ap50_95 * 100:.2f}%"
    ])

# ============================================================
# 2. FINAL OVERALL SCORES
# ============================================================

print("\n")
print("=" * 100)
print("FINAL OVERALL SCORES")
print("=" * 100)

print(
    f"{'Precision':<20}: {precision * 100:.2f}%"
)

print(
    f"{'Recall':<20}: {recall * 100:.2f}%"
)

print(
    f"{'F1-Score':<20}: {f1 * 100:.2f}%"
)

print(
    f"{'mAP50':<20}: {map50 * 100:.2f}%"
)

print(
    f"{'mAP50-95':<20}: {map50_95 * 100:.2f}%"
)

print("=" * 100)

# ============================================================
# SAVE CLASS-WISE CSV
# ============================================================

csv_path = os.path.join(
    RESULTS_DIR,
    "class_wise_evaluation.csv"
)

with open(
    csv_path,
    "w",
    newline="",
    encoding="utf-8"
) as f:

    writer = csv.writer(f)

    writer.writerow([
        "Defect Category",
        "Precision",
        "Recall",
        "F1-Score",
        "mAP50",
        "mAP50-95"
    ])

    writer.writerows(rows)

# ============================================================
# SAVE OVERALL CSV
# ============================================================

overall_csv_path = os.path.join(
    RESULTS_DIR,
    "overall_evaluation.csv"
)

with open(
    overall_csv_path,
    "w",
    newline="",
    encoding="utf-8"
) as f:

    writer = csv.writer(f)

    writer.writerow([
        "Precision",
        "Recall",
        "F1-Score",
        "mAP50",
        "mAP50-95"
    ])

    writer.writerow([
        f"{precision * 100:.2f}%",
        f"{recall * 100:.2f}%",
        f"{f1 * 100:.2f}%",
        f"{map50 * 100:.2f}%",
        f"{map50_95 * 100:.2f}%"
    ])

# ============================================================
# FINAL INFORMATION
# ============================================================

print("\n")
print("=" * 100)
print("EVALUATION FILES")
print("=" * 100)

print("Class-wise CSV :", os.path.abspath(csv_path))
print("Overall CSV    :", os.path.abspath(overall_csv_path))
print(
    "YOLO plots     :",
    os.path.abspath(
        os.path.join(
            RESULTS_DIR,
            "yolo11n_200_epoch_evaluation"
        )
    )
)

print("\nEvaluation completed successfully.")