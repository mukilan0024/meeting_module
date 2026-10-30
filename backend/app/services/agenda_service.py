from __future__ import annotations

import uuid
from typing import List, Tuple

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.agenda import AgendaItem
from app.schemas.agenda import AgendaItemCreate, AgendaItemUpdate, AgendaReorderRequest


async def create_agenda_item(
    db: AsyncSession, data: AgendaItemCreate
) -> AgendaItem:
    item = AgendaItem(**data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


async def get_agenda_item(
    db: AsyncSession, item_id: uuid.UUID
) -> AgendaItem:
    stmt = select(AgendaItem).where(AgendaItem.id == item_id)
    item = (await db.execute(stmt)).scalar_one_or_none()
    if item is None:
        raise NotFoundException("AgendaItem", str(item_id))
    return item


async def list_agenda_items(
    db: AsyncSession, meeting_id: uuid.UUID
) -> Tuple[List[AgendaItem], int]:
    count_stmt = (
        select(func.count())
        .select_from(AgendaItem)
        .where(AgendaItem.meeting_id == meeting_id)
    )
    total: int = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(AgendaItem)
        .where(AgendaItem.meeting_id == meeting_id)
        .order_by(AgendaItem.order_index.asc())
    )
    result = await db.execute(stmt)
    return result.scalars().all(), total


async def update_agenda_item(
    db: AsyncSession,
    item_id: uuid.UUID,
    data: AgendaItemUpdate,
) -> AgendaItem:
    item = await get_agenda_item(db, item_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.flush()
    await db.refresh(item)
    return item


async def delete_agenda_item(db: AsyncSession, item_id: uuid.UUID) -> None:
    item = await get_agenda_item(db, item_id)
    await db.delete(item)
    await db.flush()


async def reorder_agenda_items(
    db: AsyncSession,
    meeting_id: uuid.UUID,
    payload: AgendaReorderRequest,
) -> List[AgendaItem]:
    """
    Applies a drag-and-drop reorder: sets order_index = position in the
    incoming list. Validates that all IDs belong to the given meeting.
    """
    stmt = select(AgendaItem).where(AgendaItem.meeting_id == meeting_id)
    existing_items: List[AgendaItem] = (await db.execute(stmt)).scalars().all()
    existing_ids = {item.id for item in existing_items}
    item_map = {item.id: item for item in existing_items}

    # Validate all supplied IDs belong to this meeting
    for supplied_id in payload.ordered_ids:
        if supplied_id not in existing_ids:
            raise ConflictException(
                f"AgendaItem '{supplied_id}' does not belong to meeting '{meeting_id}'."
            )

    for new_index, item_id in enumerate(payload.ordered_ids):
        item_map[item_id].order_index = new_index

    await db.flush()

    stmt = (
        select(AgendaItem)
        .where(AgendaItem.meeting_id == meeting_id)
        .order_by(AgendaItem.order_index.asc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()
