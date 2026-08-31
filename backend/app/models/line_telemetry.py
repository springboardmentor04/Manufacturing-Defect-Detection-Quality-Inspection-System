from datetime import datetime
from sqlalchemy import Column, BigInteger, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class LineTelemetry(Base):
    __tablename__ = "line_telemetry"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    production_line_id = Column(UUID(as_uuid=True), ForeignKey("production_lines.id", ondelete="CASCADE"), nullable=False)
    utilization_percentage = Column(Numeric(5, 2), nullable=False)
    conveyor_speed_m_per_min = Column(Numeric(6, 2), nullable=False)
    camera_sensor_temp_c = Column(Numeric(5, 2), nullable=True)
    recorded_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    production_line = relationship("ProductionLine", back_populates="telemetry")
