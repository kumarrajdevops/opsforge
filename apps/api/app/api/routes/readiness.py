from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbDep
from app.schemas.readiness import ReadinessSnapshotBatch, ReadinessSnapshotPayload
from app.services import snapshots as snapshot_service

router = APIRouter(prefix="/readiness/snapshots", tags=["readiness"])


@router.get("")
def list_snapshots(
    user: CurrentUser,
    db: DbDep,
    limit: Annotated[int, Query(ge=1, le=1000)] = 200,
) -> list[ReadinessSnapshotPayload]:
    return snapshot_service.list_snapshots(db, user.id, limit)


@router.post("", status_code=status.HTTP_201_CREATED)
def append_snapshot(
    body: ReadinessSnapshotPayload, response: Response, user: CurrentUser, db: DbDep
) -> ReadinessSnapshotPayload:
    """Idempotent: a snapshot id that already exists is left untouched and returns 200."""
    if not snapshot_service.append(db, user.id, body):
        response.status_code = status.HTTP_200_OK
    return body


@router.post("/import")
def import_snapshots(body: ReadinessSnapshotBatch, user: CurrentUser, db: DbDep) -> dict[str, int]:
    """Moves history recorded in the browser to the account. Existing ids are skipped."""
    imported = sum(snapshot_service.append(db, user.id, s) for s in body.snapshots)
    return {"imported": imported, "skipped": len(body.snapshots) - imported}
