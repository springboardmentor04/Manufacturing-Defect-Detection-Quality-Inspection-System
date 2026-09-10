from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field

class BatchModel(BaseModel):
    id: str = Field(alias="_id")  # Custom String primary key (e.g. "BT-4108")
    batchCode: str
    name: str
    line: str
    createdBy: Optional[str] = None  # Ref to User._id
    status: Literal["queued", "processing", "in_review", "complete", "failed", "Hold for review", "Review queued", "Passed", "In review", "Complete"] = "queued"
    capturedAt: datetime = Field(default_factory=datetime.utcnow)
    completedAt: Optional[datetime] = None
    itemCount: int = 0
    flagCount: int = 0
    reviewedCount: int = 0
    reviewRequired: bool = True
    verdict: Literal["Pass", "Fail", "Pending", "Hold", "Review"] = "Pending"
    overallSeverity: Optional[str] = None  # "Low" | "Medium" | "High" | "Critical"
    overallSeverityScore: Optional[float] = None
    overallConfidence: Optional[float] = None
    mode: str = "Detection + segmentation"
    sortOrder: float = 0.0
    failureReason: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
