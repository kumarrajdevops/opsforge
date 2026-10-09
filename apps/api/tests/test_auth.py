from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.security import hash_password, hash_token, verify_password
from app.main import create_app


def _register(client: TestClient, overrides: dict[str, str] | None = None) -> int:
    body = {"email": "Ada@Example.com", "password": "correct horse battery", "displayName": "Ada"}
    res = client.post("/api/auth/register", json={**body, **(overrides or {})})
    return int(res.status_code)


def test_password_hash_verifies_and_is_salted() -> None:
    first, second = hash_password("a long enough password"), hash_password("a long enough password")
    assert first != second
    assert verify_password("a long enough password", first)
    assert not verify_password("another password", first)
    assert not verify_password("anything", "not-a-hash")


def test_token_hash_is_stable_and_not_the_token() -> None:
    assert hash_token("abc") == hash_token("abc")
    assert hash_token("abc") != "abc"


def test_register_signs_in_with_http_only_cookie(client: TestClient) -> None:
    res = client.post(
        "/api/auth/register",
        json={
            "email": "Ada@Example.com",
            "password": "correct horse battery",
            "displayName": "Ada",
        },
    )
    assert res.status_code == 201
    assert res.json()["email"] == "ada@example.com"
    assert "password" not in res.text
    cookie = res.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert client.get("/api/auth/me").json()["displayName"] == "Ada"


def test_me_requires_a_session(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401


def test_duplicate_email_is_rejected_case_insensitively(client: TestClient) -> None:
    assert _register(client) == 201
    assert _register(client, {"email": "ADA@example.com"}) == 409


def test_weak_or_malformed_input_is_rejected(client: TestClient) -> None:
    assert _register(client, {"password": "short"}) == 422
    assert _register(client, {"email": "not-an-email"}) == 422
    res = client.post(
        "/api/auth/register",
        json={"email": "a@b.co", "password": "long enough password", "displayName": "A", "x": 1},
    )
    assert res.status_code == 422


def test_login_logout_cycle(client: TestClient) -> None:
    _register(client)
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401

    bad = client.post("/api/auth/login", json={"email": "ada@example.com", "password": "wrong"})
    assert bad.status_code == 401
    unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "x"})
    assert unknown.status_code == 401
    assert unknown.json() == bad.json()

    ok = client.post(
        "/api/auth/login", json={"email": "ada@example.com", "password": "correct horse battery"}
    )
    assert ok.status_code == 200
    assert client.get("/api/auth/me").status_code == 200

    stale = client.cookies.get("opsforge_session")
    assert stale
    assert client.post("/api/auth/logout").status_code == 204
    client.cookies.set("opsforge_session", stale, path="/api")
    assert client.get("/api/auth/me").status_code == 401


def test_closed_registration(client: TestClient, settings: Settings) -> None:
    closed = settings.model_copy(update={"auth_allow_registration": False})
    client.app.dependency_overrides[get_settings] = lambda: closed  # type: ignore[attr-defined]
    assert _register(client) == 403


def test_auth_without_database_is_503(settings: Settings) -> None:
    res = TestClient(create_app(settings)).post(
        "/api/auth/login", json={"email": "a@b.co", "password": "x"}
    )
    assert res.status_code == 503
