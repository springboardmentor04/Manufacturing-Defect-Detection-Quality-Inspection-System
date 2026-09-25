import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class Role(str, enum.Enum):
    PRODUCT_MANAGER = "PRODUCT_MANAGER"
    QUALITY_ENGINEER = "QUALITY_ENGINEER"

class Decision(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    REWORK = "REWORK"

class Severity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ReviewStatus(str, enum.Enum):
    PENDING = "PENDING"
    REVIEWED = "REVIEWED"

class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(255), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(SAEnum(Role, name="role_enum"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    inspections = relationship("Inspection", back_populates="user")

class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_code: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    product_name: Mapped[str] = mapped_column(String(200))
    product_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    production_line: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Inspection(Base):
    __tablename__ = "inspections"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    inspection_uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    original_image_path: Mapped[str] = mapped_column(String(500))
    annotated_image_path: Mapped[str] = mapped_column(String(500))
    decision: Mapped[Decision] = mapped_column(SAEnum(Decision, name="decision_enum"))
    severity_score: Mapped[float] = mapped_column(Float)
    severity_level: Mapped[Severity] = mapped_column(SAEnum(Severity, name="severity_enum"))
    highest_confidence: Mapped[float] = mapped_column(Float)
    average_confidence: Mapped[float] = mapped_column(Float)
    defect_count: Mapped[int] = mapped_column(Integer)
    processing_time_ms: Mapped[float] = mapped_column(Float)
    model_version: Mapped[str] = mapped_column(String(100))
    image_quality: Mapped[dict] = mapped_column(JSON)
    recommendation: Mapped[str] = mapped_column(Text)
    review_status: Mapped[ReviewStatus] = mapped_column(SAEnum(ReviewStatus, name="review_status_enum"), default=ReviewStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="inspections")
    product = relationship("Product")
    defects = relationship("Defect", back_populates="inspection", cascade="all, delete-orphan")
    review = relationship("QualityReview", back_populates="inspection", uselist=False, cascade="all, delete-orphan")

class Defect(Base):
    __tablename__ = "defects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    inspection_id: Mapped[int] = mapped_column(ForeignKey("inspections.id", ondelete="CASCADE"), index=True)
    defect_type: Mapped[str] = mapped_column(String(150))
    confidence: Mapped[float] = mapped_column(Float)
    x1: Mapped[float] = mapped_column(Float)
    y1: Mapped[float] = mapped_column(Float)
    x2: Mapped[float] = mapped_column(Float)
    y2: Mapped[float] = mapped_column(Float)
    size_score: Mapped[float] = mapped_column(Float)
    location_score: Mapped[float] = mapped_column(Float)
    defect_type_score: Mapped[float] = mapped_column(Float)
    confidence_score: Mapped[float] = mapped_column(Float)
    severity_score: Mapped[float] = mapped_column(Float)
    severity_level: Mapped[Severity] = mapped_column(SAEnum(Severity, name="severity_enum"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    inspection = relationship("Inspection", back_populates="defects")

class QualityReview(Base):
    __tablename__ = "quality_reviews"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    inspection_id: Mapped[int] = mapped_column(ForeignKey("inspections.id", ondelete="CASCADE"), unique=True)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    original_decision: Mapped[Decision] = mapped_column(SAEnum(Decision, name="decision_enum"))
    final_decision: Mapped[Decision] = mapped_column(SAEnum(Decision, name="decision_enum"))
    comments: Mapped[str] = mapped_column(Text)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    inspection = relationship("Inspection", back_populates="review")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    resource_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
