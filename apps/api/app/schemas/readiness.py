from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator
from pydantic.alias_generators import to_camel

FACTOR_IDS = frozenset(
    {
        "knowledge",
        "questions",
        "flashcards",
        "labs",
        "troubleshooting",
        "incidents",
        "architecture",
        "security",
        "communication",
        "interviews",
        "confidence",
    }
)

ShortText = Annotated[str, StringConstraints(min_length=1, max_length=200)]


class ReadinessSnapshotPayload(BaseModel):
    """Wire shape of the web app's `ReadinessSnapshot` type (camelCase)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")

    id: ShortText
    taken_at: datetime
    config_version: ShortText
    fingerprint: ShortText
    evidence_count: Annotated[int, Field(ge=0, le=1_000_000)]
    overall: Annotated[float, Field(ge=0, le=100)] | None
    level: Annotated[int, Field(ge=1, le=6)]
    factors: dict[str, Annotated[float, Field(ge=0, le=100)] | None]

    @field_validator("factors")
    @classmethod
    def _known_factors(cls, value: dict[str, float | None]) -> dict[str, float | None]:
        unknown = set(value) - FACTOR_IDS
        if unknown:
            raise ValueError(f"Unknown readiness factor: {sorted(unknown)[0]}")
        return value


class ReadinessSnapshotBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    snapshots: Annotated[list[ReadinessSnapshotPayload], Field(max_length=500)]
