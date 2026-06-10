from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./evhub_dev.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    USE_MEMORY_REDIS: bool = True

    JWT_PRIVATE_KEY: str = ""
    JWT_PUBLIC_KEY: str = ""
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    R2_BUCKET: str = "evhub-media"
    R2_ENDPOINT: str = ""
    R2_ACCESS_KEY: str = ""
    R2_SECRET_KEY: str = ""

    MEILISEARCH_URL: str = "http://localhost:7700"
    MEILISEARCH_API_KEY: str = "local_dev_key"

    SENTRY_DSN: str = ""

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""

    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    APP_URL: str = ""
    APP_PORT: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()