"""
VisionInspect AI - Pydantic Data Models & Schemas
"""

from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class UserRole:
    QUALITY_ENGINEER = "quality_engineer"
    FACTORY_SUPERVISOR = "factory_supervisor"
    ADMIN = "admin"

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = Field(default="quality_engineer", description="Role: quality_engineer, factory_supervisor, admin")
    assigned_line: Optional[str] = "Assembly Line A1"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    assigned_line: Optional[str] = "Assembly Line A1"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

class DefectItem(BaseModel):
    defect_type: str
    confidence: float
    size_score: float
    location_score: float
    bounding_box: BoundingBox

class PreprocessingOptions(BaseModel):
    noise_removal: bool = True
    clahe_contrast: bool = True
    edge_detection: bool = False
    roi_crop: bool = False

class InspectionCreateRequest(BaseModel):
    product_name: str
    product_category: str
    factory_line: str
    image_url: str
    preprocessing: Optional[PreprocessingOptions] = PreprocessingOptions()
    comments: Optional[str] = None

class InspectionResponse(BaseModel):
    id: str
    inspection_code: str
    product_name: str
    product_category: str
    factory_line: str
    image_url: str
    processed_image_url: Optional[str] = None
    severity_score: float
    severity_level: str
    pass_fail: str
    inspector_name: str
    timestamp: datetime
    defects: List[DefectItem]
    comments: Optional[str] = None

class ProductCreate(BaseModel):
    product_name: str
    product_code: str
    category: str
    manufacturer: str