import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_image_id = Column(UUID(as_uuid=True), ForeignKey("inspection_images.id", ondelete="CASCADE"), unique=True, nullable=False)
    model_id = Column(UUID(as_uuid=True), ForeignKey("ai_models.id", ondelete="RESTRICT"), nullable=False)
    predicted_label = Column(String(100), nullable=False)
    confidence_percentage = Column(Numeric(5, 2), nullable=False)
    inference_time_ms = Column(Numeric(8, 2), nullable=False)
    executed_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    inspection_image = relationship("InspectionImage", back_populates="ai_prediction")
    model = relationship("AIModel", back_populates="predictions")
