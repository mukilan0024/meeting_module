from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictException, NotFoundException
from app.models.meeting import Meeting, MeetingStatus
from app.schemas.meeting import MeetingCreate, MeetingUpdate


async def create_meeting(db: AsyncSession, data: MeetingCreate) -> Meeting:
    meeting = Meeting(**data.model_dump())
    db.add(meeting)
    await db.flush()
    await db.refresh(meeting)
    return meeting


async def get_meeting(
    db: AsyncSession,
    meeting_id: uuid.UUID,
    *,
    load_relations: bool = False,
) -> Meeting:
    stmt = select(Meeting).where(Meeting.id == meeting_id)
    if load_relations:
        stmt = stmt.options(
            selectinload(Meeting.participants),
            selectinload(Meeting.agenda_items),
            selectinload(Meeting.action_items),
        )
    result = await db.execute(stmt)
    meeting = result.scalar_one_or_none()
    if meeting is None:
        raise NotFoundException("Meeting", str(meeting_id))
    return meeting


async def list_meetings(
    db: AsyncSession,
    *,
    created_by: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[MeetingStatus] = None,
    start_after: Optional[datetime] = None,
    start_before: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Meeting], int]:
    filters = []
    if created_by:
        filters.append(Meeting.created_by == created_by)
    if project_id:
        filters.append(Meeting.project_id == project_id)
    if status:
        filters.append(Meeting.status == status)
    if start_after:
        filters.append(Meeting.start_time >= start_after)
    if start_before:
        filters.append(Meeting.start_time <= start_before)

    count_stmt = select(func.count()).select_from(Meeting).where(and_(*filters))
    total: int = (await db.execute(count_stmt)).scalar_one()

    offset = (page - 1) * page_size
    stmt = (
        select(Meeting)
        .where(and_(*filters))
        .order_by(Meeting.start_time.asc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    return result.scalars().all(), total


async def update_meeting(
    db: AsyncSession,
    meeting_id: uuid.UUID,
    data: MeetingUpdate,
) -> Meeting:
    meeting = await get_meeting(db, meeting_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(meeting, field, value)
    await db.flush()
    await db.refresh(meeting)
    return meeting


async def delete_meeting(db: AsyncSession, meeting_id: uuid.UUID) -> None:
    meeting = await get_meeting(db, meeting_id)
    await db.delete(meeting)
    await db.flush()


async def detect_conflicts(
    db: AsyncSession,
    created_by: str,
    start_time: datetime,
    end_time: datetime,
    *,
    exclude_meeting_id: Optional[uuid.UUID] = None,
) -> List[Meeting]:
    """
    Returns meetings owned by `created_by` whose time window overlaps with
    [start_time, end_time]. Two intervals overlap when:
        existing.start < new.end  AND  existing.end > new.start
    """
    filters = [
        Meeting.created_by == created_by,
        Meeting.status.notin_([MeetingStatus.CANCELLED, MeetingStatus.POSTPONED]),
        Meeting.start_time < end_time,
        Meeting.end_time > start_time,
    ]
    if exclude_meeting_id:
        filters.append(Meeting.id != exclude_meeting_id)

    stmt = select(Meeting).where(and_(*filters))
    result = await db.execute(stmt)
    return result.scalars().all()
