from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.deps import CurrentUser, DbDep, LimitersDep, SettingsDep
from app.core.config import Settings, cookie_secure
from app.core.ratelimit import client_ip
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_cookie(response: Response, settings: Settings, token: str) -> None:
    response.set_cookie(
        settings.auth_cookie_name,
        token,
        max_age=settings.auth_session_ttl_hours * 3600,
        httponly=True,
        secure=cookie_secure(settings),
        samesite="lax",
        path="/api",
    )


def _too_many(retry_after: int) -> HTTPException:
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        "Too many attempts. Try again later.",
        headers={"Retry-After": str(retry_after)},
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest,
    request: Request,
    response: Response,
    db: DbDep,
    settings: SettingsDep,
    limiters: LimitersDep,
) -> UserResponse:
    if not settings.auth_allow_registration:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Registration is closed.")
    ip = client_ip(request, settings.api_trusted_proxies)
    if (wait := limiters.register_ip.retry_after(ip)) is not None:
        raise _too_many(wait)
    limiters.register_ip.record(ip)
    try:
        user = auth_service.register(db, body)
    except auth_service.EmailTaken as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered.") from exc
    _set_cookie(response, settings, auth_service.start_session(db, settings, user))
    return UserResponse.model_validate(user)


@router.post("/login")
def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: DbDep,
    settings: SettingsDep,
    limiters: LimitersDep,
) -> UserResponse:
    ip = client_ip(request, settings.api_trusted_proxies)
    email_key = body.email
    # The email key applies whether or not the account exists, so a lockout reveals nothing.
    locked = limiters.login_email.retry_after(email_key) or limiters.login_ip.retry_after(ip)
    if locked:
        raise _too_many(locked)
    try:
        user = auth_service.authenticate(db, body)
    except auth_service.InvalidCredentials as exc:
        limiters.login_email.record(email_key)
        limiters.login_ip.record(ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.") from exc
    limiters.login_email.reset(email_key)
    _set_cookie(response, settings, auth_service.start_session(db, settings, user))
    return UserResponse.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: DbDep, settings: SettingsDep) -> None:
    token = request.cookies.get(settings.auth_cookie_name)
    if token:
        auth_service.end_session(db, token)
    response.delete_cookie(settings.auth_cookie_name, path="/api")


@router.get("/me")
def me(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)
