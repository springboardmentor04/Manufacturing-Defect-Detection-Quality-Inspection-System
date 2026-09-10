from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    left: str
    top: str
    width: str
    height: str

class FindingModel(BaseModel):
    id: str = Field(alias="_id")  # Custom String primary key (e.g. "IR-4821")
    batchId: str  # Ref to InspectionBatch._id
    productId: str  # Ref to Product._id
    modelRunId: Optional[str] = None  # Ref to ModelRun._id
    findingCode: str
    defectType: str
    severity: Literal["Low", "Medium", "High", "Critical"] = "Low"
    severityScore: float = 0.0
    confidence: float = 0.0
    defectArea: str = "0.0%"
    decision: str = "Review queued"
    boundingBox: Optional[BoundingBox] = None
    segmentationMaskImageId: Optional[str] = None
    gradcamImageId: Optional[str] = None
    boundingBoxImageId: Optional[str] = None
    isFlagged: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
