"""
MVTec AD dataset loader (Milestone 1 requirement).

The MVTec Anomaly Detection dataset is a real-world benchmark for
industrial defect detection (bottles, cables, screws, wood, tiles etc.).
It is NOT redistributed with this project — download it yourself:

    https://www.mvtec.com/company/research/datasets/mvtec-ad

After downloading, extract it so the folder structure looks like:

    dataset/mvtec_ad/
        bottle/
            train/good/*.png
            test/good/*.png
            test/broken_large/*.png
            test/broken_small/*.png
            ...
        cable/
            ...
        screw/
            ...

This script walks that structure and registers each image as an
inspection record in MongoDB (source="mvtec_ad_dataset"), copying the
file into the uploads/ folder so it can be viewed from the dashboard
exactly like a manually-uploaded product image. Images found under a
"good" folder are marked as already PASS; anything else is left PENDING
so later milestones' defect-detection model can be tested against them.

Usage (from the backend/ directory, with venv activated):

    python -m app.dataset.load_mvtec --category bottle --limit 30
    python -m app.dataset.load_mvtec --all --limit 20
"""
import argparse
import asyncio
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.database import inspections_collection
from app.config import settings
from app.models.inspection import InspectionStatus

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"}


def find_category_images(dataset_root: Path, category: str, limit: int):
    category_path = dataset_root / category
    if not category_path.exists():
        print(f"  [skip] Category '{category}' not found at {category_path}")
        return []

    images = []
    for split in ["test", "train"]:
        split_path = category_path / split
        if not split_path.exists():
            continue
        for defect_folder in sorted(split_path.iterdir()):
            if not defect_folder.is_dir():
                continue
            defect_name = defect_folder.name  # e.g. "good", "broken_large"
            for img_path in sorted(defect_folder.iterdir()):
                if img_path.suffix.lower() in IMAGE_EXTENSIONS:
                    images.append((img_path, defect_name))
                    if len(images) >= limit:
                        return images
    return images


async def load_category(category: str, dataset_root: Path, limit: int, uploaded_by: str, uploaded_by_name: str):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    images = find_category_images(dataset_root, category, limit)

    inserted = 0
    for img_path, defect_name in images:
        ext = img_path.suffix.lower()
        unique_filename = f"mvtec_{category}_{uuid.uuid4().hex}{ext}"
        dest_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        shutil.copyfile(img_path, dest_path)

        is_good = defect_name == "good"
        doc = {
            "product_name": f"MVTec - {category}",
            "batch_number": defect_name,
            "image_filename": unique_filename,
            "uploaded_by": uploaded_by,
            "uploaded_by_name": uploaded_by_name,
            "status": InspectionStatus.PASS.value if is_good else InspectionStatus.PENDING.value,
            "defect_type": None if is_good else defect_name,
            "severity_score": None,
            "severity_level": None,
            "confidence_score": None,
            "notes": f"Loaded from MVTec AD dataset (category={category}, label={defect_name})",
            "source": "mvtec_ad_dataset",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await inspections_collection.insert_one(doc)
        inserted += 1

    print(f"  [ok] {category}: inserted {inserted} images")
    return inserted


async def main():
    parser = argparse.ArgumentParser(description="Load MVTec AD dataset images into VisionInspect AI")
    parser.add_argument("--category", type=str, help="Single category to load, e.g. 'bottle'")
    parser.add_argument("--all", action="store_true", help="Load all categories found in the dataset root")
    parser.add_argument("--limit", type=int, default=25, help="Max images per category (default: 25)")
    parser.add_argument("--dataset-path", type=str, default=settings.MVTEC_DATASET_PATH)
    parser.add_argument("--uploaded-by", type=str, default="system", help="User id to attribute uploads to")
    parser.add_argument("--uploaded-by-name", type=str, default="MVTec Dataset Import")
    args = parser.parse_args()

    dataset_root = Path(args.dataset_path)
    if not dataset_root.exists():
        print(f"Dataset path not found: {dataset_root}")
        print("Download MVTec AD from https://www.mvtec.com/company/research/datasets/mvtec-ad")
        print("and set MVTEC_DATASET_PATH in your .env, or pass --dataset-path")
        return

    total = 0
    if args.all:
        categories = [p.name for p in dataset_root.iterdir() if p.is_dir()]
        print(f"Found {len(categories)} categories: {categories}")
        for category in categories:
            total += await load_category(category, dataset_root, args.limit, args.uploaded_by, args.uploaded_by_name)
    elif args.category:
        total += await load_category(args.category, dataset_root, args.limit, args.uploaded_by, args.uploaded_by_name)
    else:
        print("Specify --category <name> or --all")
        return

    print(f"\nDone. Total images inserted: {total}")


if __name__ == "__main__":
    asyncio.run(main())
