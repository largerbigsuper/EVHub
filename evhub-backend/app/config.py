from pydantic_settings import BaseSettings
from functools import lru_cache


def _generate_dev_rsa_keys() -> tuple[str, str]:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.backends import default_backend

    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend(),
    )
    private_key = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    public_key = key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    return private_key, public_key


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

    UPLOAD_BACKEND: str = "local"
    QINIU_ACCESS_KEY: str = ""
    QINIU_SECRET_KEY: str = ""
    QINIU_BUCKET: str = ""
    QINIU_DOMAIN: str = ""

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
    s = Settings()
    if not s.JWT_PRIVATE_KEY or not s.JWT_PUBLIC_KEY:
        try:
            priv, pub = _generate_dev_rsa_keys()
            if not s.JWT_PRIVATE_KEY:
                object.__setattr__(s, "JWT_PRIVATE_KEY", priv)
            if not s.JWT_PUBLIC_KEY:
                object.__setattr__(s, "JWT_PUBLIC_KEY", pub)
        except Exception:
            raise RuntimeError(
                "JWT keys not configured. Set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY "
                "environment variables, or install cryptography to auto-generate dev keys."
            )
    return s