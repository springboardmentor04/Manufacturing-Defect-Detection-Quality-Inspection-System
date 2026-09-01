from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ReportMetrics(BaseModel):
    totalInspections: int
    passRate: float
    completionRate: float = 100.0
    defectsPerThousand: float = 0.0
    coverage: float = 100.0

class DefectMixItem(BaseModel):
    label: str
    value: float
    color: str

class QualityReportModel(BaseModel):
    id: str = Field(alias="_id")  # Custom String primary key (e.g. "REP-20260830-7D")
    periodKey: str
    periodStart: datetime
    periodEnd: datetime
    generatedBy: Optional[str] = None  # Ref to User._id
    metrics: ReportMetrics
    trend: List[float] = []
    defectMix: List[DefectMixItem] = []
    summary: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
