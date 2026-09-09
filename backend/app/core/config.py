from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="VisionInspect AI", alias="APP_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    database_url: str = Field(alias="DATABASE_URL")
    jwt_secret_key: str = Field(alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=60, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    storage_root: str = Field(default="./data/storage", alias="STORAGE_ROOT")
    max_image_size_mb: int = Field(default=10, alias="MAX_IMAGE_SIZE_MB")
    cors_origins: list[str] = Field(default_factory=lambda: ["*"], alias="CORS_ORIGINS")

    @property
    def max_image_size_bytes(self) -> int:
        return self.max_image_size_mb * 1024 * 1024


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
