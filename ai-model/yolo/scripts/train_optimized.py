import os
from ultralytics import YOLO

def main():
    print("Initializing YOLO11n-seg for OPTIMIZED FULL training...")
    # Initialize from the pretrained model (to avoid bias/overfitting from the pilot or full_run)
    model = YOLO("yolo11n-seg.pt")

    # Paths
    dataset_yaml = os.path.abspath("ai-model/yolo/dataset/data.yaml")
    project_dir = os.path.abspath("ai-model/yolo/models")
    run_name = "optimized_run"

    print("Starting 100-epoch full optimized training...")
    
    try:
        results = model.train(
            data=dataset_yaml,
            epochs=100,
            patience=20,
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
        print("Optimized training complete.")
    except Exception as e:
        print(f"Training failed: {e}")
        # Automatically fallback to batch=2 if OOM
        if "out of memory" in str(e).lower() or "oom" in str(e).lower():
            print("OOM detected. Retrying with batch=2...")
            results = model.train(
                data=dataset_yaml,
                epochs=100,
                patience=20,
                batch=2,
                imgsz=800,
                device="cuda",
                project=project_dir,
                name=run_name,
                exist_ok=True,
                mosaic=0.0,
                scale=0.1,
                hsv_h=0.0,
                hsv_s=0.0,
                hsv_v=0.0
            )

if __name__ == "__main__":
    main()
