from ultralytics import YOLO
from pathlib import Path
import logging

# ============================================================
# SETTINGS
# ============================================================

MODEL_PATH = r"runs\mvtec_yolo_1050_scratch\weights\last.pt"
DATA_PATH = r"mvtec_yolo_unseen_1200\data.yaml"

PROJECT = "runs"
RUN_NAME = "mvtec_unseen_1200_101_to_150"

START_EPOCH = 101
END_EPOCH = 150
ADDITIONAL_EPOCHS = 50


# ============================================================
# CHECK FILES
# ============================================================

if not Path(MODEL_PATH).exists():
    raise FileNotFoundError(
        f"Model not found:\n{MODEL_PATH}"
    )

if not Path(DATA_PATH).exists():
    raise FileNotFoundError(
        f"Dataset not found:\n{DATA_PATH}"
    )

# ============================================================
# LOAD YOUR 100-EPOCH MODEL
# ============================================================

print("=" * 70)
print("VISIONINSPECT AI - CONTINUED TRAINING")
print("=" * 70)

print("Starting checkpoint:")
print(MODEL_PATH)

print()
print("New dataset:")
print(DATA_PATH)

print()
print("Training:")
print("Epoch 101/150 → Epoch 150/150")

print("=" * 70)

model = YOLO(MODEL_PATH)


# ============================================================
# CUSTOM EPOCH DISPLAY
# ============================================================

def on_epoch_start(trainer):

    current_epoch = trainer.epoch + 1

    overall_epoch = START_EPOCH + current_epoch - 1

    print()
    print("=" * 70)
    print(
        f"VISIONINSPECT AI | "
        f"Epoch {overall_epoch}/{END_EPOCH}"
    )
    print("=" * 70)


def on_epoch_end(trainer):

    current_epoch = trainer.epoch + 1

    overall_epoch = START_EPOCH + current_epoch - 1

    print(
        f"Completed Epoch "
        f"{overall_epoch}/{END_EPOCH}"
    )


# ============================================================
# CALLBACKS
# ============================================================

model.add_callback(
    "on_train_epoch_start",
    on_epoch_start
)

model.add_callback(
    "on_train_epoch_end",
    on_epoch_end
)


# ============================================================
# TRAIN
# ============================================================

results = model.train(
    data=DATA_PATH,
    epochs=50,
    imgsz=320,
    batch=16,
    device="cpu",
    workers=0,
    optimizer="AdamW",
    lr0=0.001,
    save=True,
    save_period=10,
    val=True,
    project=PROJECT,
    name=RUN_NAME,
    exist_ok=True,
    verbose=True
)

# ============================================================
# FINISHED
# ============================================================

print()
print("=" * 70)
print("TRAINING COMPLETED")
print("=" * 70)

print()
print("Overall training:")
print("Epoch 1 → 100  : Original training")
print("Epoch 101 → 150: Unseen data training")

print()
print("Best model:")
print(
    f"runs\\{RUN_NAME}\\weights\\best.pt"
)

print()
print("Last model:")
print(
    f"runs\\{RUN_NAME}\\weights\\last.pt"
)

print("=" * 70)