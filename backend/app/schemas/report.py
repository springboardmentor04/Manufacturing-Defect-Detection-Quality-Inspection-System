from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class QualityReportRow(BaseModel):
    id: str
    filename: str
    category: Optional[str]
    status: str
    decision: str
    severity_score: Optional[float]
    uploaded_at: str


class QualityReportResponse(BaseModel):
    rows: list[QualityReportRow]
    total: int


class DefectTrendPoint(BaseModel):
    bucket: str
    count: int


class DefectTrendResponse(BaseModel):
    points: list[DefectTrendPoint]


class SupervisorAnalyticsResponse(BaseModel):
    total_images: int
    pass_rate: float
    average_severity_score: float
    defect_rate_by_category: dict[str, float]
