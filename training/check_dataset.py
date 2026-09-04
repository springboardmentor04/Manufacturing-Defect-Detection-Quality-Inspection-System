from pathlib import Path

dataset_root = Path("../dataset/archive")
category = "bottle"

dataset_path = dataset_root / category

print("=" * 50)
print("MVTec AD Dataset Verification")
print("=" * 50)

print(f"Dataset exists : {dataset_path.exists()}")
print(f"Category       : {category}")

print("\nTrain Good Images:")
train_good = dataset_path / "train" / "good"
print(len(list(train_good.glob("*.png"))))

print("\nTest Categories:")

test_dir = dataset_path / "test"

for folder in sorted(test_dir.iterdir()):
    if folder.is_dir():
        print(f"{folder.name:20} {len(list(folder.glob('*.png')))}")

print("\nGround Truth:")

gt_dir = dataset_path / "ground_truth"

for folder in sorted(gt_dir.iterdir()):
    if folder.is_dir():
        print(f"{folder.name:20} {len(list(folder.glob('*_mask.png')))}")

print("\nDataset Ready ✅")