"""
Central configuration for VisionInspect AI backend.
Reads settings from environment variables / .env file.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "visioninspect_ai"

    JWT_SECRET: str = "change_this_to_a_long_random_secret_key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    UPLOAD_DIR: str = "uploads"
    MVTEC_DATASET_PATH: str = "./dataset/mvtec_ad"

    # Milestone 2: defect detection engine
    MODEL_CACHE_DIR: str = "model_cache"
    REFERENCE_IMAGE_SIZE: int = 256
    ANOMALY_Z_THRESHOLD: float = 2.5
    ANOMALY_FAIL_RATIO: float = 0.015
    REFERENCE_SAMPLE_LIMIT: int = 40

    CORS_ORIGINS: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

    @property
    def cors_origin_list(self):
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()