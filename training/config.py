from pathlib import Path

# Root of the MVTec dataset
DATASET_ROOT = Path("../dataset/archive")

# We will start with only one category
CATEGORY = "bottle"

# Complete path
DATASET_PATH = DATASET_ROOT / CATEGORY

print("Dataset Path:", DATASET_PATH.resolve())
print("Exists:", DATASET_PATH.exists())