from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import InspectionImageSource, InspectionImageStatus


class InspectionImage(Base):
    __tablename__ = "inspection_images"
    __table_args__ = (
        Index("ix_inspection_images_status", "status"),
        Index("ix_inspection_images_category", "category"),
        Index("ix_inspection_images_source", "source"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    product_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    filename: Mapped[str] = mapped_column(nullable=False)
    storage_path: Mapped[str] = mapped_column(nullable=False)
    source: Mapped[InspectionImageSource] = mapped_column(
        SAEnum(InspectionImageSource, name="inspection_image_source"), nullable=False
    )
    category: Mapped[Optional[str]] = mapped_column(String(length=255), nullable=True)
    status: Mapped[InspectionImageStatus] = mapped_column(
        SAEnum(InspectionImageStatus, name="inspection_image_status"), nullable=False, default=InspectionImageStatus.pending
    )
    uploaded_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    product = relationship("Product")
    uploader = relationship("User")
