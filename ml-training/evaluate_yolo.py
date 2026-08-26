from ultralytics import YOLO

# ============================================================
# MODEL PATH
# ============================================================

MODEL_PATH = r"C:\Users\veene.LAPTOP-VQNJ8SHT\runs\detect\runs\mvtec_unseen_1200_101_to_150\weights\best.pt"

# ============================================================
# DATASET
# ============================================================
DATA_YAML = r"mvtec_yolo_1200\data.yaml"

# ============================================================
# LOAD MODEL
# ============================================================

print("=" * 70)
print("LOADING YOLO MODEL")
print("=" * 70)

model = YOLO(MODEL_PATH)

print("Model loaded successfully!")
print("Model:", MODEL_PATH)

# ============================================================
# EVALUATE
# ============================================================

print("\n" + "=" * 70)
print("RUNNING YOLO EVALUATION")
print("=" * 70)

results = model.val(
    data=DATA_YAML,
    split="val",
    imgsz=320,
    batch=16,
    device="cpu",
    workers=0,
    plots=True,
    project=r"C:\Users\veene.LAPTOP-VQNJ8SHT\runs\final_evaluation",
    name="yolo_150_epochs"
)

# ============================================================
# RESULTS
# ============================================================

print("\n" + "=" * 70)
print("FINAL YOLO MODEL EVALUATION")
print("=" * 70)

print(f"Precision       : {results.box.mp * 100:.2f}%")
print(f"Recall          : {results.box.mr * 100:.2f}%")
print(f"mAP@50          : {results.box.map50 * 100:.2f}%")
print(f"mAP@50-95       : {results.box.map * 100:.2f}%")

print("\n" + "=" * 70)
print("EVALUATION COMPLETED")
print("=" * 70)

print("\nResults saved to:")
print(r"C:\Users\veene.LAPTOP-VQNJ8SHT\runs\final_evaluation\yolo_150_epochs")