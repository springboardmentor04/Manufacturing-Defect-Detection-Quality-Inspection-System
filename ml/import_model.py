import os
import sys
import shutil
import argparse
from pathlib import Path

def parse_args():
    parser = argparse.ArgumentParser(description="Import Trained Model from Colab")
    parser.add_argument("--path", type=str, required=True, help="Absolute path to the downloaded best.pt file")
    return parser.parse_args()

def main():
    args = parse_args()
    
    source_path = Path(args.path)
    
    if not source_path.exists():
        print(f"Error: The file {source_path} does not exist.")
        print("Please check the path and try again.")
        sys.exit(1)
        
    if not source_path.name.endswith(".pt"):
        print(f"Warning: The file {source_path.name} does not have a .pt extension.")
        print("Are you sure this is a PyTorch YOLO weights file?")
        
    # Get the project root assuming this script is in ml/
    project_root = Path(__file__).parent.parent
    
    # Target directory is ml/models/
    target_dir = project_root / "ml" / "models"
    target_dir.mkdir(parents=True, exist_ok=True)
    
    target_path = target_dir / "best.pt"
    
    print(f"Importing model from: {source_path}")
    print(f"Target location: {target_path}")
    
    try:
        shutil.copy2(source_path, target_path)
        print("\n✅ Success! The model has been successfully imported.")
        print("The VisionInspect AI backend will automatically use these new weights for upcoming API inspections.")
        print("You can verify this by checking the 'Model Management' tab in the frontend dashboard.")
    except Exception as e:
        print(f"\n❌ Error importing model: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
