from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field

class ModelRunModel(BaseModel):
    id: str = Field(alias="_id")  # Custom String primary key (e.g. "RUN-CNN-4821")
    batchId: str  # Ref to InspectionBatch._id
    productId: str  # Ref to Product._id
    inputImageId: Optional[str] = None  # Ref to InspectionImage._id
    modelType: Literal["cnn", "unet", "yolo", "detection", "segmentation"]
    modelVersion: str = "v1.0.0"
    status: Literal["queued", "running", "completed", "failed"] = "queued"
    startedAt: datetime = Field(default_factory=datetime.utcnow)
    completedAt: Optional[datetime] = None
    overallConfidence: Optional[float] = None
    outputImageIds: List[str] = []  # List of InspectionImage._id
    rawOutput: Optional[Dict[str, Any]] = None
    errorMessage: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
