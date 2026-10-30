from __future__ import annotations

import uuid
from typing import List, Optional, Tuple

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.action_item import ActionItem, ActionStatus
from app.schemas.action_item import (
    ActionItemCreate,
    ActionItemUpdate,
    TaskConversionRequest,
)


async def create_action_item(
    db: AsyncSession, data: ActionItemCreate
) -> ActionItem:
    item = ActionItem(**data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


async def get_action_item(
    db: AsyncSession, item_id: uuid.UUID
) -> ActionItem:
    stmt = select(ActionItem).where(ActionItem.id == item_id)
    item = (await db.execute(stmt)).scalar_one_or_none()
    if item is None:
        raise NotFoundException("ActionItem", str(item_id))
    return item


async def list_action_items(
    db: AsyncSession,
    meeting_id: uuid.UUID,
    *,
    assignee_id: Optional[uuid.UUID] = None,
    status: Optional[ActionStatus] = None,
    converted_only: bool = False,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[List[ActionItem], int]:
    filters = [ActionItem.meeting_id == meeting_id]
    if assignee_id:
        filters.append(ActionItem.assignee_id == assignee_id)
    if status:
        filters.append(ActionItem.status == status)
    if converted_only:
        filters.append(ActionItem.converted_to_task.is_(True))

    count_stmt = (
        select(func.count()).select_from(ActionItem).where(and_(*filters))
    )
    total: int = (await db.execute(count_stmt)).scalar_one()

    offset = (page - 1) * page_size
    stmt = (
        select(ActionItem)
        .where(and_(*filters))
        .order_by(ActionItem.created_at.asc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    return result.scalars().all(), total


async def update_action_item(
    db: AsyncSession,
    item_id: uuid.UUID,
    data: ActionItemUpdate,
) -> ActionItem:
    item = await get_action_item(db, item_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.flush()
    await db.refresh(item)
    return item


async def delete_action_item(db: AsyncSession, item_id: uuid.UUID) -> None:
    item = await get_action_item(db, item_id)
    await db.delete(item)
    await db.flush()


async def convert_to_task(
    db: AsyncSession,
    item_id: uuid.UUID,
    data: TaskConversionRequest,
) -> ActionItem:
    item = await get_action_item(db, item_id)
    if item.converted_to_task:
        raise ConflictException(
            f"ActionItem '{item_id}' has already been converted to task '{item.external_task_id}'."
        )
    item.converted_to_task = True
    item.external_task_id = data.external_task_id
    item.external_task_url = data.external_task_url
    item.status = ActionStatus.IN_PROGRESS
    await db.flush()
    await db.refresh(item)
    return item
