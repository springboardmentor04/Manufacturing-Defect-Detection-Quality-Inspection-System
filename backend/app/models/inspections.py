import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_code = Column(String(50), unique=True, nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    production_line_id = Column(UUID(as_uuid=True), ForeignKey("production_lines.id", ondelete="RESTRICT"), nullable=False)
    inspected_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(20), nullable=False)
    confidence_score = Column(Numeric(5, 2), nullable=False)
    inspected_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="inspections")
    production_line = relationship("ProductionLine", back_populates="inspections")
    inspected_by_user = relationship("User", back_populates="inspections")
    images = relationship("InspectionImage", back_populates="inspection", cascade="all, delete-orphan")
    diagnostic = relationship("DefectDiagnostic", back_populates="inspection", uselist=False, cascade="all, delete-orphan")
    report = relationship("InspectionReport", back_populates="inspection", uselist=False, cascade="all, delete-orphan")
