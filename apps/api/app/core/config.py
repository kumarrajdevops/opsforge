from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    """Runtime configuration. Everything comes from the environment; no secret has a default."""

    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_env: Literal["development", "test", "production"] = "development"
    api_log_level: Literal["debug", "info", "warning", "error"] = "info"
    api_cors_origins: list[str] = Field(default_factory=list)
    database_url: str | None = None
    redis_url: str | None = None

    service_name: str = "opsforge-api"
    service_version: str = "0.1.0"


@lru_cache
def get_settings() -> Settings:
    return Settings()
