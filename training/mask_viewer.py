from pathlib import Path
import matplotlib.pyplot as plt
from PIL import Image

DATASET = Path("../dataset/archive/bottle")

image = Image.open(DATASET / "test" / "broken_large" / "000.png")
mask = Image.open(DATASET / "ground_truth" / "broken_large" / "000_mask.png")

plt.figure(figsize=(8,4))

plt.subplot(1,2,1)
plt.imshow(image)
plt.title("Original Image")
plt.axis("off")

plt.subplot(1,2,2)
plt.imshow(mask, cmap="gray")
plt.title("Ground Truth Mask")
plt.axis("off")

plt.tight_layout()
plt.show()