from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class ProductBase(BaseModel):
    product_code: str
    serial_number: str
    batch_number: str
    name: str
    category: str
    specification_metadata: Optional[Dict[str, Any]] = None


class ProductCreate(ProductBase):
    pass


class ProductResponse(ProductBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
