from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    image_path = Column(
        String,
        nullable=False
    )

    status = Column(
        String,
        default="UPLOADED"
    )

    preprocessing_status = Column(
        String,
        default="PENDING"
    )

    prediction = Column(
        String,
        nullable=True
    )

    confidence = Column(
        Float,
        nullable=True
    )

    inspection_result = Column(
        String,
        nullable=True
    )

    # --- Severity Scoring Fields ---
    defect_type = Column(String, nullable=True)
    defect_size_score = Column(Float, nullable=True)
    defect_location_score = Column(Float, nullable=True)
    severity_score = Column(Float, nullable=True)
    severity_level = Column(String, nullable=True)
    recommended_action = Column(String, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )