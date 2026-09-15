import os
from pathlib import Path
from ultralytics import YOLO

def main():
    print("Initializing YOLO11n-seg for PILOT training...")
    # Initialize from the pretrained model (not the current full_run to prevent leakage/overfitting)
    model = YOLO("yolo11n-seg.pt")

    # Paths
    dataset_yaml = os.path.abspath("ai-model/yolo/dataset/data.yaml")
    project_dir = os.path.abspath("ai-model/yolo/models")
    run_name = "pilot_run"

    print("Starting 20-epoch pilot training with custom augmentations...")
    results = model.train(
        data=dataset_yaml,
        epochs=20,
        batch=4,
        imgsz=800,
        device="cuda",
        project=project_dir,
        name=run_name,
        exist_ok=True,
        # Custom Industrial Augmentations
        mosaic=0.0,
        scale=0.1,
        hsv_h=0.0,
        hsv_s=0.0,
        hsv_v=0.0
    )
    
    print("Pilot training complete. Run evaluate_pilot.py to compare.")

if __name__ == "__main__":
    main()
