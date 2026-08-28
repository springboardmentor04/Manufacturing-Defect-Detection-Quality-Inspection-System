from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

# User Schemas
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role_name: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    role: Any
    
    class Config:
        from_attributes = True

# Auth schemas
class LoginRequest(BaseModel):
    username: str
    password: str

# Product & Batch Schemas
class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    product_code: Optional[str] = None
    production_line: Optional[str] = None

class ProductResponse(BaseModel):
    id: int
    name: str
    product_code: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class BatchCreate(BaseModel):
    batch_number: str
    product_id: int

class BatchResponse(BaseModel):
    id: int
    batch_number: str
    product_id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Inspection Schemas
class DetectionSchema(BaseModel):
    defect_type: str
    product_category: Optional[str] = None
    suggested_defect_type: Optional[str] = None
    defect_present: Optional[bool] = None
    defect_display_name: Optional[str] = None
    detection_confidence: Optional[float] = None
    classification_confidence: Optional[float] = None
    category: Optional[str] = None
    label: Optional[str] = None
    confidence: float
    bbox_x1: float
    bbox_y1: float
    bbox_x2: float
    bbox_y2: float
    area: float
    
    class Config:
        from_attributes = True

class QualityDecisionSchema(BaseModel):
    ai_decision: str
    human_decision: Optional[str] = None
    final_decision: str
    
    class Config:
        from_attributes = True

class InspectionCreate(BaseModel):
    batch_id: Optional[int] = None
    
class InspectionResponse(BaseModel):
    id: int
    batch_id: Optional[int] = None
    product_id: Optional[int] = None
    defect_type: Optional[str] = None
    product_category: Optional[str] = None
    confidence: Optional[float] = None
    created_at: Any = None
    processing_time_ms: float = 0.0
    detections: List[DetectionSchema] = []
    bounding_boxes: Optional[List[Any]] = None
    quality_decision: Optional[QualityDecisionSchema] = None
    quality_assessment: Optional[Any] = None
    ai_decision: Optional[str] = None
    final_decision: Optional[str] = None
    severity_score: Optional[float] = None
    severity_level: Optional[str] = None
    model_message: Optional[str] = None
    image_path: Optional[str] = None
    processed_image_path: Optional[str] = None
    product: Optional[Any] = None
    batch: Optional[Any] = None
    
    class Config:
        from_attributes = True

class ReportResponse(BaseModel):
    inspection_id: int
    product: Optional[str]
    batch: Optional[str]
    timestamp: datetime
    detected_defects: List[DetectionSchema]
    severity_level: Optional[str]
    ai_decision: Optional[str]
    final_decision: Optional[str]
    model_version: Optional[str]

class AnalyticsOverview(BaseModel):
    total_inspections: int
    total_defects: int
    defect_rate: float
    pass_rate: float
    fail_rate: float = 0.0
    reject_rate: float = 0.0
    average_severity: float
    critical_defects: int
    passed_inspections: int = 0
    failed_inspections: int = 0
    rejected_inspections: int = 0
    average_confidence: float = 0.0

class DashboardDefectType(BaseModel):
    name: str
    value: int

class DashboardTrend(BaseModel):
    date: str
    passed: int
    failed: int
    rejected: int = 0
    defects: int

class DashboardRecentInspection(BaseModel):
    id: int
    product_name: Optional[str] = None
    batch_number: Optional[str] = None
    decision: Optional[str] = None
    defect_count: int = 0
    confidence: Optional[float] = None
    quality_score: Optional[float] = None
    created_at: Optional[datetime] = None

class DashboardSummary(BaseModel):
    total_inspections: int
    passed_inspections: int
    failed_inspections: int
    rejected_inspections: int = 0
    total_products_inspected: int
    total_detected_defects: int
    pass_rate: float
    fail_rate: float
    defect_rate: float
    quality_rate: float
    defect_types: List[DashboardDefectType] = []
    trends: List[DashboardTrend] = []
    recent_inspections: List[DashboardRecentInspection] = []
    critical_defects: int = 0
    high_severity_defects: int = 0
    medium_severity_defects: int = 0
    low_severity_defects: int = 0
    average_severity: float = 0.0
    average_confidence: float = 0.0
    rejection_rate: float = 0.0
    severity_distribution: List[DashboardDefectType] = []
    trend_direction: str = "stable"
    recommended_actions: List[str] = []

# Model Schemas
class ModelVersionSchema(BaseModel):
    id: int
    name: Optional[str] = None
    version: str
    dataset: Optional[str] = None
    training_date: Optional[datetime] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    map_score: Optional[float] = None
    status: str
    
    class Config:
        from_attributes = True

# Report Schemas
class ReportSchema(BaseModel):
    id: int
    report_type: str
    date_range: str
    created_at: datetime
    generated_by: Optional[int] = None
    file_path: Optional[str] = None
    
    class Config:
        from_attributes = True

class ReportGenerateSchema(BaseModel):
    report_type: str
    date_range: str
