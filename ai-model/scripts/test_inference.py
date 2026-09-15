import argparse
import sys
from pathlib import Path

# Add ai-model root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from inference.infer import InferenceEngine
from inference.result import PredictionResult

def main():
    parser = argparse.ArgumentParser(description="Test VisionInspect AI Inference")
    parser.add_argument("--category", type=str, required=True, help="Category of the image (e.g., bottle)")
    parser.add_argument("--image", type=str, required=True, help="Path to the image to inspect")
    
    args = parser.parse_args()
    
    engine = InferenceEngine()
    result: PredictionResult = engine.infer(args.image, args.category)
    
    if result.status.startswith("ERROR"):
        print(f"Error occurred: {result.status}")
        return
        
    image_name = Path(args.image).name
    
    print("==========================================")
    print("VisionInspect AI")
    print("Real AI Inference")
    print("==========================================")
    print("Category")
    print(result.category)
    print("Image")
    print(image_name)
    print("Prediction")
    print(result.prediction)
    print("Confidence")
    print(f"{result.confidence} %")
    print("Anomaly Score")
    print(result.anomaly_score)
    print("Processing Time")
    print(f"{int(result.processing_time_ms)} ms")
    print("Device")
    print(result.device)
    print("Model Version")
    print(result.model_version)
    print("Status")
    print(result.status)
    print("==========================================")

if __name__ == "__main__":
    main()
