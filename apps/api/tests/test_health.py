from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app
from app.services.health import check_readiness


def _settings() -> Settings:
    return Settings(_env_file=None)


def test_live_returns_ok() -> None:
    res = TestClient(create_app(_settings())).get("/api/health/live")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_ready_ok_with_no_dependencies_configured() -> None:
    res = TestClient(create_app(_settings())).get("/api/health/ready")
    assert res.status_code == 200
    assert res.json()["dependencies"] == []


def _fail() -> None:
    raise ConnectionError("postgresql://user:secret@host/db")


def test_readiness_down_does_not_leak_error_details() -> None:
    checks: dict[str, Callable[[], None]] = {"postgres": _fail, "redis": lambda: None}
    result = check_readiness(_settings(), checks)
    assert result.status == "down"
    assert "secret" not in result.model_dump_json()
    assert {d.name: d.status for d in result.dependencies} == {"postgres": "down", "redis": "ok"}


def test_ready_returns_503_when_dependency_down(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://x:y@127.0.0.1:1/none")
    get_settings.cache_clear()
    try:
        res = TestClient(create_app(get_settings())).get("/api/health/ready")
    finally:
        get_settings.cache_clear()
    assert res.status_code == 503
    assert res.json()["status"] == "down"
