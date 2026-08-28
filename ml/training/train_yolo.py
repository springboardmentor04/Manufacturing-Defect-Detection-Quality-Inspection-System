import argparse
import sys
from pathlib import Path

def parse_args():
    parser = argparse.ArgumentParser(description="Train YOLO Model for Defect Detection")
    parser.add_argument("--data", type=str, required=True, help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--img-size", type=int, default=640, help="Image size")
    parser.add_argument("--device", type=str, default="", help="Device to use")
    parser.add_argument("--output", type=str, default="runs/detect/train", help="Output directory")
    return parser.parse_args()

def main():
    args = parse_args()
    print(f"Starting YOLO training with arguments: {args}")
    
    try:
        from ultralytics import YOLO
        # Load a model
        model = YOLO('yolov8n.yaml')  # build a new model from YAML
        
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
    except ImportError:
        print("Ultralytics package not installed. Ensure requirements are installed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
