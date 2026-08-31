from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class BoundingBoxSchema(BaseModel):
    id: UUID
    defect_type_id: Optional[UUID] = None
    x_min: int
    y_min: int
    width: int
    height: int
    confidence: float
    model_config = ConfigDict(from_attributes=True)


class AIPredictionSchema(BaseModel):
    id: UUID
    model_id: UUID
    predicted_label: str
    confidence_percentage: float
    inference_time_ms: float
    executed_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InspectionImageSchema(BaseModel):
    id: UUID
    file_path: str
    file_size_bytes: int
    image_resolution: str
    uploaded_at: datetime
    ai_prediction: Optional[AIPredictionSchema] = None
    bounding_boxes: List[BoundingBoxSchema] = []
    model_config = ConfigDict(from_attributes=True)


class DefectDiagnosticSchema(BaseModel):
    id: UUID
    defect_type_id: UUID
    severity: str
    description: str
    root_cause: str
    suggested_action: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InspectionResponse(BaseModel):
    id: UUID
    inspection_code: str
    product_id: UUID
    production_line_id: UUID
    inspected_by_user_id: UUID
    status: str
    confidence_score: float
    inspected_at: datetime
    images: List[InspectionImageSchema] = []
    diagnostic: Optional[DefectDiagnosticSchema] = None
    model_config = ConfigDict(from_attributes=True)
