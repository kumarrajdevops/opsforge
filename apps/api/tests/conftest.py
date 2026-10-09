from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.deps import get_db
from app.core.config import Settings
from app.db.base import Base
from app.main import create_app


@pytest.fixture
def settings() -> Settings:
    return Settings(_env_file=None, api_env="test")


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    """An app on in-memory SQLite. Migrations are checked separately against PostgreSQL."""
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)

    def override() -> Iterator[Session]:
        with factory() as session:
            yield session

    app = create_app(settings)
    app.dependency_overrides[get_db] = override
    with TestClient(app) as test_client:
        yield test_client
    engine.dispose()
