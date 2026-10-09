"""users, auth sessions and readiness snapshots

Revision ID: 0001
Revises:
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NO_UPDATE_FUNCTION = """
CREATE FUNCTION readiness_snapshots_reject_update() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'readiness_snapshots is append-only';
END;
$$ LANGUAGE plpgsql
"""


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])

    op.create_table(
        "readiness_snapshots",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("snapshot_id", sa.String(200), nullable=False),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("config_version", sa.String(100), nullable=False),
        sa.Column("fingerprint", sa.String(200), nullable=False),
        sa.Column("evidence_count", sa.Integer(), nullable=False),
        sa.Column("overall", sa.Float(), nullable=True),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column(
            "factors", sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "snapshot_id", name="uq_snapshot_user_client_id"),
    )
    op.create_index("ix_readiness_snapshots_user_id", "readiness_snapshots", ["user_id"])
    op.create_index("ix_readiness_snapshots_taken_at", "readiness_snapshots", ["taken_at"])

    if op.get_bind().dialect.name == "postgresql":
        op.execute(_NO_UPDATE_FUNCTION)
        op.execute(
            "CREATE TRIGGER readiness_snapshots_no_update BEFORE UPDATE ON readiness_snapshots "
            "FOR EACH ROW EXECUTE FUNCTION readiness_snapshots_reject_update()"
        )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS readiness_snapshots_no_update ON readiness_snapshots")
        op.execute("DROP FUNCTION IF EXISTS readiness_snapshots_reject_update()")
    op.drop_table("readiness_snapshots")
    op.drop_table("auth_sessions")
    op.drop_table("users")
