from argparse import ArgumentParser
from pathlib import Path

from sqlalchemy import select

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import inspection_image, product, role, user  # noqa: F401
from app.models.enums import InspectionImageSource
from app.models.product import Product
from app.services.image_service import ingest_image_file_data
from app.services.seed import ensure_roles


def get_or_create_product(session, sku: str, name: str) -> Product:
    existing_product = session.scalar(select(Product).where(Product.sku == sku))
    if existing_product is not None:
        return existing_product

    product_row = Product(sku=sku, name=name)
    session.add(product_row)
    session.commit()
    session.refresh(product_row)
    return product_row


def load_dataset(dataset_root: Path, split: str) -> None:
    if split not in {"train", "test"}:
        raise ValueError("split must be either 'train' or 'test'")
    if not dataset_root.exists() or not dataset_root.is_dir():
        raise FileNotFoundError(f"Dataset root does not exist or is not a directory: {dataset_root}")

    Base.metadata.create_all(bind=engine)
    ensure_roles()

    with SessionLocal() as session:
        for category_dir in sorted(path for path in dataset_root.iterdir() if path.is_dir()):
            split_dir = category_dir / split
            if not split_dir.exists():
                continue

            product_row = get_or_create_product(session, sku=category_dir.name, name=category_dir.name)

            for defect_dir in sorted(path for path in split_dir.iterdir() if path.is_dir()):
                relative_category = f"{category_dir.name}/{defect_dir.name}"
                for image_path in sorted(defect_dir.glob("*.png")):
                    content = image_path.read_bytes()
                    ingest_image_file_data(
                        db=session,
                        filename=image_path.name,
                        content=content,
                        source=InspectionImageSource.mvtec_dataset,
                        storage_prefix=f"mvtec/{category_dir.name}/{split}/{defect_dir.name}",
                        product_id=product_row.id,
                        category=relative_category,
                    )
                    session.commit()
                    print(f"Loaded {image_path}")


def main() -> None:
    parser = ArgumentParser(description="Load a manually downloaded MVTec AD dataset into VisionInspect AI")
    parser.add_argument("--dataset-root", required=True)
    parser.add_argument("--split", required=True, choices=["train", "test"])
    args = parser.parse_args()

    load_dataset(Path(args.dataset_root), args.split)


if __name__ == "__main__":
    main()
