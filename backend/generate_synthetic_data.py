import os
import cv2
import numpy as np
from pathlib import Path

def create_synthetic_mvtec_dataset(base_dir: str, category: str = 'synthetic', num_train: int = 10, num_test_good: int = 5, num_test_defect: int = 5):
    """
    Creates a synthetic dataset in the MVTec AD format for testing the PatchCore model.
    """
    root_dir = Path(base_dir) / category
    
    # Create directories
    train_good_dir = root_dir / 'train' / 'good'
    test_good_dir = root_dir / 'test' / 'good'
    test_defect_dir = root_dir / 'test' / 'defect_a'
    gt_defect_dir = root_dir / 'ground_truth' / 'defect_a'
    
    for d in [train_good_dir, test_good_dir, test_defect_dir, gt_defect_dir]:
        d.mkdir(parents=True, exist_ok=True)
        
    print(f"Generating synthetic dataset at {root_dir}...")
    
    # Generate Normal Images (Background with a centered white circle)
    def generate_normal_image():
        img = np.zeros((224, 224, 3), dtype=np.uint8)
        # Adding some random noise to the background
        noise = np.random.randint(0, 50, (224, 224, 3), dtype=np.uint8)
        img = cv2.add(img, noise)
        # Draw a central circle
        cv2.circle(img, (112, 112), 60, (200, 200, 200), -1)
        return img
        
    # Generate Defect Images (Normal image + a red square defect)
    def generate_defect_image():
        img = generate_normal_image()
        mask = np.zeros((224, 224), dtype=np.uint8)
        
        # Random defect position inside the circle
        cx, cy = np.random.randint(80, 144, size=2)
        size = np.random.randint(10, 20)
        
        cv2.rectangle(img, (cx - size, cy - size), (cx + size, cy + size), (0, 0, 255), -1)
        cv2.rectangle(mask, (cx - size, cy - size), (cx + size, cy + size), 255, -1)
        
        return img, mask
        
    # Train
    for i in range(num_train):
        img = generate_normal_image()
        cv2.imwrite(str(train_good_dir / f"{i:03d}.png"), img)
        
    # Test Good
    for i in range(num_test_good):
        img = generate_normal_image()
        cv2.imwrite(str(test_good_dir / f"{i:03d}.png"), img)
        
    # Test Defect
    for i in range(num_test_defect):
        img, mask = generate_defect_image()
        filename = f"{i:03d}.png"
        mask_filename = f"{i:03d}_mask.png"
        cv2.imwrite(str(test_defect_dir / filename), img)
        cv2.imwrite(str(gt_defect_dir / mask_filename), mask)
        
    print("Synthetic dataset generation complete.")

if __name__ == '__main__':
    create_synthetic_mvtec_dataset('backend/data/mvtec', 'synthetic')
