from datetime import UTC
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import ReadinessSnapshotRow
from app.schemas.readiness import ReadinessSnapshotPayload


def to_payload(row: ReadinessSnapshotRow) -> ReadinessSnapshotPayload:
    taken = row.taken_at if row.taken_at.tzinfo else row.taken_at.replace(tzinfo=UTC)
    return ReadinessSnapshotPayload(
        id=row.snapshot_id,
        taken_at=taken,
        config_version=row.config_version,
        fingerprint=row.fingerprint,
        evidence_count=row.evidence_count,
        overall=row.overall,
        level=row.level,
        factors=row.factors,
    )


def list_snapshots(db: Session, user_id: UUID, limit: int) -> list[ReadinessSnapshotPayload]:
    """The most recent `limit` snapshots, oldest first."""
    rows = (
        db.execute(
            select(ReadinessSnapshotRow)
            .where(ReadinessSnapshotRow.user_id == user_id)
            .order_by(ReadinessSnapshotRow.taken_at.desc(), ReadinessSnapshotRow.created_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    return [to_payload(r) for r in reversed(rows)]


def _exists(db: Session, user_id: UUID, snapshot_id: str) -> bool:
    return (
        db.execute(
            select(ReadinessSnapshotRow.id).where(
                ReadinessSnapshotRow.user_id == user_id,
                ReadinessSnapshotRow.snapshot_id == snapshot_id,
            )
        ).first()
        is not None
    )


def append(db: Session, user_id: UUID, snapshot: ReadinessSnapshotPayload) -> bool:
    """Adds the snapshot. Returns False, changing nothing, when that id already exists."""
    if _exists(db, user_id, snapshot.id):
        return False
    db.add(
        ReadinessSnapshotRow(
            user_id=user_id,
            snapshot_id=snapshot.id,
            taken_at=snapshot.taken_at,
            config_version=snapshot.config_version,
            fingerprint=snapshot.fingerprint,
            evidence_count=snapshot.evidence_count,
            overall=snapshot.overall,
            level=snapshot.level,
            factors=snapshot.factors,
        )
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return False
    return True
