from datetime import datetime
from pydantic import BaseModel


class InspectionCreate(BaseModel):
    engineer_id: int
    product_name: str | None = None
    image_path: str
    status: str = "Pending"


class InspectionResponse(BaseModel):
    id: int
    engineer_id: int
    product_name: str | None
    image_path: str

    status: str

    defect_type: str | None

    confidence: float

    processing_time: float

    result_image: str | None

    created_at: datetime

    class Config:
        from_attributes = True