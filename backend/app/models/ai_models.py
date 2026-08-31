import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class AIModel(Base):
    __tablename__ = "ai_models"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), unique=True, nullable=False, index=True)
    architecture = Column(String(100), nullable=False)
    accuracy = Column(Numeric(5, 4), nullable=False)
    precision = Column(Numeric(5, 4), nullable=False)
    recall = Column(Numeric(5, 4), nullable=False)
    f1_score = Column(Numeric(5, 4), nullable=False)
    training_date = Column(DateTime(timezone=True), nullable=False)
    deployment_status = Column(String(20), default="STAGING", nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    predictions = relationship("AIPrediction", back_populates="model")
