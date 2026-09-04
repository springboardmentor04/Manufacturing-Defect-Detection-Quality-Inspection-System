"""Pydantic request and response models for the VisionInspect API."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


VALID_ROLES = {"quality_engineer", "factory_supervisor", "admin"}


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)
    role: str = "quality_engineer"
    assigned_line: Optional[str] = "Assembly Line A1"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    role: Optional[str] = None
    assigned_line: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    assigned_line: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class PixelBoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class DefectItem(BaseModel):
    class_id: int
    class_name: str
    defect_type: str
    confidence: float
    confidence_score: float
    size_score: float
    location_score: float
    type_score: float
    severity_score: float
    pixel_bounding_box: PixelBoundingBox
    bounding_box: BoundingBox


class PreprocessingOptions(BaseModel):
    noise_removal: bool = True
    clahe_contrast: bool = True
    edge_detection: bool = False
    roi_crop: bool = False


class InspectionCreateRequest(BaseModel):
    product_id: str = Field(min_length=1)
    product_name: str = Field(min_length=1)
    product_category: str = Field(min_length=1)
    factory_line: str = Field(min_length=1)
    image_url: str = Field(min_length=1)
    preprocessing: PreprocessingOptions = Field(default_factory=PreprocessingOptions)
    comments: Optional[str] = None


class InspectionResponse(BaseModel):
    id: str
    inspection_code: str
    product_id: str
    product_name: str
    product_category: str
    factory_line: str
    inspector_id: str
    image_url: str
    processed_image_url: Optional[str] = None
    severity_score: float
    severity_level: str
    pass_fail: str
    inspector_name: str
    timestamp: datetime
    defects: List[DefectItem]
    image_width: int
    image_height: int
    preprocessing_used: PreprocessingOptions
    model: dict
    recommendation: str
    comments: Optional[str] = None


class ProductCreate(BaseModel):
    product_name: str = Field(min_length=1)
    product_code: str = Field(min_length=1)
    category: str = Field(min_length=1)
    manufacturer: str = Field(min_length=1)
    factory_line: str = Field(min_length=1)
    status: str = "Active"


class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    factory_line: Optional[str] = None
    status: Optional[str] = None
