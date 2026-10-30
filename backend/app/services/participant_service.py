from __future__ import annotations

import uuid
from typing import List, Tuple

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.participant import Participant
from app.schemas.participant import (
    ParticipantAttendanceUpdate,
    ParticipantCreate,
    ParticipantUpdate,
)


async def add_participant(db: AsyncSession, data: ParticipantCreate) -> Participant:
    # Prevent duplicate user in same meeting
    stmt = select(Participant).where(
        and_(
            Participant.meeting_id == data.meeting_id,
            Participant.user_id == data.user_id,
        )
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise ConflictException(
            f"User '{data.user_id}' is already a participant in this meeting."
        )
    participant = Participant(**data.model_dump())
    db.add(participant)
    await db.flush()
    await db.refresh(participant)
    return participant


async def get_participant(db: AsyncSession, participant_id: uuid.UUID) -> Participant:
    stmt = select(Participant).where(Participant.id == participant_id)
    participant = (await db.execute(stmt)).scalar_one_or_none()
    if participant is None:
        raise NotFoundException("Participant", str(participant_id))
    return participant


async def list_participants(
    db: AsyncSession,
    meeting_id: uuid.UUID,
) -> Tuple[List[Participant], int]:
    count_stmt = (
        select(func.count())
        .select_from(Participant)
        .where(Participant.meeting_id == meeting_id)
    )
    total: int = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(Participant)
        .where(Participant.meeting_id == meeting_id)
        .order_by(Participant.created_at.asc())
    )
    result = await db.execute(stmt)
    return result.scalars().all(), total


async def update_participant(
    db: AsyncSession,
    participant_id: uuid.UUID,
    data: ParticipantUpdate,
) -> Participant:
    participant = await get_participant(db, participant_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(participant, field, value)
    await db.flush()
    await db.refresh(participant)
    return participant


async def update_attendance(
    db: AsyncSession,
    participant_id: uuid.UUID,
    data: ParticipantAttendanceUpdate,
) -> Participant:
    participant = await get_participant(db, participant_id)
    if data.joined_at is not None:
        participant.joined_at = data.joined_at
    if data.left_at is not None:
        participant.left_at = data.left_at
    await db.flush()
    await db.refresh(participant)
    return participant


async def remove_participant(db: AsyncSession, participant_id: uuid.UUID) -> None:
    participant = await get_participant(db, participant_id)
    await db.delete(participant)
    await db.flush()
