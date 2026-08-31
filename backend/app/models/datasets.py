import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False, index=True)
    version = Column(String(20), default="v1.0", nullable=False)
    description = Column(String(255), nullable=True)
    path = Column(String(255), nullable=True)
    total_categories = Column(Integer, default=0, nullable=False)
    total_images = Column(Integer, default=0, nullable=False)
    dataset_size = Column(String(50), default="0 MB", nullable=False)
    uploaded_by = Column(String(100), default="Admin", nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    upload_date = Column(String(50), nullable=True)
    status = Column(String(20), default="READY", nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    created_by_user = relationship("User", back_populates="datasets")
    images = relationship("DatasetImage", back_populates="dataset", cascade="all, delete-orphan")
    preprocessing_jobs = relationship("DatasetPreprocessingJob", back_populates="dataset", cascade="all, delete-orphan")
