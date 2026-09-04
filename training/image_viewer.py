from pathlib import Path
import matplotlib.pyplot as plt
from PIL import Image

# Dataset path
DATASET = Path("../dataset/archive/bottle")

# Select one image from each category
images = [
    DATASET / "train" / "good" / "000.png",
    DATASET / "test" / "good" / "000.png",
    DATASET / "test" / "broken_large" / "000.png",
    DATASET / "test" / "broken_small" / "000.png",
    DATASET / "test" / "contamination" / "000.png",
]

titles = [
    "Train Good",
    "Test Good",
    "Broken Large",
    "Broken Small",
    "Contamination"
]

plt.figure(figsize=(15, 4))

for i, img_path in enumerate(images):
    img = Image.open(img_path)

    plt.subplot(1, 5, i + 1)
    plt.imshow(img)
    plt.title(titles[i])
    plt.axis("off")

plt.tight_layout()
plt.show()