from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from .models import Role, Decision, Severity, ReviewStatus

class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Role

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: Role
    model_config = {"from_attributes": True}

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class DetectionOut(BaseModel):
    class_name: str
    confidence: float
    bbox: dict
    size_score: float
    location_score: float
    defect_type_score: float
    confidence_score: float
    severity_score: float
    severity_level: Severity

class InspectionOut(BaseModel):
    id: int
    inspection_uuid: str
    decision: Decision
    severity_score: float
    severity_level: Severity
    highest_confidence: float
    average_confidence: float
    defect_count: int
    processing_time_ms: float
    model_version: str
    image_quality: dict
    recommendation: str
    review_status: ReviewStatus
    original_image_url: str
    annotated_image_url: str
    created_at: datetime
    defects: list[DetectionOut]

class ReviewRequest(BaseModel):
    final_decision: Decision
    comments: str = Field(min_length=1, max_length=3000)

class DashboardStats(BaseModel):
    total_inspections: int
    total_defects: int
    defect_rate: float
    pass_rate: float
    fail_rate: float
    manual_review_rate: float
    critical_defects: int
    high_severity_defects: int
    average_inspection_time_ms: float
