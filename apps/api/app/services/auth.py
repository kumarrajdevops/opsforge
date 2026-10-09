from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import (
    hash_password,
    hash_token,
    new_session_token,
    verify_password,
)
from app.models import AuthSession, User
from app.schemas.auth import LoginRequest, RegisterRequest

# Verified against when the email is unknown, so a miss takes as long as a wrong password.
_DUMMY_HASH = hash_password("opsforge-timing-equaliser")


class EmailTaken(Exception):
    pass


class InvalidCredentials(Exception):
    pass


def register(db: Session, request: RegisterRequest) -> User:
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        display_name=request.display_name,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise EmailTaken from exc
    return user


def authenticate(db: Session, request: LoginRequest) -> User:
    user = db.execute(select(User).where(User.email == request.email)).scalar_one_or_none()
    stored = user.password_hash if user else _DUMMY_HASH
    ok = verify_password(request.password, stored)
    if user is None or not ok:
        raise InvalidCredentials
    return user


def start_session(db: Session, settings: Settings, user: User) -> str:
    token = new_session_token()
    now = datetime.now(UTC)
    db.add(
        AuthSession(
            user_id=user.id,
            token_hash=hash_token(token),
            created_at=now,
            expires_at=now + timedelta(hours=settings.auth_session_ttl_hours),
        )
    )
    db.commit()
    return token


def end_session(db: Session, token: str) -> None:
    row = db.execute(
        select(AuthSession).where(AuthSession.token_hash == hash_token(token))
    ).scalar_one_or_none()
    if row is not None:
        db.delete(row)
        db.commit()
