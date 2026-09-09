from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class InspectionDefect(BaseModel):
    defect_type: str
    location: str
    size_score: float
    confidence: float
    severity_breakdown: dict[str, float]


class InspectionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    category: Optional[str]
    status: str
    decision: str
    severity_score: Optional[float]
    severity_level: str
    defects: list[InspectionDefect]
    timestamp: datetime
    inspector: Optional[str]


class InspectionListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    category: Optional[str]
    status: str
    decision: str
    severity_score: Optional[float]
    uploaded_at: datetime
    uploaded_by: Optional[UUID]


class InspectionListResponse(BaseModel):
    items: list[InspectionListItem]
    total: int
    page: int
    page_size: int
