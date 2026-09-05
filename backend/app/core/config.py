from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

def _default_upload_dir() -> str:
    env = os.getenv("UPLOAD_DIR")
    if env:
        return env
    if os.path.exists("storage") or os.path.exists("ml"):
        return "storage/uploads"
    return "../storage/uploads"

def _default_model_path() -> str:
    env = os.getenv("MODEL_PATH")
    if env:
        return env
    if os.path.exists("ml/models/best.pt"):
        return "ml/models/best.pt"
    return "../ml/models/best.pt"

class Settings(BaseSettings):
    PROJECT_NAME: str = "VISIONINSPECT AI"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./visioninspect.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretkeythatyoushouldchangeinproduction")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    UPLOAD_DIR: str = _default_upload_dir()
    MODEL_PATH: str = _default_model_path()
    # Development helper: enable/disable mock login endpoints
    MOCK_LOGIN_ENABLED: bool = os.getenv("MOCK_LOGIN_ENABLED", "true").lower() == "true"

    class Config:
        env_file = ".env"

settings = Settings()
