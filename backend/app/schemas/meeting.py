from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.meeting import MeetingStatus, MeetingType


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------
class MeetingBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=8000)
    meeting_type: MeetingType = MeetingType.GENERAL
    start_time: datetime
    end_time: datetime
    timezone: str = Field(default="UTC", max_length=64)
    recurrence_rule: Optional[str] = Field(default=None, max_length=512)
    physical_location: Optional[str] = Field(default=None, max_length=512)
    meeting_url: Optional[str] = Field(default=None, max_length=2048)
    conference_id: Optional[str] = Field(default=None, max_length=256)
    project_id: Optional[str] = Field(default=None, max_length=128)

    @field_validator("end_time")
    @classmethod
    def end_must_be_after_start(cls, v: datetime, info) -> datetime:
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time must be strictly after start_time")
        return v


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------
class MeetingCreate(MeetingBase):
    created_by: str = Field(..., min_length=1, max_length=128)


class MeetingUpdate(BaseModel):
    """All fields optional — supports partial PATCH updates."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    meeting_type: Optional[MeetingType] = None
    status: Optional[MeetingStatus] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    timezone: Optional[str] = Field(default=None, max_length=64)
    recurrence_rule: Optional[str] = None
    physical_location: Optional[str] = None
    meeting_url: Optional[str] = None
    conference_id: Optional[str] = None
    project_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------
class MeetingResponse(MeetingBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: MeetingStatus
    created_by: str
    recurrence_parent_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime


class MeetingListResponse(BaseModel):
    """Paginated list wrapper."""
    total: int
    page: int
    page_size: int
    items: List[MeetingResponse]


class MeetingConflictResponse(BaseModel):
    """Returned when scheduling conflicts are detected."""
    has_conflict: bool
    conflicting_meetings: List[MeetingResponse]
