from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """
    Application settings and configuration.
    Uses pydantic_settings to load from environment variables.
    """
    # Project Settings
    PROJECT_NAME: str = "VisionInspect AI"
    API_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Database Settings
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "visioninspect_db"

    # Authentication Settings
    SECRET_KEY: str = "supersecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # AI Settings
    USE_REAL_AI: bool = False
    YOLO_CONF_THRESHOLD: float = 0.15

    class Config:
        case_sensitive = True
        env_file = ".env"

# Instantiate settings to be imported across the application
settings = Settings()
