from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.ratelimit import AuthLimiters
from app.core.security import hash_token
from app.db.session import get_session
from app.models import AuthSession, User

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_db(settings: SettingsDep) -> Iterator[Session]:
    if not settings.database_url:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The database is not configured.")
    yield from get_session()


DbDep = Annotated[Session, Depends(get_db)]


def get_limiters(request: Request) -> AuthLimiters:
    limiters: AuthLimiters = request.app.state.limiters
    return limiters


LimitersDep = Annotated[AuthLimiters, Depends(get_limiters)]


def current_user(request: Request, db: DbDep, settings: SettingsDep) -> User:
    token = request.cookies.get(settings.auth_cookie_name)
    unauthenticated = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to continue.")
    if not token:
        raise unauthenticated
    row = db.execute(
        select(AuthSession).where(AuthSession.token_hash == hash_token(token))
    ).scalar_one_or_none()
    if row is None:
        raise unauthenticated
    expires = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=UTC)
    if expires <= datetime.now(UTC):
        db.delete(row)
        db.commit()
        raise unauthenticated
    user = db.get(User, row.user_id)
    if user is None:
        raise unauthenticated
    return user


CurrentUser = Annotated[User, Depends(current_user)]
