from anomalib.models import Patchcore

MODEL_PATH = "../models/patchcore_model.ckpt"

model = Patchcore.load_from_checkpoint(
    MODEL_PATH,
    weights_only=False
)

model.eval()

print("Model loaded successfully!")