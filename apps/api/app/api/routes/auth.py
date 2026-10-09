from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.deps import CurrentUser, DbDep, SettingsDep
from app.core.config import Settings, cookie_secure
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


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest, response: Response, db: DbDep, settings: SettingsDep
) -> UserResponse:
    if not settings.auth_allow_registration:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Registration is closed.")
    try:
        user = auth_service.register(db, body)
    except auth_service.EmailTaken as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered.") from exc
    _set_cookie(response, settings, auth_service.start_session(db, settings, user))
    return UserResponse.model_validate(user)


@router.post("/login")
def login(body: LoginRequest, response: Response, db: DbDep, settings: SettingsDep) -> UserResponse:
    try:
        user = auth_service.authenticate(db, body)
    except auth_service.InvalidCredentials as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.") from exc
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
