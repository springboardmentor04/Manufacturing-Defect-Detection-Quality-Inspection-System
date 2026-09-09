import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from model.train import train_model
from model.evaluate import evaluate_model
from model.predict import CNNDefectPredictor
from generate_synthetic_data import create_synthetic_mvtec_dataset
import time

def run_test():
    print("=== Custom CNN Testing Pipeline ===")
    
    # 1. Skip Data Generation (Using Real Data)
    print("\n--- 1. Using Real Dataset (Archive) ---")
    
    # 2. Train Model
    print("\n--- 2. Training Model ---")
    train_model(
        dataset_path='../data/archive', 
        epochs=20,  # use lower epoch for quicker testing, early stopping will trigger
        batch_size=32, # small batch size for testing
        learning_rate=0.0001,
        category='all_categories'
    )
    
    # 3. Evaluate Model
    print("\n--- 3. Evaluating Model ---")
    metrics = evaluate_model(
        dataset_path='../data/archive', 
        checkpoint_path='model/checkpoints/best_model.pth'
    )
    print("Evaluation Metrics:")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
        
    # 4. Single Image Prediction
    print("\n--- 4. Single Image Prediction (Defective) ---")
    predictor = CNNDefectPredictor(checkpoint_path='model/checkpoints/best_model.pth')
    
    test_img = '../data/archive/bottle/test/broken_large/000.png'
    print(f"Predicting on {test_img}...")
    start_time = time.time()
    result = predictor.predict(test_img)
    print(f"Prediction result in {time.time() - start_time:.4f}s:")
    print(f"  Prediction: {result.get('prediction', 'UNKNOWN')}")
    print(f"  Confidence: {result.get('confidence', 0.0):.2f}%")
    print(f"  Status: {result.get('status', 'UNKNOWN')}")
    
    # Do for good image
    print("\n--- 4. Single Image Prediction (Good) ---")
    test_img_good = '../data/archive/bottle/test/good/000.png'
    print(f"Predicting on {test_img_good}...")
    result_good = predictor.predict(test_img_good)
    print(f"Prediction result:")
    print(f"  Prediction: {result_good.get('prediction', 'UNKNOWN')}")
    print(f"  Confidence: {result_good.get('confidence', 0.0):.2f}%")
    print(f"  Status: {result_good.get('status', 'UNKNOWN')}")
    
if __name__ == '__main__':
    run_test()
