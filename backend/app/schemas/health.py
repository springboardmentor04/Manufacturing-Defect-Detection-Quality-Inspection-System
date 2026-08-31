from pydantic import BaseModel


class HealthCheck(BaseModel):
    status: str
    project_name: str
    version: str
    database: str
