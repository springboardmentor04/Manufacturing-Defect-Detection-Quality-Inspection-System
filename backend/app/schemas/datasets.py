from typing import Optional, List
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CategoryDetail(BaseModel):
    category_name: str
    train_count: int
    test_count: int
    ground_truth_count: int
    total_images: int


class DatasetBase(BaseModel):
    name: str
    version: Optional[str] = "v1.0"
    description: Optional[str] = None
    path: Optional[str] = None
    total_categories: Optional[int] = 0
    total_images: Optional[int] = 0
    dataset_size: Optional[str] = "0 MB"
    uploaded_by: Optional[str] = "Admin"
    status: Optional[str] = "READY"


class DatasetCreate(DatasetBase):
    pass


class DatasetResponse(DatasetBase):
    id: UUID
    upload_date: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    categories_breakdown: Optional[List[CategoryDetail]] = []

    class Config:
        from_attributes = True


class DatasetStatsResponse(BaseModel):
    total_datasets: int
    total_categories: int
    total_images: int
    dataset_size: str
    preprocessing_status: str


class PaginatedDatasetResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    datasets: List[DatasetResponse]
