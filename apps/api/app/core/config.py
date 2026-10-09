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

    auth_allow_registration: bool = True
    auth_session_ttl_hours: int = Field(default=24 * 14, ge=1)
    auth_cookie_name: str = "opsforge_session"
    # None means: secure cookies everywhere except local development and tests.
    auth_cookie_secure: bool | None = None

    # Login throttling. Failures are counted per submitted email and per client address.
    auth_login_max_failures: int = Field(default=5, ge=1)
    auth_login_window_seconds: int = Field(default=900, ge=1)
    auth_lockout_seconds: int = Field(default=900, ge=1)
    auth_register_max_per_hour: int = Field(default=10, ge=1)

    # Request bodies above this size are refused with 413 before they are parsed.
    api_max_body_bytes: int = Field(default=2 * 1024 * 1024, ge=1024)
    # Number of reverse proxies in front of the API that append to X-Forwarded-For.
    # 0 means the header is ignored (it can be forged by any client).
    api_trusted_proxies: int = Field(default=0, ge=0, le=5)

    service_name: str = "opsforge-api"
    service_version: str = "0.1.0"


def production_problems(settings: Settings) -> list[str]:
    """Settings that must not reach production. Empty when the configuration is acceptable."""
    if settings.api_env != "production":
        return []
    problems: list[str] = []
    if not settings.database_url:
        problems.append("DATABASE_URL is not set.")
    elif ":opsforge@" in settings.database_url:
        problems.append("DATABASE_URL uses the development database password.")
    if settings.auth_cookie_secure is False:
        problems.append("AUTH_COOKIE_SECURE=false would send session cookies over plain HTTP.")
    if any(
        origin.strip() == "*" or origin.startswith("http://")
        for origin in settings.api_cors_origins
    ):
        problems.append("API_CORS_ORIGINS must list https origins, not * or http.")
    return problems


def cookie_secure(settings: Settings) -> bool:
    if settings.auth_cookie_secure is not None:
        return settings.auth_cookie_secure
    return settings.api_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
