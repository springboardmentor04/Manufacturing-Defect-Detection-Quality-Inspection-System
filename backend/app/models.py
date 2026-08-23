from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False)

    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"))
    created_at = Column(DateTime, server_default=func.now())

    role = relationship("Role", back_populates="users")
    images = relationship("Image", back_populates="uploader")

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    upload_source = Column(String(50), default="manual")
    status = Column(String(50), default="pending")
    uploaded_at = Column(DateTime, server_default=func.now())

    uploader = relationship("User", back_populates="images")
    inspections = relationship("Inspection", back_populates="image", cascade="all, delete-orphan")

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id"))
    status = Column(String(50), default="queued")
    defect_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    image = relationship("Image", back_populates="inspections")
    defects = relationship("Defect", back_populates="inspection", cascade="all, delete-orphan")

class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"))
    defect_type = Column(String(100), nullable=False)
    confidence_score = Column(Float, nullable=False)
    bbox_x = Column(Integer)
    bbox_y = Column(Integer)
    bbox_width = Column(Integer)
    bbox_height = Column(Integer)
    detected_at = Column(DateTime, server_default=func.now())

    inspection = relationship("Inspection", back_populates="defects")
