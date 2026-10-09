from typing import Literal

from pydantic import BaseModel

HealthStatus = Literal["ok", "degraded", "down"]


class DependencyHealth(BaseModel):
    name: str
    status: HealthStatus
    detail: str | None = None


class LivenessResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str
    version: str


class ReadinessResponse(BaseModel):
    status: HealthStatus
    service: str
    version: str
    dependencies: list[DependencyHealth]
