import os
from pathlib import Path
from PIL import Image

def inspect_dataset():
    dataset_dir = Path("c:/Users/ASUS/Desktop/AI infosys/visioninspect-ai/dataset/mvtec_ad")
    if not dataset_dir.exists():
        print(f"ERROR: Dataset directory not found: {dataset_dir}")
        return

    categories = [d for d in dataset_dir.iterdir() if d.is_dir()]
    print(f"Found {len(categories)} categories: {[c.name for c in categories]}")
    
    total_train = 0
    total_test_good = 0
    total_test_defect = 0
    total_masks = 0
    
    for cat in categories:
        print(f"\n--- Category: {cat.name} ---")
        
        train_dir = cat / "train" / "good"
        train_count = len(list(train_dir.glob("*.png"))) if train_dir.exists() else 0
        total_train += train_count
        print(f"  Train (Good): {train_count} images")
        
        test_dir = cat / "test"
        if test_dir.exists():
            for subtype in test_dir.iterdir():
                if subtype.is_dir():
                    count = len(list(subtype.glob("*.png")))
                    print(f"  Test ({subtype.name}): {count} images")
                    if subtype.name == "good":
                        total_test_good += count
                    else:
                        total_test_defect += count
                        
                        # Verify masks for defect
                        mask_dir = cat / "ground_truth" / subtype.name
                        mask_count = len(list(mask_dir.glob("*.png"))) if mask_dir.exists() else 0
                        print(f"    -> Masks ({subtype.name}): {mask_count} images")
                        total_masks += mask_count
                        
                        # Verify correspondence and dimensions on first image
                        first_img = next(subtype.glob("*.png"), None)
                        if first_img:
                            # Try to find corresponding mask
                            # MVTec masks usually have _mask suffix, e.g. 000_mask.png
                            mask_name = f"{first_img.stem}_mask{first_img.suffix}"
                            first_mask = mask_dir / mask_name
                            
                            try:
                                with Image.open(first_img) as img:
                                    img_size = img.size
                                    
                                if first_mask.exists():
                                    with Image.open(first_mask) as mask:
                                        mask_size = mask.size
                                    print(f"    [OK] Dim Match: Img {img_size} == Mask {mask_size}")
                                else:
                                    print(f"    [WARNING] Missing Mask for {first_img.name} -> Expected {mask_name}")
                            except Exception as e:
                                print(f"    [ERROR] Reading image/mask: {e}")
                                
    print("\n==========================================")
    print("Dataset Inspection Summary")
    print("==========================================")
    print(f"Total Categories: {len(categories)}")
    print(f"Total Train (Good): {total_train}")
    print(f"Total Test (Good): {total_test_good}")
    print(f"Total Test (Defect): {total_test_defect}")
    print(f"Total Ground-Truth Masks: {total_masks}")
    
    if total_test_defect != total_masks:
        print("\nWARNING: Mismatch between Defect images and Ground-Truth Masks!")
    else:
        print("\n[OK] Defect images and Masks counts match.")

if __name__ == "__main__":
    inspect_dataset()
