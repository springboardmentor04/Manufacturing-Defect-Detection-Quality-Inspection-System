import argparse
from pathlib import Path
from ultralytics import YOLO

def main():
    parser = argparse.ArgumentParser(description="Train YOLO Image Classifier for Defect Types")
    parser.add_argument("--data", type=str, required=True, help="Path to classification dataset directory")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--img-size", type=int, default=224, help="Image size for classification")
    parser.add_argument("--output", type=str, default="runs/classify/train", help="Output directory")
    args = parser.parse_args()

    print(f"Starting YOLO classifier training with arguments: {args}")
    
    # We will use yolov8n-cls as the base classification model
    model = YOLO('yolov8n-cls.pt') 
    
    # Train the model
    # Note: data must point to a directory with train/ and val/ subdirectories
    results = model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.img_size,
        project=Path(args.output).parent,
        name=Path(args.output).name
    )
    print("Training completed. Metrics saved to output directory.")

if __name__ == "__main__":
    main()
