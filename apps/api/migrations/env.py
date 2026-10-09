from alembic import context
from sqlalchemy import create_engine

from app.core.config import get_settings
from app.db.base import Base

# Import model modules here so autogenerate can see them.

target_metadata = Base.metadata


def _url() -> str:
    url = get_settings().database_url
    if not url:
        raise RuntimeError("DATABASE_URL is not configured")
    return url


def run_migrations_offline() -> None:
    context.configure(url=_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(_url())
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
