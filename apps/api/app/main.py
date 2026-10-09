from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import Settings, get_settings, production_problems
from app.core.logging import configure_logging
from app.core.middleware import BodySizeLimitMiddleware, SecurityHeadersMiddleware
from app.core.ratelimit import AuthLimiters


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings)
    problems = production_problems(settings)
    if problems:
        raise RuntimeError("Unsafe production configuration: " + " ".join(problems))

    docs_enabled = settings.api_env != "production"
    app = FastAPI(
        title="OPSFORGE API",
        version=settings.service_version,
        docs_url="/api/docs" if docs_enabled else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if docs_enabled else None,
    )
    if settings.api_cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.api_cors_origins,
            allow_methods=["GET", "POST"],
            allow_credentials=True,
            allow_headers=["*"],
        )
    # Added last so they are outermost: the size check and the headers cover every response,
    # including CORS preflights and framework errors.
    app.state.limiters = AuthLimiters(
        max_failures=settings.auth_login_max_failures,
        window_seconds=settings.auth_login_window_seconds,
        lockout_seconds=settings.auth_lockout_seconds,
        register_per_hour=settings.auth_register_max_per_hour,
    )
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.api_max_body_bytes)
    app.add_middleware(SecurityHeadersMiddleware, hsts=settings.api_env == "production")
    app.dependency_overrides[get_settings] = lambda: settings
    app.include_router(api_router)
    return app


app = create_app()
