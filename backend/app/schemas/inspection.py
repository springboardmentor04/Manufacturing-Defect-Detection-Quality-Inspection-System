from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class InspectionCreate(BaseModel):
    engineer_id: str
    employee_id: str
    engineer_name: str
    dataset_category: str
    image_path: str
    original_filename: str
    source: str = Field(default="Gallery", description="Source of image: Camera or Gallery")

class BatchInspectionImage(BaseModel):
    image_path: str
    original_filename: str
    dataset_category: Optional[str] = None

class BatchInspectionCreate(BaseModel):
    engineer_id: str
    employee_id: str
    engineer_name: str
    dataset_category: Optional[str] = None
    source: str = Field(default="Batch Upload", description="Source of image: Batch Upload")
    images: list[BatchInspectionImage]

class InspectionResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    inspection_id: str
    engineer_id: str
    employee_id: str
    engineer_name: str
    dataset_category: str
    image_path: str
    original_filename: str
    source: str
    status: str
    upload_time: datetime
    
    # Mock AI Fields
    ai_status: Optional[str] = None
    inspection_result: Optional[str] = None
    confidence: Optional[float] = None
    defect_type: Optional[str] = None
    defect_category: Optional[str] = None
    severity: Optional[str] = None
    completed_at: Optional[datetime] = None
    processing_time: Optional[float] = None
    bounding_boxes: Optional[list] = None
    segmentation_masks: Optional[list] = None
    detections: Optional[list] = None
    # Milestone 3B: Severity & Quality Risk
    severity_score: Optional[float] = None
    severity_level: Optional[str] = None
    severity_components: Optional[dict] = None
    quality_risk: Optional[str] = None
    recommended_action: Optional[str] = None
    
    # Milestone 2: Quality & Analytics
    image_quality: Optional[dict] = None
    image_analytics: Optional[dict] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

class InspectionUpdate(BaseModel):
    status: Optional[str] = None

class InspectionListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: list[InspectionResponse]
