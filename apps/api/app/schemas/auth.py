from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator
from pydantic.alias_generators import to_camel

Password = Annotated[str, StringConstraints(min_length=10, max_length=200)]
DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class _Credentials(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")

    email: Annotated[str, StringConstraints(max_length=320)]

    @field_validator("email")
    @classmethod
    def _normalise_email(cls, value: str) -> str:
        value = value.strip().lower()
        local, sep, domain = value.partition("@")
        if not sep or not local or "." not in domain or any(c.isspace() for c in value):
            raise ValueError("Enter a valid email address.")
        return value


class RegisterRequest(_Credentials):
    password: Password
    display_name: DisplayName


class LoginRequest(_Credentials):
    password: Annotated[str, StringConstraints(min_length=1, max_length=200)]


class UserResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: UUID
    email: str
    display_name: str
    created_at: datetime
