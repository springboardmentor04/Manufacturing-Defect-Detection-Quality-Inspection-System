from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field

class ProductModel(BaseModel):
    id: str = Field(alias="_id")  # Custom String primary key (e.g. "PRD-2026-101")
    productCode: str
    batchId: str  # Ref to InspectionBatch._id
    sequence: int
    name: str
    status: Literal["pending", "passed", "failed", "in_review", "Passed", "Failed", "Pending"] = "pending"
    confidence: Optional[float] = None
    capturedAt: datetime = Field(default_factory=datetime.utcnow)
    primaryImageId: Optional[str] = None  # Ref to InspectionImage._id
    findingCount: int = 0
    failedFindingCount: int = 0
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
