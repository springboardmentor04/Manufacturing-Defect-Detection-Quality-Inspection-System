import uuid
from sqlalchemy import Column, Integer, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class BoundingBox(Base):
    __tablename__ = "bounding_boxes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_image_id = Column(UUID(as_uuid=True), ForeignKey("inspection_images.id", ondelete="CASCADE"), nullable=False)
    defect_type_id = Column(UUID(as_uuid=True), ForeignKey("defect_types.id", ondelete="SET NULL"), nullable=True)
    x_min = Column(Integer, nullable=False)
    y_min = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    confidence = Column(Numeric(5, 2), nullable=False)

    inspection_image = relationship("InspectionImage", back_populates="bounding_boxes")
    defect_type = relationship("DefectType", back_populates="bounding_boxes")
