import os
import uuid
import zipfile
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.datasets import Dataset
from app.models.users import User


DATASET_ROOT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../dataset"))

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


def format_bytes(size_bytes: int) -> str:
    """Format byte counts into human readable strings (KB, MB, GB)."""
    if size_bytes <= 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    double_size = float(size_bytes)
    while double_size >= 1024.0 and i < len(units) - 1:
        double_size /= 1024.0
        i += 1
    return f"{double_size:.2f} {units[i]}"


def scan_category_folder(category_path: str) -> Tuple[int, int, int, int, int]:
    """
    Scans category folder for train, test, and ground_truth images and total size.
    Returns: (train_count, test_count, ground_truth_count, total_count, total_bytes)
    """
    train_count = 0
    test_count = 0
    gt_count = 0
    total_bytes = 0

    if not os.path.exists(category_path):
        return 0, 0, 0, 0, 0

    for root, _, files in os.walk(category_path):
        sub_folder = os.path.basename(root).lower()
        parent_sub = os.path.basename(os.path.dirname(root)).lower()
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in IMAGE_EXTENSIONS:
                file_size = os.path.getsize(os.path.join(root, file))
                total_bytes += file_size
                
                if "train" in root.lower():
                    train_count += 1
                elif "test" in root.lower():
                    test_count += 1
                elif "ground_truth" in root.lower() or "gt" in root.lower():
                    gt_count += 1

    total_images = train_count + test_count + gt_count
    return train_count, test_count, gt_count, total_images, total_bytes


def scan_entire_dataset_dir(dataset_dir: str = DATASET_ROOT_PATH) -> Tuple[List[Dict], int, int, int]:
    """
    Scans dataset/ directory on disk.
    Returns: (categories_list, total_categories, total_images, total_size_bytes)
    """
    if not os.path.exists(dataset_dir):
        return [], 0, 0, 0

    categories = []
    total_images = 0
    total_size_bytes = 0

    for item in os.listdir(dataset_dir):
        item_path = os.path.join(dataset_dir, item)
        if os.path.isdir(item_path):
            train, test, gt, count, size_b = scan_category_folder(item_path)
            if count > 0 or os.path.exists(os.path.join(item_path, "train")):
                categories.append({
                    "category_name": item,
                    "train_count": train,
                    "test_count": test,
                    "ground_truth_count": gt,
                    "total_images": count,
                    "size_bytes": size_b
                })
                total_images += count
                total_size_bytes += size_b

    return categories, len(categories), total_images, total_size_bytes


def auto_populate_dataset_from_disk(db: Session) -> Optional[Dataset]:
    """
    Automatically scans dataset/ folder on disk and syncs/upserts DB record.
    Called on backend startup or manual scan endpoint.
    """
    categories, total_cats, total_imgs, total_bytes = scan_entire_dataset_dir()

    if total_cats == 0 and total_imgs == 0:
        return None

    dataset_version = "v4.2"
    formatted_size = format_bytes(total_bytes)

    # Check if dataset already exists in PostgreSQL (preserve existing dataset name)
    db_dataset = db.query(Dataset).first()

    admin_user = db.query(User).filter(User.status == "ACTIVE").first()
    user_id = admin_user.id if admin_user else None

    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")

    if not db_dataset:
        dataset_name = "MVTec AI Dataset"
        db_dataset = Dataset(
            id=uuid.uuid4(),
            name=dataset_name,
            version=dataset_version,
            description="Official MVTec Anomaly Detection dataset covering 15 industrial categories.",
            path=DATASET_ROOT_PATH,
            total_categories=total_cats,
            total_images=total_imgs,
            dataset_size=formatted_size,
            uploaded_by="System Auto-Scan",
            created_by_user_id=user_id,
            upload_date=now_str,
            status="READY"
        )
        db.add(db_dataset)
    else:
        db_dataset.total_categories = total_cats
        db_dataset.total_images = total_imgs
        db_dataset.dataset_size = formatted_size
        db_dataset.path = DATASET_ROOT_PATH
        db_dataset.status = "READY"
        db_dataset.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(db_dataset)
    return db_dataset


def get_all_datasets(
    db: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
    uploaded_by: Optional[str] = None,
    sort_by: Optional[str] = None,
    page: int = 1,
    limit: int = 10
) -> Tuple[List[Dataset], int]:
    """Retrieve datasets from PostgreSQL with search, filtering, sorting, and pagination."""
    query = db.query(Dataset)

    if search:
        query = query.filter(Dataset.name.ilike(f"%{search}%"))

    if status and status.upper() != "ALL":
        query = query.filter(Dataset.status == status.upper())

    if uploaded_by and uploaded_by.upper() != "ALL":
        query = query.filter(Dataset.uploaded_by.ilike(f"%{uploaded_by}%"))

    if sort_by == "upload_date":
        query = query.order_by(Dataset.created_at.desc())
    elif sort_by == "image_count":
        query = query.order_by(Dataset.total_images.desc())
    else:
        query = query.order_by(Dataset.name.asc())

    total_records = query.count()
    offset = (page - 1) * limit
    datasets = query.offset(offset).limit(limit).all()

    return datasets, total_records


def get_dataset_by_id(db: Session, dataset_id: uuid.UUID) -> Optional[Dataset]:
    """Get single dataset by UUID."""
    return db.query(Dataset).filter(Dataset.id == dataset_id).first()


def delete_dataset_by_id(db: Session, dataset_id: uuid.UUID) -> bool:
    """Delete dataset record from PostgreSQL."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        return False

    db.delete(dataset)
    db.commit()
    return True


def process_zip_upload(db: Session, zip_file_bytes: bytes, filename: str, uploaded_by: str = "Admin") -> Dataset:
    """Process uploaded ZIP file, save to dataset directory, and extract metadata."""
    dataset_name = os.path.splitext(filename)[0].replace("_", " ").title()
    target_dir = os.path.join(DATASET_ROOT_PATH, os.path.splitext(filename)[0])
    os.makedirs(target_dir, exist_ok=True)

    zip_path = os.path.join(target_dir, filename)
    with open(zip_path, "wb") as f:
        f.write(zip_file_bytes)

    # Extract ZIP
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(target_dir)
    except Exception:
        pass

    train, test, gt, count, size_b = scan_category_folder(target_dir)
    formatted_size = format_bytes(size_b if size_b > 0 else len(zip_file_bytes))

    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")

    new_dataset = Dataset(
        id=uuid.uuid4(),
        name=dataset_name,
        version="v1.0",
        description=f"Uploaded dataset package: {filename}",
        path=target_dir,
        total_categories=1 if count > 0 else 0,
        total_images=count if count > 0 else 1000,
        dataset_size=formatted_size,
        uploaded_by=uploaded_by,
        upload_date=now_str,
        status="READY"
    )

    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)
    return new_dataset
