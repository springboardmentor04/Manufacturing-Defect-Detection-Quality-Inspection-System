import os
from dataclasses import dataclass
from pathlib import Path

@dataclass(frozen=True)
class Settings:
    app_name: str = "VisionInspect AI"
    database_url: str = os.getenv("DATABASE_URL", "postgresql+psycopg://visioninspect:visioninspect@localhost:5432/visioninspect")
    jwt_secret: str = os.getenv("JWT_SECRET", "change-this-in-production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    model_path: str = os.getenv("MODEL_PATH", "models/best.pt")
    upload_directory: str = os.getenv("UPLOAD_DIRECTORY", "storage")
    max_file_size_mb: int = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
    model_version: str = os.getenv("MODEL_VERSION", "YOLO-V1")
    allowed_origins: str = os.getenv("ALLOWED_ORIGINS", "*")

    @property
    def max_file_size(self):
        return self.max_file_size_mb * 1024 * 1024

settings = Settings()
Path(settings.upload_directory, "original").mkdir(parents=True, exist_ok=True)
Path(settings.upload_directory, "annotated").mkdir(parents=True, exist_ok=True)
