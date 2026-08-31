from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AIModelBase(BaseModel):
    model_name: str
    model_version: str
    architecture: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    training_date: datetime
    deployment_status: str = "STAGING"


class AIModelCreate(AIModelBase):
    pass


class AIModelResponse(AIModelBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
