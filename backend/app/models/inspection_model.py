from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class Inspection(BaseModel):
    filename: str
    filepath: str
    uploaded_by: str
    uploaded_at: datetime
    status: str
    prediction: Optional[str] = None
    confidence: Optional[float] = None