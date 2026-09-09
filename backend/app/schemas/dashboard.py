from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_images: int
    counts_by_status: dict[str, int]
    counts_by_category: dict[str, int]
    counts_by_source: dict[str, int]
