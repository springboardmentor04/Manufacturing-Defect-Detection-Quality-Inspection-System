from pathlib import Path

DATASET = Path("../dataset/archive/bottle")

train_good = DATASET / "train" / "good"
test_good = DATASET / "test" / "good"
ground_truth = DATASET / "ground_truth"

print("Train Images :", len(list(train_good.glob("*.png"))))
print("Test Good :", len(list(test_good.glob("*.png"))))
print("Ground Truth folders :")

for folder in ground_truth.iterdir():
    if folder.is_dir():
        print(folder.name, len(list(folder.glob("*.png"))))