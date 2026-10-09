from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.ratelimit import AttemptLimiter
from app.main import create_app
from tests.conftest import build_client

PASSWORD = "correct horse battery"  # noqa: S105


def _register(client: TestClient, email: str = "ada@example.com") -> int:
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": PASSWORD, "displayName": "Ada"},
    )
    return int(res.status_code)


def _login(client: TestClient, password: str, email: str = "ada@example.com") -> int:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    return int(res.status_code)


def test_api_responses_carry_security_headers(client: TestClient) -> None:
    res = client.get("/api/health/live")
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["referrer-policy"] == "no-referrer"
    assert "frame-ancestors 'none'" in res.headers["content-security-policy"]
    assert res.headers["cache-control"] == "no-store"
    assert "strict-transport-security" not in res.headers


def test_errors_and_unauthenticated_responses_carry_headers_too(client: TestClient) -> None:
    for res in (client.get("/api/auth/me"), client.get("/api/nope")):
        assert res.headers["x-content-type-options"] == "nosniff"
        assert res.headers["cache-control"] == "no-store"


def test_docs_page_is_exempt_from_csp_only(client: TestClient) -> None:
    res = client.get("/api/docs")
    assert res.status_code == 200
    assert "content-security-policy" not in res.headers
    assert res.headers["x-content-type-options"] == "nosniff"


def test_hsts_only_in_production() -> None:
    settings = Settings(
        _env_file=None,
        api_env="production",
        database_url="postgresql+psycopg://app:s3cret-value@db/opsforge",
    )
    with TestClient(create_app(settings)) as client:
        res = client.get("/api/health/live")
    assert "max-age=31536000" in res.headers["strict-transport-security"]
    assert res.headers.get("x-frame-options") == "DENY"


def test_oversized_body_is_refused_before_parsing(client: TestClient, settings: Settings) -> None:
    big = "x" * (settings.api_max_body_bytes + 1)
    res = client.post(
        "/api/auth/login",
        content=big,
        headers={"content-type": "application/json"},
    )
    assert res.status_code == 413
    assert res.headers["x-content-type-options"] == "nosniff"


def test_oversized_chunked_body_is_refused(client: TestClient, settings: Settings) -> None:
    def chunks() -> Iterator[bytes]:
        for _ in range(settings.api_max_body_bytes // 65_536 + 2):
            yield b"x" * 65_536

    res = client.post(
        "/api/auth/login",
        content=chunks(),
        headers={"content-type": "application/json"},
    )
    assert res.status_code == 413


def test_body_under_the_limit_is_accepted(client: TestClient) -> None:
    assert _register(client) == 201


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("email", "a" * 400 + "@example.com"),
        ("password", "short"),
        ("password", "p" * 201),
        ("displayName", " "),
        ("displayName", "n" * 101),
    ],
)
def test_register_rejects_out_of_bounds_fields(client: TestClient, field: str, value: str) -> None:
    body = {"email": "ada@example.com", "password": PASSWORD, "displayName": "Ada", field: value}
    assert client.post("/api/auth/register", json=body).status_code == 422


def test_unknown_fields_are_rejected(client: TestClient) -> None:
    body = {"email": "a@b.co", "password": PASSWORD, "displayName": "A", "isAdmin": True}
    assert client.post("/api/auth/register", json=body).status_code == 422


def test_login_locks_out_after_repeated_failures(client: TestClient, settings: Settings) -> None:
    assert _register(client) == 201
    for _ in range(settings.auth_login_max_failures):
        assert _login(client, "wrong password") == 401
    # Even the right password is refused while locked, and the response says when to retry.
    res = client.post("/api/auth/login", json={"email": "ada@example.com", "password": PASSWORD})
    assert res.status_code == 429
    assert int(res.headers["retry-after"]) > 0


def test_lockout_does_not_reveal_whether_the_account_exists(
    client: TestClient, settings: Settings
) -> None:
    for _ in range(settings.auth_login_max_failures):
        assert _login(client, "wrong password", "nobody@example.com") == 401
    assert _login(client, "wrong password", "nobody@example.com") == 429


def test_successful_login_clears_the_failure_count(client: TestClient, settings: Settings) -> None:
    assert _register(client) == 201
    for _ in range(settings.auth_login_max_failures - 1):
        assert _login(client, "wrong password") == 401
    assert _login(client, PASSWORD) == 200
    for _ in range(settings.auth_login_max_failures - 1):
        assert _login(client, "wrong password") == 401
    assert _login(client, PASSWORD) == 200


