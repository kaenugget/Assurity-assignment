from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    service_config_path: str = "api/data/services.yaml"
    check_interval_seconds: int = 30
    convex_url: str = "http://localhost:3210"
    webhook_url: str | None = None
    openai_api_key: str | None = None
    openai_model: str = "gpt-5"
    request_timeout_seconds: float = 10.0
    port: int = 8000
    self_base_url: str | None = None
    cors_allowed_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env", ROOT_DIR / ".env.local"),
        env_prefix="",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("self_base_url", mode="before")
    @classmethod
    def normalize_self_base_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip()
            return normalized or None
        return value

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def parse_cors_allowed_origins(cls, value: str | list[str] | None) -> list[str]:
        if value is None:
            return [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ]
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def effective_self_base_url(self) -> str:
        if self.self_base_url:
            return self.self_base_url.rstrip("/")
        return f"http://127.0.0.1:{self.port}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
