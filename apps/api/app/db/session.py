from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


@lru_cache
def get_engine() -> Engine:
    """Created lazily so importing the app never requires a running database."""
    url = get_settings().database_url
    if not url:
        raise RuntimeError("DATABASE_URL is not configured")
    return create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 3})


def get_session() -> Iterator[Session]:
    """FastAPI dependency: one transaction scope per request."""
    with sessionmaker(get_engine(), expire_on_commit=False)() as session:
        yield session
