"""
Trains the Milestone 2 defect detection model(s) by building a
per-category statistical reference profile (pixel-wise mean + std of
"good" images) from the MVTec AD dataset. This is the "Train defect
detection models" step of Milestone 2 - run it once per category (or
--all) after app/dataset/load_mvtec.py has been used to fetch/verify
the dataset is in place.

Usage (from the backend/ directory, with venv activated):

    python -m app.dataset.build_references --category bottle
    python -m app.dataset.build_references --all
    python -m app.dataset.build_references --all --limit 50
"""
import argparse
from pathlib import Path

from app.config import settings
from app.services.defect_detection import build_reference


def main():
    parser = argparse.ArgumentParser(description="Train VisionInspect AI defect detection reference models")
    parser.add_argument("--category", type=str, help="Single category to train, e.g. 'bottle'")
    parser.add_argument("--all", action="store_true", help="Train every category found in the dataset root")
    parser.add_argument("--limit", type=int, default=settings.REFERENCE_SAMPLE_LIMIT, help="Max 'good' images per category")
    parser.add_argument("--dataset-path", type=str, default=settings.MVTEC_DATASET_PATH)
    args = parser.parse_args()

    dataset_root = Path(args.dataset_path)
    if not dataset_root.exists():
        print(f"Dataset path not found: {dataset_root}")
        print("Run app/dataset/load_mvtec.py first, or pass --dataset-path")
        return

    if args.all:
        categories = [p.name for p in dataset_root.iterdir() if p.is_dir()]
    elif args.category:
        categories = [args.category]
    else:
        print("Specify --category <name> or --all")
        return

    print(f"Training reference models for: {categories}")
    for category in categories:
        try:
            count = build_reference(category, dataset_root, args.limit)
            print(f"  [ok] {category}: reference built from {count} 'good' images -> model_cache/{category}_{{mean,std}}.npy")
        except ValueError as e:
            print(f"  [skip] {category}: {e}")

    print("\nDone. Restart or hit the API - predictions will now use these trained profiles.")


if __name__ == "__main__":
    main()