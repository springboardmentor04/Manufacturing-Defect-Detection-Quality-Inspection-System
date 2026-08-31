import uuid
from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class DefectType(Base):
    __tablename__ = "defect_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    default_severity = Column(String(20), default="MEDIUM", nullable=False)
    description = Column(Text, nullable=True)

    diagnostics = relationship("DefectDiagnostic", back_populates="defect_type")
    bounding_boxes = relationship("BoundingBox", back_populates="defect_type")
