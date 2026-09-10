from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field

class InspectionImageModel(BaseModel):
    id: str = Field(alias="_id")  # Custom String primary key (e.g. "IMG-ORIG-101")
    batchId: str  # Ref to InspectionBatch._id
    productId: Optional[str] = None  # Ref to Product._id
    kind: Literal["original", "gradcam", "segmentation", "bounding_box", "thumbnail"]
    storageKey: str
    url: str
    originalName: str
    mimeType: str = "image/jpeg"
    sizeBytes: int = 0
    width: Optional[int] = None
    height: Optional[int] = None
    checksum: Optional[str] = None
    uploadedBy: Optional[str] = None  # Ref to User._id
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
