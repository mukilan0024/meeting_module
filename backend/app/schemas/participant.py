from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl

from app.models.participant import ParticipantRole, ParticipantStatus


class ParticipantBase(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)
    user_email: EmailStr
    user_name: str = Field(..., min_length=1, max_length=255)
    avatar_url: Optional[str] = Field(default=None, max_length=2048)
    role: ParticipantRole = ParticipantRole.ATTENDEE


class ParticipantCreate(ParticipantBase):
    meeting_id: uuid.UUID


class ParticipantUpdate(BaseModel):
    role: Optional[ParticipantRole] = None
    status: Optional[ParticipantStatus] = None
    avatar_url: Optional[str] = None


class ParticipantAttendanceUpdate(BaseModel):
    """Separate endpoint payload for marking join/leave times."""
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None


class ParticipantResponse(ParticipantBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    status: ParticipantStatus
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ParticipantListResponse(BaseModel):
    total: int
    items: List[ParticipantResponse]
