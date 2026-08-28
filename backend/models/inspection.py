import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, JSON, Text
from sqlalchemy.orm import relationship

# Import Base from database configuration
from database import Base


class InspectionStatus(str, enum.Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    FLAGGED = "FLAGGED"
    NEEDS_REVIEW = "NEEDS_REVIEW"


class SeverityLevel(str, enum.Enum):
    NONE = "NONE"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    image_url = Column(String, nullable=False)
    
    # Enums set with native_enum=False for seamless cross-db (SQLite/Postgres) support
    status = Column(Enum(InspectionStatus, native_enum=False), nullable=False, default=InspectionStatus.PASSED)
    severity_score = Column(Float, nullable=False, default=0.0)
    severity_level = Column(Enum(SeverityLevel, native_enum=False), nullable=False, default=SeverityLevel.LOW)
    
    summary = Column(Text, nullable=False, default="")
    recommendation = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # ORM Relationships
    inspector = relationship("User", back_populates="inspections")
    defects = relationship("Defect", back_populates="inspection", cascade="all, delete-orphan")
    report = relationship("InspectionReport", back_populates="inspection", uselist=False, cascade="all, delete-orphan")


class Defect(Base):
    __tablename__ = "defects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    inspection_id = Column(String, ForeignKey("inspections.id"), nullable=False)
    defect_type = Column(String, nullable=False)  # e.g., Scratch, Crack, Dent, Missing Component
    size_mm2 = Column(Float, nullable=False, default=0.0)
    location_type = Column(String, nullable=False, default="Cosmetic")  # Cosmetic or Functional
    confidence = Column(Float, nullable=False)
    bounding_box = Column(JSON, nullable=False)  # Stores [x_min, y_min, x_max, y_max] or dict metadata

    # Relationship
    inspection = relationship("Inspection", back_populates="defects")


class InspectionReport(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    inspection_id = Column(String, ForeignKey("inspections.id"), nullable=False, unique=True)
    report_pdf_url = Column(String, nullable=True)
    metrics_summary = Column(JSON, nullable=False)  # Score breakdowns & statistical aggregates
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship
    inspection = relationship("Inspection", back_populates="report")