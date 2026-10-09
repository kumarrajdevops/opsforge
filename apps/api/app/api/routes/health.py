from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.core.config import Settings, get_settings
from app.schemas.health import LivenessResponse, ReadinessResponse
from app.services import health as health_service

router = APIRouter(prefix="/health", tags=["health"])

SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get("/live")
def live(settings: SettingsDep) -> LivenessResponse:
    return LivenessResponse(service=settings.service_name, version=settings.service_version)


@router.get("/ready")
def ready(settings: SettingsDep, response: Response) -> ReadinessResponse:
    result = health_service.check_readiness(settings)
    if result.status != "ok":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return result
