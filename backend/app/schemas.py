from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    role_name: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role_name: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ImageDetail(BaseModel):
    id: int
    uploaded_by: int
    uploader_username: Optional[str] = None
    filename: str
    filepath: str
    upload_source: str
    status: str
    uploaded_at: datetime
    inspection_id: Optional[int] = None
    inspection_status: Optional[str] = None
    defect_count: Optional[int] = 0
    decision: Optional[str] = None

    class Config:
        from_attributes = True

class InspectionDetail(BaseModel):
    id: int
    image_id: int
    filename: Optional[str] = None
    filepath: Optional[str] = None
    status: str
    defect_count: Optional[int] = 0
    decision: Optional[str] = "pending"
    decided_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DefectDetail(BaseModel):
    id: int
    inspection_id: int
    defect_type: str
    confidence_score: float
    bbox_x: Optional[int] = None
    bbox_y: Optional[int] = None
    bbox_width: Optional[int] = None
    bbox_height: Optional[int] = None
    size_score: Optional[float] = None
    location_score: Optional[float] = None
    type_score: Optional[float] = None
    severity_score: Optional[float] = None
    severity_level: Optional[str] = None
    detected_at: datetime

    class Config:
        from_attributes = True

class ImageQualityReport(BaseModel):
    resolution: dict
    blur_score: float
    brightness_mean: float
    brightness_std: float
    contrast_score: float

class InspectionDefectsResponse(BaseModel):
    inspection_id: int
    status: str
    defect_count: int
    decision: Optional[str] = "pending"
    decided_at: Optional[datetime] = None
    image: ImageDetail
    defects: List[DefectDetail]
    quality_report: Optional[dict] = None

class BatchAnalysisRequest(BaseModel):
    inspection_ids: Optional[List[int]] = None

class BatchAnalysisSummary(BaseModel):
    total_processed: int
    total_defects_found: int
    results: List[InspectionDefectsResponse]

# Milestone 3 Reports & Analytics Schemas
class QualitySummaryResponse(BaseModel):
    total_inspections: int
    total_passed: int
    total_failed: int
    pass_rate_percent: float
    total_defects_found: int
    most_common_defect_type: Optional[str] = None
    avg_severity_score: float

class DefectTrendItem(BaseModel):
    period_label: str
    total_inspections: int
    total_defects: int
    pass_count: int
    fail_count: int

class DefectTypeBreakdownItem(BaseModel):
    defect_type: str
    count: int
    avg_severity_score: float

class SeverityDistributionResponse(BaseModel):
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int


