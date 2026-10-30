from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException, OptimisticLockException
from app.models.meeting_note import MeetingNote, NoteType
from app.schemas.meeting_note import MeetingNoteCreate, MeetingNoteUpdate


async def get_or_create_note(
    db: AsyncSession,
    data: MeetingNoteCreate,
) -> MeetingNote:
    """
    Returns the existing note for (meeting_id, note_type) or creates one.
    Ensures at most one active document per (meeting, note_type) pair.
    """
    stmt = select(MeetingNote).where(
        and_(
            MeetingNote.meeting_id == data.meeting_id,
            MeetingNote.note_type == data.note_type,
        )
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return existing

    note = MeetingNote(**data.model_dump())
    db.add(note)
    await db.flush()
    await db.refresh(note)
    return note


async def get_note(
    db: AsyncSession,
    meeting_id: uuid.UUID,
    note_type: NoteType,
) -> MeetingNote:
    stmt = select(MeetingNote).where(
        and_(
            MeetingNote.meeting_id == meeting_id,
            MeetingNote.note_type == note_type,
        )
    )
    note = (await db.execute(stmt)).scalar_one_or_none()
    if note is None:
        raise NotFoundException(
            f"MeetingNote ({note_type.value})", str(meeting_id)
        )
    return note


async def get_note_by_id(
    db: AsyncSession,
    note_id: uuid.UUID,
) -> MeetingNote:
    stmt = select(MeetingNote).where(MeetingNote.id == note_id)
    note = (await db.execute(stmt)).scalar_one_or_none()
    if note is None:
        raise NotFoundException("MeetingNote", str(note_id))
    return note


async def update_note(
    db: AsyncSession,
    note_id: uuid.UUID,
    data: MeetingNoteUpdate,
) -> MeetingNote:
    """
    Updates note content with optimistic locking.
    Rejects if data.version != db note.version.
    On success, increments version by 1.
    """
    note = await get_note_by_id(db, note_id)

    if data.version != note.version:
        raise OptimisticLockException()

    if data.content_json is not None:
        note.content_json = data.content_json
    if data.content_html is not None:
        note.content_html = data.content_html
    if data.content_text is not None:
        note.content_text = data.content_text

    note.last_edited_by = data.last_edited_by
    note.version = note.version + 1

    await db.flush()
    await db.refresh(note)
    return note
