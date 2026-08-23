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

    class Config:
        from_attributes = True

class InspectionDetail(BaseModel):
    id: int
    image_id: int
    filename: Optional[str] = None
    filepath: Optional[str] = None
    status: str
    defect_count: Optional[int] = 0
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
    image: ImageDetail
    defects: List[DefectDetail]
    quality_report: Optional[dict] = None

class BatchAnalysisRequest(BaseModel):
    inspection_ids: Optional[List[int]] = None

class BatchAnalysisSummary(BaseModel):
    total_processed: int
    total_defects_found: int
    results: List[InspectionDefectsResponse]

