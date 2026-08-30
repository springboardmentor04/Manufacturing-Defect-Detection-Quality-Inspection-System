"""
Pydantic schemas for the image upload / inspection workflow and Milestone 3 severity & analytics.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from app.models.inspection import InspectionStatus


class QualityReport(BaseModel):
    width: int
    height: int
    file_size_kb: float
    sharpness_score: float
    brightness_mean: float
    contrast_std: float
    quality_score: float
    blur_flag: bool
    brightness_flag: str
    recommendation: str


class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int


class SeverityDetails(BaseModel):
    size_score: float = 0.0
    location_score: float = 0.0
    defect_type_score: float = 0.0
    confidence_score_pct: float = 0.0


class InspectionOut(BaseModel):
    model_config = {"protected_namespaces": ()}

    id: str
    product_name: str
    batch_number: Optional[str] = None
    image_filename: str
    image_url: str
    uploaded_by: str
    uploaded_by_name: Optional[str] = None
    status: InspectionStatus
    quality_report: Optional[QualityReport] = None
    anomaly_ratio: Optional[float] = None
    bounding_boxes: List[BoundingBox] = []
    heatmap_url: Optional[str] = None
    model_used: Optional[str] = None
    confidence_score: Optional[float] = None
    defect_type: Optional[str] = None
    severity_score: Optional[float] = None
    severity_level: Optional[str] = None
    quality_recommendation: Optional[str] = None
    severity_details: Optional[SeverityDetails] = None
    notes: Optional[str] = None
    source: str = "manual_upload"
    created_at: str


class InspectionListResponse(BaseModel):
    total: int
    items: List[InspectionOut]


class BreakdownItem(BaseModel):
    label: str
    count: int


class TimeSeriesItem(BaseModel):
    date: str
    total: int
    passed: int
    failed: int
    avg_severity: float


class DashboardStats(BaseModel):
    total_inspections: int
    pending: int
    passed: int
    failed: int
    total_users: Optional[int] = None
    inspections_today: int
    avg_confidence: Optional[float] = None
    avg_quality_score: Optional[float] = None
    avg_severity_score: Optional[float] = None
    pass_rate_pct: float = 0.0
    defect_rate_pct: float = 0.0
    status_breakdown: List[BreakdownItem] = []
    category_breakdown: List[BreakdownItem] = []
    defect_breakdown: List[BreakdownItem] = []
    severity_breakdown: List[BreakdownItem] = []
    source_breakdown: List[BreakdownItem] = []
    recent_trend: List[TimeSeriesItem] = []