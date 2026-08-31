import os
from urllib.parse import quote_plus
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    PROJECT_NAME: str = "VisionInspect AI API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "super-secret-key-for-development-visioninspect"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres_password"
    POSTGRES_DB: str = "visioninspect_db"
    DATABASE_URL: str = ""

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]

    @property
    def get_database_url(self) -> Union[URL, str]:
        """Construct safe database URL handling special characters (@, :, #, %, etc.) in passwords."""
        # Always construct URL safely from components
        try:
            from sqlalchemy.engine import make_url
            return make_url(self.DATABASE_URL)
        except Exception:
            pass
        return URL.create(
            drivername="postgresql+psycopg2",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=int(self.POSTGRES_PORT) if self.POSTGRES_PORT else 5432,
            database=self.POSTGRES_DB
        )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
