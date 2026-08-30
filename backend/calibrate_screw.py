import os
from pathlib import Path
import cv2
import numpy as np
from app.config import settings
from app.services.image_processing import preprocess_image
from app.services.defect_detection import _cache_paths

def calibrate():
    dataset_root = Path(settings.MVTEC_DATASET_PATH)
    category = "screw"
    category_path = dataset_root / category
    
    mean_path, std_path = _cache_paths(category)
    if not (mean_path.exists() and std_path.exists()):
        print("Reference model not found. Build it first.")
        return
        
    mean_img = np.load(mean_path)
    std_img = np.load(std_path)
    
    # Clip standard deviation with different limits to see which works best
    for std_clip in [0.02, 0.05, 0.08, 0.10]:
        clipped_std = np.clip(std_img, std_clip, None)
        
        print(f"\n======================================")
        print(f"Testing STD Clip: {std_clip}")
        print(f"======================================")
        
        # Test Good images
        good_dir = category_path / "test" / "good"
        good_ratios = []
        if good_dir.exists():
            for p in sorted(good_dir.iterdir())[:30]:
                if p.suffix.lower() in {".png", ".jpg", ".jpeg"}:
                    img = preprocess_image(str(p), size=settings.REFERENCE_IMAGE_SIZE)
                    z_scores = np.abs(img - mean_img) / clipped_std
                    mask = z_scores > 2.5
                    good_ratios.append(float(mask.mean()))
                    
        # Test Defective images (from other folders under test)
        defect_ratios = {}
        test_dir = category_path / "test"
        for folder in sorted(test_dir.iterdir()):
            if folder.is_dir() and folder.name != "good":
                ratios = []
                for p in sorted(folder.iterdir())[:15]:
                    if p.suffix.lower() in {".png", ".jpg", ".jpeg"}:
                        img = preprocess_image(str(p), size=settings.REFERENCE_IMAGE_SIZE)
                        z_scores = np.abs(img - mean_img) / clipped_std
                        mask = z_scores > 2.5
                        ratios.append(float(mask.mean()))
                if ratios:
                    defect_ratios[folder.name] = ratios
                    
        if good_ratios:
            print(f"Good Test Images (n={len(good_ratios)}):")
            print(f"  Min: {min(good_ratios):.4f}, Max: {max(good_ratios):.4f}, Mean: {sum(good_ratios)/len(good_ratios):.4f}")
            
        for name, ratios in defect_ratios.items():
            print(f"Defect '{name}' (n={len(ratios)}):")
            print(f"  Min: {min(ratios):.4f}, Max: {max(ratios):.4f}, Mean: {sum(ratios)/len(ratios):.4f}")

if __name__ == '__main__':
    calibrate()
