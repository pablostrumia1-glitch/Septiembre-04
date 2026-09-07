from __future__ import annotations

import math
import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


SOURCE_ID_PATTERN = re.compile(r"^[a-f0-9]{16,128}$")


def _is_valid_source_id(value: str) -> bool:
    return bool(SOURCE_ID_PATTERN.fullmatch(value or ""))


class _PreviewParamsBase(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_assignment=True)

    @field_validator("*", mode="after")
    @classmethod
    def validate_values(cls, value: Any) -> Any:
        if isinstance(value, float) and not math.isfinite(value):
            raise ValueError("Los parámetros numéricos deben ser finitos")
        return value


class PreviewParams(BaseModel):
    """Subset of mastering parameters exposed to the Preview API. The full
    chain is owned by ``process_audio`` and is not required to validate
    previews, so we declare the fields that the safe preview path actually
    consumes. Additional keys sent by legacy clients are dropped at the
    router boundary instead of being rejected."""

    model_config = ConfigDict(extra="ignore", validate_assignment=True)

    input_gain_db: float = 0.0
    limiter_ceiling: float = 0.95
    target_lufs: float = -14.0
    target_peak: float = 0.95
    use_lufs_normalize: bool = False
    oversample_mode: str = "quality"
    preset: str = "default"

    @field_validator("*", mode="after")
    @classmethod
    def validate_values(cls, value: Any) -> Any:
        if isinstance(value, float) and not math.isfinite(value):
            raise ValueError("Los parámetros numéricos deben ser finitos")
        return value


class PreviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    preview_source_id: str = Field(min_length=16, max_length=128)
    preview_duration_sec: int = Field(default=25, ge=25, le=25)
    params: PreviewParams

    @field_validator("preview_source_id")
    @classmethod
    def validate_source_id(cls, value: str) -> str:
        if not _is_valid_source_id(value):
            raise ValueError("preview_source_id inválido")
        return value


class PreviewSourceResponse(BaseModel):
    source_id: str
    duration_sec: float = Field(gt=0, le=25)
    source_sha256: str = Field(min_length=64, max_length=64)
