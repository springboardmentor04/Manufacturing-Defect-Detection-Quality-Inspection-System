from pydantic import BaseModel
from datetime import datetime
from app.models.inspection import InspectionStatus

class InspectionImageOut(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int | None
    image_width: int | None
    image_height: int | None
    product_category: str | None
    status: InspectionStatus
    uploaded_by: int
    created_at: datetime
    
    # Milestone 2 fields
    defect_detected: bool
    defect_count: int
    defects_details: list[dict] | None = None
    severity_score: float
    severity_level: str
    decision: str
    preprocessed_filename: str | None = None
    annotated_filename: str | None = None
    preprocessing_details: dict | None = None

    model_config = {"from_attributes": True}

class InspectionListResponse(BaseModel):
    total: int
    images: list[InspectionImageOut]

class InspectionStatsResponse(BaseModel):
    total: int
    pending: int
    processing: int
    completed: int
    failed: int
    pass_count: int = 0
    fail_count: int = 0
    review_count: int = 0
    defect_rate: float = 0.0
