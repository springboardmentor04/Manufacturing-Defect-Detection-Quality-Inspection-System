import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class DefectDiagnostic(Base):
    __tablename__ = "defect_diagnostics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id", ondelete="CASCADE"), unique=True, nullable=False)
    defect_type_id = Column(UUID(as_uuid=True), ForeignKey("defect_types.id", ondelete="RESTRICT"), nullable=False)
    severity = Column(String(20), nullable=False)
    severity_score = Column(Numeric(5, 2), nullable=True)
    description = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    inspection = relationship("Inspection", back_populates="diagnostic")
    defect_type = relationship("DefectType", back_populates="diagnostics")
