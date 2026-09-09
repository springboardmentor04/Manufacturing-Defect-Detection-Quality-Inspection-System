from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import InspectionImageSource, InspectionImageStatus
from app.models.inspection_image import InspectionImage


class ImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: Optional[UUID]
    filename: str
    storage_path: str
    source: InspectionImageSource
    category: Optional[str]
    status: InspectionImageStatus
    uploaded_by: Optional[UUID]
    uploaded_at: datetime


class ImageListResponse(BaseModel):
    items: list[ImageRead]


def serialize_image(image: InspectionImage) -> ImageRead:
    return ImageRead(
        id=image.id,
        product_id=image.product_id,
        filename=image.filename,
        storage_path=image.storage_path,
        source=image.source,
        category=image.category,
        status=image.status,
        uploaded_by=image.uploaded_by,
        uploaded_at=image.uploaded_at,
    )
