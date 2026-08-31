import uuid
from datetime import datetime
from sqlalchemy import Column, String, BigInteger, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class InspectionImage(Base):
    __tablename__ = "inspection_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    image_resolution = Column(String(20), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    inspection = relationship("Inspection", back_populates="images")
    ai_prediction = relationship("AIPrediction", back_populates="inspection_image", uselist=False, cascade="all, delete-orphan")
    bounding_boxes = relationship("BoundingBox", back_populates="inspection_image", cascade="all, delete-orphan")
