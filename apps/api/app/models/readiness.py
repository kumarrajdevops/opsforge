import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.user import utcnow


class ReadinessSnapshotRow(Base):
    """Append-only history of readiness results. Rows are never updated or deleted by the
    application; the migration also installs a trigger that rejects UPDATE on PostgreSQL."""

    __tablename__ = "readiness_snapshots"
    __table_args__ = (
        UniqueConstraint("user_id", "snapshot_id", name="uq_snapshot_user_client_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    snapshot_id: Mapped[str] = mapped_column(String(200))
    taken_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    config_version: Mapped[str] = mapped_column(String(100))
    fingerprint: Mapped[str] = mapped_column(String(200))
    evidence_count: Mapped[int] = mapped_column(Integer)
    overall: Mapped[float | None] = mapped_column(Float, nullable=True)
    level: Mapped[int] = mapped_column(Integer)
    factors: Mapped[dict[str, Any]] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
