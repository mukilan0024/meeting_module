from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class MoMSignOffCreate(BaseModel):
    meeting_id: uuid.UUID
    participant_id: uuid.UUID
    note_version: int = Field(..., ge=1)
    is_approved: bool = True
    comments: Optional[str] = Field(default=None, max_length=4000)


class MoMSignOffResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    participant_id: uuid.UUID
    signed_at: datetime
    signature_hash: str
    note_version: int
    is_approved: bool
    comments: Optional[str] = None
    pdf_path: Optional[str] = None
    pdf_generated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class MoMSignOffListResponse(BaseModel):
    total: int
    items: List[MoMSignOffResponse]


class MoMSignOffStatusResponse(BaseModel):
    """Summary view: how many participants have / haven't signed off."""
    meeting_id: uuid.UUID
    total_participants: int
    signed_count: int
    pending_count: int
    all_approved: bool
    signoffs: List[MoMSignOffResponse]
