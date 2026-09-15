import os
import sys
import glob
from pathlib import Path
import time
import torch

# Setup paths
base_dir = Path(__file__).resolve().parent
sys.path.append(str(base_dir))

from inference.infer import InferenceEngine
from inference.model_loader import ModelLoader
from config.config import config

def validate_model():
    print("="*50)
    print("TASK 7: Validating production_model.pth")
    model_path = config.WEIGHTS_PATH / config.DEFAULT_MODEL
    print(f"Model Path: {model_path}")
    if not model_path.exists():
        print("ERROR: Model not found!")
        return False
        
    loader = ModelLoader()
    model = loader.load_model()
    print(f"Model loaded successfully on {loader.device}")
    
    try:
        # Check if it has the student/teacher components expected of EfficientAD
        has_teacher = hasattr(model, 'teacher')
        has_student = hasattr(model, 'student')
        print(f"Is EfficientAD architecture (Fast version): {has_teacher and has_student}")
    except Exception as e:
        print(f"Architecture check error: {e}")
        
    return True

def run_evaluation():
    print("\n" + "="*50)
    print("TASKS 2, 4, 5, 9: Running inference evaluation")
    engine = InferenceEngine()
    
    dataset_path = config.DATASET_PATH
    categories = ['bottle', 'cable', 'capsule', 'wood']
    
    results = []
    
    # 1. Test GOOD images
    print("\nTesting GOOD images (Expected: PASS)")
    for category in categories:
        good_path = dataset_path / category / "test" / "good"
        if not good_path.exists():
            continue
            
        images = list(glob.glob(str(good_path / "*.png")))[:5]  # Test 5 per category
        for img in images:
            res = engine.infer(img, category)
            results.append({
                'category': category,
                'image': Path(img).name,
                'type': 'GOOD',
                'expected': 'PASS',
                'prediction': res.prediction,
                'anomaly_score': res.anomaly_score,
                'confidence': res.confidence
            })
            print(f"{category} | {Path(img).name} | Score: {res.anomaly_score:.4f} | Pred: {res.prediction}")

    # 2. Test DEFECT images
    print("\nTesting DEFECT images (Expected: FAIL)")
    for category in categories:
        test_path = dataset_path / category / "test"
        if not test_path.exists():
            continue
            
        defect_folders = [f for f in os.listdir(test_path) if f != 'good' and os.path.isdir(test_path / f)]
        for folder in defect_folders:
            folder_path = test_path / folder
            images = list(glob.glob(str(folder_path / "*.png")))[:2]  # Test 2 per defect type
            for img in images:
                res = engine.infer(img, category)
                results.append({
                    'category': category,
                    'image': f"{folder}/{Path(img).name}",
                    'type': 'DEFECT',
                    'expected': 'FAIL',
                    'prediction': res.prediction,
                    'anomaly_score': res.anomaly_score,
                    'confidence': res.confidence
                })
                print(f"{category} | {folder}/{Path(img).name} | Score: {res.anomaly_score:.4f} | Pred: {res.prediction}")

    # Statistics
    correct = sum(1 for r in results if r['prediction'] == r['expected'])
    total = len(results)
    print("\n" + "="*50)
    print(f"Overall Accuracy: {correct}/{total} ({correct/total*100:.2f}%)")
    
    # Let's find min/max anomaly scores for GOOD vs DEFECT
    good_scores = [r['anomaly_score'] for r in results if r['type'] == 'GOOD']
    defect_scores = [r['anomaly_score'] for r in results if r['type'] == 'DEFECT']
    
    if good_scores:
        print(f"GOOD scores: Min = {min(good_scores):.4f}, Max = {max(good_scores):.4f}, Avg = {sum(good_scores)/len(good_scores):.4f}")
    if defect_scores:
        print(f"DEFECT scores: Min = {min(defect_scores):.4f}, Max = {max(defect_scores):.4f}, Avg = {sum(defect_scores)/len(defect_scores):.4f}")

if __name__ == "__main__":
    if validate_model():
        run_evaluation()
