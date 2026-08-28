from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class BoundingBoxSchema(BaseModel):
    x: int
    y: int
    width: int
    height: int
    label: str
    confidence: float


class DefectSchema(BaseModel):
    id: str
    defect_type: str
    size_mm2: float
    location_type: str
    confidence: float
    bounding_box: BoundingBoxSchema
    severity_score: float
    severity_level: str


class InspectionResponse(BaseModel):
    id: str
    image_url: str
    status: str
    confidence: float
    severity_score: float
    severity_level: str
    summary: str
    recommendation: str
    defects: List[DefectSchema]
    created_at: datetime

    class Config:
        from_attributes = True


class AnalyticsSummaryResponse(BaseModel):
    total_inspections: int
    pass_rate_percentage: float
    defect_breakdown: Dict[str, int]
    average_severity: float
    recent_inspections: List[InspectionResponse]


class ReportResponse(BaseModel):
    inspection_id: str
    generated_at: datetime
    metrics_summary: Dict[str, float]
    download_url: Optional[str] = None