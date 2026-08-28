import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum
from sqlalchemy.orm import relationship

# Import Base from database configuration
from database import Base


class UserRole(str, enum.Enum):
    QUALITY_ENGINEER = "QUALITY_ENGINEER"
    FACTORY_SUPERVISOR = "FACTORY_SUPERVISOR"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    
    # native_enum=False ensures compatibility with SQLite and other databases
    role = Column(Enum(UserRole, native_enum=False), default=UserRole.QUALITY_ENGINEER, nullable=False)
    
    # Modern timezone-aware timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship to inspections created by this user
    inspections = relationship("Inspection", back_populates="inspector", cascade="all, delete-orphan")