from __future__ import annotations
from io import BytesIO

from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.enums import InspectionImageSource, InspectionImageStatus
from app.models.inspection_image import InspectionImage
from app.models.user import User
from app.storage.base import get_storage_backend


class ImageValidationError(ValueError):
    pass


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}


def validate_image_bytes(filename: str, content: bytes) -> None:
    if not filename:
        raise ImageValidationError("File name is required")
    if not content:
        raise ImageValidationError("File is empty")
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ImageValidationError(f"Unsupported file extension: {suffix or 'missing'}")

    settings = get_settings()
    if len(content) > settings.max_image_size_bytes:
        raise ImageValidationError(f"File exceeds the {settings.max_image_size_mb}MB limit")

    try:
        image = Image.open(BytesIO(content))
        image.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ImageValidationError("File is not a valid image or is corrupt") from exc


def ingest_image_bytes(
    db: Session,
    file: UploadFile,
    uploaded_by: Optional[User],
    source: InspectionImageSource,
    storage_prefix: str,
    product_id: UUID | None = None,
    category: str | None = None,
) -> InspectionImage:
    content = file.file.read()
    validate_image_bytes(file.filename or "", content)

    storage_backend = get_storage_backend()
    stored_object = storage_backend.store_bytes(content, original_filename=file.filename or "upload", prefix=storage_prefix)

    image = InspectionImage(
        product_id=product_id,
        filename=Path(file.filename or stored_object.original_name).name,
        storage_path=stored_object.path,
        source=source,
        category=category,
        status=InspectionImageStatus.pending,
        uploaded_by=uploaded_by.id if uploaded_by is not None else None,
    )
    db.add(image)
    db.flush()
    db.refresh(image)
    return image


def ingest_image_file_data(
    db: Session,
    filename: str,
    content: bytes,
    source: InspectionImageSource,
    storage_prefix: str,
    product_id: UUID | None = None,
    category: str | None = None,
) -> InspectionImage:
    validate_image_bytes(filename, content)

    storage_backend = get_storage_backend()
    stored_object = storage_backend.store_bytes(content, original_filename=filename, prefix=storage_prefix)

    image = InspectionImage(
        product_id=product_id,
        filename=Path(filename).name,
        storage_path=stored_object.path,
        source=source,
        category=category,
        status=InspectionImageStatus.pending,
        uploaded_by=None,
    )
    db.add(image)
    db.flush()
    db.refresh(image)
    return image
