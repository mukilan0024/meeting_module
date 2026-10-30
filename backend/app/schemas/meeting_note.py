from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.meeting_note import NoteType


class MeetingNoteBase(BaseModel):
    note_type: NoteType = NoteType.LIVE_NOTES
    content_json: Optional[Dict[str, Any]] = None
    content_html: Optional[str] = None
    content_text: Optional[str] = None


class MeetingNoteCreate(MeetingNoteBase):
    meeting_id: uuid.UUID
    created_by: str = Field(..., min_length=1, max_length=128)
    last_edited_by: str = Field(..., min_length=1, max_length=128)


class MeetingNoteUpdate(BaseModel):
    """
    Clients must supply the current `version` for optimistic concurrency.
    The API rejects updates where version != db_version, forcing re-fetch.
    """
    content_json: Optional[Dict[str, Any]] = None
    content_html: Optional[str] = None
    content_text: Optional[str] = None
    last_edited_by: str = Field(..., min_length=1, max_length=128)
    version: int = Field(..., ge=1, description="Current document version for optimistic lock")


class MeetingNoteResponse(MeetingNoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    version: int
    created_by: str
    last_edited_by: str
    created_at: datetime
    updated_at: datetime
