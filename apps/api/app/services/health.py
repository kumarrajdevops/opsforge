import logging
from collections.abc import Callable

import redis
from sqlalchemy import text

from app.core.config import Settings
from app.db.session import get_engine
from app.schemas.health import DependencyHealth, HealthStatus, ReadinessResponse

logger = logging.getLogger(__name__)

Check = Callable[[], None]


def _check_database() -> None:
    with get_engine().connect() as conn:
        conn.execute(text("SELECT 1"))


def _make_redis_check(url: str) -> Check:
    def check() -> None:
        client = redis.Redis.from_url(url, socket_connect_timeout=2, socket_timeout=2)
        try:
            client.ping()
        finally:
            client.close()

    return check


def _run(name: str, check: Check) -> DependencyHealth:
    try:
        check()
    except Exception:
        # Details stay in the log; the response must not leak connection strings.
        logger.warning("Readiness check failed: %s", name, exc_info=True)
        return DependencyHealth(name=name, status="down", detail="unreachable")
    return DependencyHealth(name=name, status="ok")


def build_checks(settings: Settings) -> dict[str, Check]:
    checks: dict[str, Check] = {}
    if settings.database_url:
        checks["postgres"] = _check_database
    if settings.redis_url:
        checks["redis"] = _make_redis_check(settings.redis_url)
    return checks


def check_readiness(
    settings: Settings, checks: dict[str, Check] | None = None
) -> ReadinessResponse:
    active = build_checks(settings) if checks is None else checks
    dependencies = [_run(name, check) for name, check in active.items()]
    status: HealthStatus = "ok" if all(d.status == "ok" for d in dependencies) else "down"
    return ReadinessResponse(
        status=status,
        service=settings.service_name,
        version=settings.service_version,
        dependencies=dependencies,
    )
