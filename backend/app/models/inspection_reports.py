import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class InspectionReport(Base):
    __tablename__ = "inspection_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_code = Column(String(50), unique=True, nullable=False, index=True)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id", ondelete="CASCADE"), unique=True, nullable=False)
    generated_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    report_type = Column(String(50), nullable=False)
    file_path = Column(String(512), nullable=False)
    generated_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    inspection = relationship("Inspection", back_populates="report")
    generated_by_user = relationship("User", back_populates="inspection_reports")
