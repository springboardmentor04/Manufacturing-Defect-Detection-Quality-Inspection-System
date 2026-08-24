from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class Inspection(Base):
    __tablename__ = "inspections"

    # ==========================================
    # Primary Key
    # ==========================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ==========================================
    # Engineer
    # ==========================================

    engineer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    # ==========================================
    # Product Information
    # ==========================================

    product_name = Column(
        String(150),
    )

    image_path = Column(
        String(255),
        nullable=False,
    )

    # ==========================================
    # AI Prediction Result
    # ==========================================

    status = Column(
        String(30),
        default="Pending",
    )

    defect_type = Column(
        String(100),
        nullable=True,
    )

    confidence = Column(
        Float,
        default=0.0,
    )

    processing_time = Column(
        Float,
        default=0.0,
    )

    result_image = Column(
        String(255),
        nullable=True,
    )

    # ==========================================
    # AI Decision
    # ==========================================

    severity = Column(
        String(30),
        nullable=True,
    )

    severity_score = Column(
        Integer,
        default=0,
    )

    recommendation = Column(
        String(255),
        nullable=True,
    )

    # ==========================================
    # Timestamps
    # ==========================================

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # ==========================================
    # Relationship
    # ==========================================

    engineer = relationship(
        "User",
        back_populates="inspections",
    )