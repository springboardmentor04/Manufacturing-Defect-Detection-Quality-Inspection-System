import argparse
import sys
from pathlib import Path
from ultralytics import YOLO

def main():
    parser = argparse.ArgumentParser(description="Train YOLO Model for Defect Detection")
    parser.add_argument("--data", type=str, required=True, help="Path to data config (e.g. config.yaml)")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--img-size", type=int, default=640, help="Image size")
    parser.add_argument("--device", type=str, default="", help="Device to use (e.g., cpu, 0)")
    parser.add_argument("--output", type=str, default="runs/detect/train", help="Output directory")
    args = parser.parse_args()

    print(f"Starting YOLO training with arguments: {args}")
    
    # We will use yolov8n as the base model
    model = YOLO('yolov8n.pt') 
    
    # Train the model
    results = model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.img_size,
        batch=args.batch,
        device=args.device if args.device else None,
        project=Path(args.output).parent,
        name=Path(args.output).name
    )
    print("Training completed. Metrics saved to output directory.")

if __name__ == "__main__":
    main()
