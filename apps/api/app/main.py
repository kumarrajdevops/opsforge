from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings)

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
    app.dependency_overrides[get_settings] = lambda: settings
    app.include_router(api_router)
    return app


app = create_app()
