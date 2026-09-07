import os
from app.ai.preprocessing import preprocess_image

sample_image = os.path.join(
    "dataset",
    "mvtec_ad",
    "bottle",
    "train",
    "good",
    "000.png"
)

image = preprocess_image(sample_image)

print("Shape:", image.shape)
print("Data Type:", image.dtype)
print("Min Pixel:", image.min())
print("Max Pixel:", image.max())