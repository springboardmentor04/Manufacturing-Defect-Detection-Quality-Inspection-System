from pathlib import Path
import os

root = Path("dataset/mvtec_ad")
if not root.exists():
    print(f"Dataset path not found: {root.absolute()}")
else:
    print(f"Dataset path: {root.absolute()}")
    for cat in sorted(root.iterdir()):
        if cat.is_dir():
            train_good = cat / "train" / "good"
            test_good = cat / "test" / "good"
            train_count = len(list(train_good.iterdir())) if train_good.exists() else 0
            test_count = len(list(test_good.iterdir())) if test_good.exists() else 0
            
            # Find all files in cat recursively
            all_files = []
            for r, d, f in os.walk(cat):
                for file in f:
                    all_files.append(file)
                    
            print(f"Category: {cat.name}")
            print(f"  Train Good folder files: {train_count}")
            print(f"  Test Good folder files: {test_count}")
            print(f"  Total files recursively in folder: {len(all_files)}")
