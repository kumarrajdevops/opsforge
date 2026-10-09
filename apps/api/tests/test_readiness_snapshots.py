from typing import Any

from fastapi.testclient import TestClient

URL = "/api/readiness/snapshots"


def _snap(n: int, **overrides: Any) -> dict[str, Any]:
    return {
        "id": f"snap-{n}",
        "takenAt": f"2026-06-{n:02d}T12:00:00.000Z",
        "configVersion": "v1",
        "fingerprint": f"fp-{n}",
        "evidenceCount": n,
        "overall": 40.5 + n,
        "level": 2,
        "factors": {"knowledge": 70, "labs": None},
        **overrides,
    }


def _sign_in(client: TestClient, email: str = "ada@example.com") -> None:
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery", "displayName": "Ada"},
    )
    assert res.status_code == 201


def test_requires_sign_in(client: TestClient) -> None:
    assert client.get(URL).status_code == 401
    assert client.post(URL, json=_snap(1)).status_code == 401


def test_append_then_list_oldest_first(client: TestClient) -> None:
    _sign_in(client)
    assert client.post(URL, json=_snap(2)).status_code == 201
    assert client.post(URL, json=_snap(1)).status_code == 201
    listed = client.get(URL).json()
    assert [s["id"] for s in listed] == ["snap-1", "snap-2"]
    assert listed[0]["factors"] == {"knowledge": 70, "labs": None}
    assert listed[0]["takenAt"].startswith("2026-06-01T12:00:00")


def test_duplicate_id_is_idempotent_and_never_rewrites(client: TestClient) -> None:
    _sign_in(client)
    assert client.post(URL, json=_snap(1)).status_code == 201
    again = client.post(URL, json=_snap(1, overall=99, evidenceCount=500))
    assert again.status_code == 200
    stored = client.get(URL).json()
    assert len(stored) == 1
    assert stored[0]["overall"] == 41.5
    assert stored[0]["evidenceCount"] == 1


def test_no_update_or_delete_routes(client: TestClient) -> None:
    _sign_in(client)
    client.post(URL, json=_snap(1))
    assert client.put(f"{URL}/snap-1", json=_snap(1)).status_code in (404, 405)
    assert client.delete(f"{URL}/snap-1").status_code in (404, 405)


def test_snapshots_are_private_to_the_user(client: TestClient) -> None:
    _sign_in(client)
    client.post(URL, json=_snap(1))
    client.post("/api/auth/logout")
    _sign_in(client, "grace@example.com")
    assert client.get(URL).json() == []
    assert client.post(URL, json=_snap(1)).status_code == 201


def test_limit_returns_the_most_recent(client: TestClient) -> None:
    _sign_in(client)
    for n in range(1, 6):
        client.post(URL, json=_snap(n))
    assert [s["id"] for s in client.get(URL, params={"limit": 2}).json()] == ["snap-4", "snap-5"]


def test_import_skips_existing_ids(client: TestClient) -> None:
    _sign_in(client)
    client.post(URL, json=_snap(1))
    res = client.post(f"{URL}/import", json={"snapshots": [_snap(1), _snap(2), _snap(3)]})
    assert res.json() == {"imported": 2, "skipped": 1}
    assert len(client.get(URL).json()) == 3


def test_rejects_invalid_snapshots(client: TestClient) -> None:
    _sign_in(client)
    assert client.post(URL, json=_snap(1, level=9)).status_code == 422
    assert client.post(URL, json=_snap(1, overall=150)).status_code == 422
    assert client.post(URL, json=_snap(1, factors={"astrology": 5})).status_code == 422
    assert client.post(URL, json={**_snap(1), "extra": True}).status_code == 422
