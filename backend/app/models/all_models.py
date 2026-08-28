from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.base import Base

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # ADMIN, QUALITY_ENGINEER, SUPERVISOR, OPERATOR
    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role_id = Column(Integer, ForeignKey("roles.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    role = relationship("Role", back_populates="users")
    inspections = relationship("Inspection", back_populates="operator")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    product_code = Column(String, unique=True, nullable=True)
    production_line = Column(String, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    batches = relationship("ProductionBatch", back_populates="product")

class ProductionBatch(Base):
    __tablename__ = "production_batches"
    id = Column(Integer, primary_key=True, index=True)
    batch_number = Column(String, unique=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product", back_populates="batches")
    inspections = relationship("Inspection", back_populates="batch")

class ModelVersion(Base):
    __tablename__ = "model_versions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    version = Column(String, index=True)
    dataset = Column(String)
    training_date = Column(DateTime, default=datetime.utcnow)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    map_score = Column(Float, nullable=True)
    model_path = Column(String)
    status = Column(String, default="active") # active, archived
    
    inspections = relationship("Inspection", back_populates="model_version_rel")

class Inspection(Base):
    __tablename__ = "inspections"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("production_batches.id"), nullable=True)
    operator_id = Column(Integer, ForeignKey("users.id"))
    model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processing_time_ms = Column(Float, default=0.0)
    
    batch = relationship("ProductionBatch", back_populates="inspections")
    operator = relationship("User", back_populates="inspections")
    model_version_rel = relationship("ModelVersion", back_populates="inspections")
    
    images = relationship("InspectionImage", back_populates="inspection")
    detections = relationship("Detection", back_populates="inspection")
    severity_score = relationship("SeverityScore", back_populates="inspection", uselist=False)
    quality_decision = relationship("QualityDecision", back_populates="inspection", uselist=False)
    quality_assessment = relationship("QualityAssessment", back_populates="inspection", uselist=False)
    image_analysis = relationship("ImageAnalysis", back_populates="inspection", uselist=False)

class InspectionImage(Base):
    __tablename__ = "inspection_images"
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"))
    file_path = Column(String)
    image_type = Column(String) # raw, processed, annotated
    created_at = Column(DateTime, default=datetime.utcnow)
    
    inspection = relationship("Inspection", back_populates="images")

class ImageAnalysis(Base):
    __tablename__ = "image_analyses"
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), unique=True, index=True)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    brightness = Column(Float, nullable=False)
    contrast = Column(Float, nullable=False)
    sharpness = Column(Float, nullable=False)
    quality_status = Column(String, nullable=False)
    warning = Column(Text, nullable=True)
    model_status = Column(String, nullable=False, default="UNKNOWN")
    model_message = Column(Text, nullable=True)
    inspection = relationship("Inspection", back_populates="image_analysis")

class Detection(Base):
    __tablename__ = "detections"
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"))
    defect_type = Column(String, index=True)
    product_category = Column(String, nullable=True)
    suggested_defect_type = Column(String, nullable=True)
    defect_present = Column(Boolean, default=False, nullable=True)
    defect_display_name = Column(String, nullable=True)
    detection_confidence = Column(Float, nullable=True)
    classification_confidence = Column(Float, nullable=True)
    confidence = Column(Float)
    bbox_x1 = Column(Float)
    bbox_y1 = Column(Float)
    bbox_x2 = Column(Float)
    bbox_y2 = Column(Float)
    area = Column(Float)
    
    inspection = relationship("Inspection", back_populates="detections")
    assessment = relationship("DefectAssessment", back_populates="detection", uselist=False)

class DefectAssessment(Base):
    __tablename__ = "defect_assessments"
    id = Column(Integer, primary_key=True, index=True)
    detection_id = Column(Integer, ForeignKey("detections.id"), unique=True, index=True)
    size_score = Column(Float, nullable=False)
    location_score = Column(Float, nullable=False)
    type_score = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)
    severity_score = Column(Float, nullable=False)
    severity_level = Column(String, nullable=False)
    quality_risk = Column(String, nullable=False)
    quality_decision = Column(String, nullable=False)
    recommended_action = Column(Text, nullable=False)
    manual_review_required = Column(Boolean, default=False, nullable=False)

    detection = relationship("Detection", back_populates="assessment")

class SeverityScore(Base):
    __tablename__ = "severity_scores"
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"))
    size_score = Column(Float)
    location_score = Column(Float)
    type_score = Column(Float)
    confidence_score = Column(Float)
    total_score = Column(Float)
    level = Column(String) # CRITICAL, HIGH, MEDIUM, LOW
    
    inspection = relationship("Inspection", back_populates="severity_score")

class QualityDecision(Base):
    __tablename__ = "quality_decisions"
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"))
    ai_decision = Column(String) # REJECT, REWORK, REVIEW, PASS
    human_decision = Column(String, nullable=True)
    final_decision = Column(String)
    override_reason = Column(String, nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    inspection = relationship("Inspection", back_populates="quality_decision")
    reviewer = relationship("User")

class QualityAssessment(Base):
    __tablename__ = "quality_assessments"
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), unique=True, index=True)
    overall_result = Column(String, nullable=False)
    highest_severity = Column(String, nullable=False)
    quality_risk = Column(String, nullable=False)
    defect_count = Column(Integer, default=0, nullable=False)
    recommended_action = Column(Text, nullable=False)
    manual_review_required = Column(Boolean, default=False, nullable=False)

    inspection = relationship("Inspection", back_populates="quality_assessment")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, index=True)
    entity = Column(String)
    entity_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(JSON, nullable=True)

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String)
    date_range = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    generated_by = Column(Integer, ForeignKey("users.id"))
    file_path = Column(String)
    
    generator = relationship("User")