def test_registration_is_throttled_per_address(client: TestClient, settings: Settings) -> None:
    for i in range(settings.auth_register_max_per_hour):
        assert _register(client, f"user{i}@example.com") == 201
    assert _register(client, "one-more@example.com") == 429


def test_forwarded_for_is_ignored_unless_proxies_are_trusted(client: TestClient) -> None:
    assert _register(client) == 201
    # Spoofing a new address on every try must not dodge the per-address limit.
    for i in range(20):
        client.post(
            "/api/auth/login",
            json={"email": f"victim{i}@example.com", "password": "nope"},
            headers={"x-forwarded-for": f"10.0.0.{i}"},
        )
    res = client.post(
        "/api/auth/login",
        json={"email": "fresh@example.com", "password": "nope"},
        headers={"x-forwarded-for": "10.9.9.9"},
    )
    assert res.status_code == 429


def test_trusted_proxy_uses_the_address_it_appended() -> None:
    settings = Settings(_env_file=None, api_env="test", api_trusted_proxies=1)
    with build_client(settings) as client:
        for i in range(settings.auth_login_max_failures * 4):
            client.post(
                "/api/auth/login",
                json={"email": f"v{i}@example.com", "password": "nope"},
                headers={"x-forwarded-for": f"6.6.6.{i}, 203.0.113.7"},
            )
        blocked = client.post(
            "/api/auth/login",
            json={"email": "other@example.com", "password": "nope"},
            headers={"x-forwarded-for": "1.2.3.4, 203.0.113.7"},
        )
        elsewhere = client.post(
            "/api/auth/login",
            json={"email": "other@example.com", "password": "nope"},
            headers={"x-forwarded-for": "1.2.3.4, 198.51.100.9"},
        )
    assert blocked.status_code == 429
    assert elsewhere.status_code == 401


def test_attempt_limiter_unlocks_after_the_lockout() -> None:
    now = [0.0]
    limiter = AttemptLimiter(
        max_attempts=2, window_seconds=60, lockout_seconds=30, clock=lambda: now[0]
    )
    limiter.record("k")
    assert limiter.retry_after("k") is None
    limiter.record("k")
    assert limiter.retry_after("k") == 31
    now[0] = 31.0
    assert limiter.retry_after("k") is None
    limiter.record("k")
    assert limiter.retry_after("k") is None


def test_attempt_limiter_forgets_attempts_outside_the_window() -> None:
    now = [0.0]
    limiter = AttemptLimiter(
        max_attempts=3, window_seconds=10, lockout_seconds=30, clock=lambda: now[0]
    )
    limiter.record("k")
    limiter.record("k")
    now[0] = 11.0
    limiter.record("k")
    assert limiter.retry_after("k") is None


def test_attempt_limiter_memory_is_bounded() -> None:
    limiter = AttemptLimiter(max_attempts=5, window_seconds=60, lockout_seconds=60, max_keys=50)
    for i in range(500):
        limiter.record(f"key-{i}")
    assert len(limiter._attempts) <= 50  # noqa: SLF001


@pytest.mark.parametrize(
    "overrides",
    [
        {},
        {"database_url": "postgresql+psycopg://opsforge:opsforge@db/opsforge"},
        {"database_url": "postgresql+psycopg://a:b@db/x", "auth_cookie_secure": False},
        {"database_url": "postgresql+psycopg://a:b@db/x", "api_cors_origins": ["*"]},
        {"database_url": "postgresql+psycopg://a:b@db/x", "api_cors_origins": ["http://x.test"]},
    ],
)
def test_production_refuses_unsafe_configuration(overrides: dict[str, object]) -> None:
    settings = Settings(_env_file=None, api_env="production", **overrides)  # type: ignore[arg-type]
    with pytest.raises(RuntimeError, match="Unsafe production configuration"):
        create_app(settings)


def test_no_route_accepts_a_command_to_run(client: TestClient) -> None:
    """ADR-0007: user commands are never executed on the server. Adding an endpoint that takes
    one must be a deliberate decision, so every route is listed here."""
    schema = client.get("/api/openapi.json").json()
    routes = {(method.upper(), path) for path, item in schema["paths"].items() for method in item}
    assert routes == {
        ("GET", "/api/health/live"),
        ("GET", "/api/health/ready"),
        ("POST", "/api/auth/register"),
        ("POST", "/api/auth/login"),
        ("POST", "/api/auth/logout"),
        ("GET", "/api/auth/me"),
        ("GET", "/api/readiness/snapshots"),
        ("POST", "/api/readiness/snapshots"),
        ("POST", "/api/readiness/snapshots/import"),
    }
