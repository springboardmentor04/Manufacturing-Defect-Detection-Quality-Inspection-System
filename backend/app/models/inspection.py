from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class InspectionStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"

class InspectionImage(Base):
    __tablename__ = "inspection_images"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    image_width = Column(Integer)
    image_height = Column(Integer)
    product_category = Column(String(100))
    status = Column(Enum(InspectionStatus), default=InspectionStatus.pending)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Milestone 2 columns
    defect_detected = Column(Boolean, default=False)
    defect_count = Column(Integer, default=0)
    defects_details = Column(JSON, nullable=True)
    severity_score = Column(Float, default=0.0)
    severity_level = Column(String(50), default="Low")
    decision = Column(String(50), default="Pass")
    preprocessed_filename = Column(String(255), nullable=True)
    annotated_filename = Column(String(255), nullable=True)
    preprocessing_details = Column(JSON, nullable=True)

    uploader = relationship("User", foreign_keys=[uploaded_by])

