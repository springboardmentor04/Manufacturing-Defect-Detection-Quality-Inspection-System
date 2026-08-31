import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class ProductionLine(Base):
    __tablename__ = "production_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    line_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    location_building = Column(String(100), nullable=False)
    status = Column(String(30), default="OPERATIONAL", nullable=False)
    target_throughput_per_hour = Column(Integer, default=500, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    telemetry = relationship("LineTelemetry", back_populates="production_line", cascade="all, delete-orphan")
    alerts = relationship("CriticalAlert", back_populates="production_line", cascade="all, delete-orphan")
    inspections = relationship("Inspection", back_populates="production_line")
