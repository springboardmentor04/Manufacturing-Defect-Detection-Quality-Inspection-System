from pathlib import Path

from app.ai.predictor import predict

IMAGE = Path("uploads/inspection/sample.jpeg")

if not IMAGE.exists():
    raise FileNotFoundError(f"Image not found: {IMAGE}")

result = predict(str(IMAGE))

print("=" * 60)
print("Prediction Result")
print("=" * 60)

print(result)