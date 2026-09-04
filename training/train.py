from anomalib.data import MVTecAD
from anomalib.models import EfficientAd
from anomalib.engine import Engine

# -----------------------------
# Dataset
# -----------------------------
datamodule = MVTecAD(
    root="../dataset/archive",
    category="bottle",
    train_batch_size=1,
    eval_batch_size=1,
    num_workers=0,
)

# -----------------------------
# Model
# -----------------------------
model = EfficientAd()

# -----------------------------
# Engine
# -----------------------------
engine = Engine(
    max_epochs=20,
    accelerator="cpu",
)

# -----------------------------
# Train
# -----------------------------
engine.fit(
    model=model,
    datamodule=datamodule,
)

print("Training Completed Successfully!")