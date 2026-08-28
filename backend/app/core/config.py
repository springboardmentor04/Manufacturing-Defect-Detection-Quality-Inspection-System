from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "VISIONINSPECT AI"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./visioninspect.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretkeythatyoushouldchangeinproduction")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "../storage/uploads")
    MODEL_PATH: str = os.getenv("MODEL_PATH", "../ml/models/best.pt")
    # Development helper: enable/disable mock login endpoints
    MOCK_LOGIN_ENABLED: bool = os.getenv("MOCK_LOGIN_ENABLED", "true").lower() == "true"

    class Config:
        env_file = ".env"

settings = Settings()
