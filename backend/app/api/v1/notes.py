from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.meeting_note import NoteType
from app.schemas.meeting_note import MeetingNoteCreate, MeetingNoteResponse, MeetingNoteUpdate
from app.services import note_service

router = APIRouter(prefix="/notes", tags=["Meeting Notes"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.post("/", response_model=MeetingNoteResponse, status_code=status.HTTP_201_CREATED)
async def get_or_create_note(data: MeetingNoteCreate, db: DB) -> MeetingNoteResponse:
    """
    Idempotent — returns the existing note if (meeting_id, note_type) already exists,
    otherwise creates a new one.
    """
    note = await note_service.get_or_create_note(db, data)
    return MeetingNoteResponse.model_validate(note)


@router.get("/meeting/{meeting_id}/{note_type}", response_model=MeetingNoteResponse)
async def get_note(
    meeting_id: uuid.UUID, note_type: NoteType, db: DB
) -> MeetingNoteResponse:
    note = await note_service.get_note(db, meeting_id, note_type)
    return MeetingNoteResponse.model_validate(note)


@router.patch("/{note_id}", response_model=MeetingNoteResponse)
async def update_note(
    note_id: uuid.UUID, data: MeetingNoteUpdate, db: DB
) -> MeetingNoteResponse:
    """
    Requires the current document `version` for optimistic locking.
    Returns HTTP 409 if the version does not match the server's current version.
    """
    note = await note_service.update_note(db, note_id, data)
    return MeetingNoteResponse.model_validate(note)
