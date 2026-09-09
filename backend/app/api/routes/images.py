from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.models.enums import InspectionImageSource, InspectionImageStatus, RoleName
from app.models.inspection_image import InspectionImage
from app.models.product import Product
from app.models.user import User
from app.schemas.image import ImageListResponse, ImageRead, serialize_image
from app.services.image_service import (
    ImageValidationError,
    ingest_image_bytes,
    ingest_image_file_data,
    validate_image_bytes,
)


router = APIRouter(prefix="/images", tags=["images"])


@router.post("/upload", response_model=ImageRead, status_code=status.HTTP_201_CREATED)
def upload_image(
    file: UploadFile = File(...),
    product_id: Optional[UUID] = Form(default=None),
    category: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleName.admin, RoleName.quality_engineer, RoleName.factory_supervisor])),
) -> ImageRead:
    if product_id is not None and db.scalar(select(Product).where(Product.id == product_id)) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    try:
        image = ingest_image_bytes(
            db=db,
            file=file,
            uploaded_by=current_user,
            source=InspectionImageSource.manual_upload,
            storage_prefix="uploads/manual",
            product_id=product_id,
            category=category,
        )
        db.commit()
    except ImageValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return serialize_image(image)


@router.post("/upload/batch", response_model=list[ImageRead], status_code=status.HTTP_201_CREATED)
def upload_images_batch(
    files: list[UploadFile] = File(...),
    product_id: Optional[UUID] = Form(default=None),
    category: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([RoleName.admin, RoleName.quality_engineer, RoleName.factory_supervisor])),
) -> list[ImageRead]:
    if product_id is not None and db.scalar(select(Product).where(Product.id == product_id)) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    prepared_files: list[tuple[UploadFile, bytes]] = []
    try:
        for file in files:
            content = file.file.read()
            validate_image_bytes(file.filename or "", content)
            prepared_files.append((file, content))
    except ImageValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    images: list[InspectionImage] = []
    try:
        for file, content in prepared_files:
            images.append(
                ingest_image_file_data(
                    db=db,
                    filename=file.filename or "upload",
                    content=content,
                    source=InspectionImageSource.batch_upload,
                    storage_prefix="uploads/batch",
                    product_id=product_id,
                    category=category,
                )
            )
        db.commit()
    except ImageValidationError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return [serialize_image(image) for image in images]


@router.get("/", response_model=ImageListResponse)
def list_images(
    status_filter: Optional[InspectionImageStatus] = Query(default=None, alias="status"),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_role([RoleName.admin, RoleName.quality_engineer, RoleName.factory_supervisor])),
) -> ImageListResponse:
    query = select(InspectionImage).order_by(InspectionImage.uploaded_at.desc())
    if status_filter is not None:
        query = query.where(InspectionImage.status == status_filter)
    if category is not None:
        query = query.where(InspectionImage.category == category)

    images = list(db.scalars(query))
    return ImageListResponse(items=[serialize_image(image) for image in images])
