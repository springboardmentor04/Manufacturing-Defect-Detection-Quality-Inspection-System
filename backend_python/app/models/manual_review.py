from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field

class ManualReviewModel(BaseModel):
    id: str = Field(alias="_id")  # Custom String primary key (e.g. "REV-4821-1")
    batchId: str  # Ref to InspectionBatch._id
    productId: str  # Ref to Product._id
    findingId: Optional[str] = None  # Ref to Finding._id
    reviewerId: str  # Ref to User._id
    status: Literal["reviewed", "accepted", "rejected", "rework", "pending"] = "pending"
    decision: str
    note: Optional[str] = None
    reviewedAt: datetime = Field(default_factory=datetime.utcnow)
    reviewVersion: int = 1
    isCurrent: bool = True
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
