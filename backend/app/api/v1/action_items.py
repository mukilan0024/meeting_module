from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.action_item import ActionStatus
from app.schemas.action_item import (
    ActionItemCreate,
    ActionItemListResponse,
    ActionItemResponse,
    ActionItemUpdate,
    TaskConversionRequest,
)
from app.services import action_item_service

router = APIRouter(prefix="/action-items", tags=["Action Items"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.post("/", response_model=ActionItemResponse, status_code=status.HTTP_201_CREATED)
async def create_action_item(data: ActionItemCreate, db: DB) -> ActionItemResponse:
    item = await action_item_service.create_action_item(db, data)
    return ActionItemResponse.model_validate(item)


@router.get("/meeting/{meeting_id}", response_model=ActionItemListResponse)
async def list_action_items(
    meeting_id: uuid.UUID,
    db: DB,
    assignee_id: Optional[uuid.UUID] = Query(default=None),
    status: Optional[ActionStatus] = Query(default=None),
    converted_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> ActionItemListResponse:
    items, total = await action_item_service.list_action_items(
        db,
        meeting_id,
        assignee_id=assignee_id,
        status=status,
        converted_only=converted_only,
        page=page,
        page_size=page_size,
    )
    return ActionItemListResponse(
        total=total,
        items=[ActionItemResponse.model_validate(i) for i in items],
    )


@router.get("/{item_id}", response_model=ActionItemResponse)
async def get_action_item(item_id: uuid.UUID, db: DB) -> ActionItemResponse:
    item = await action_item_service.get_action_item(db, item_id)
    return ActionItemResponse.model_validate(item)


@router.patch("/{item_id}", response_model=ActionItemResponse)
async def update_action_item(
    item_id: uuid.UUID, data: ActionItemUpdate, db: DB
) -> ActionItemResponse:
    item = await action_item_service.update_action_item(db, item_id, data)
    return ActionItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_action_item(item_id: uuid.UUID, db: DB) -> None:
    await action_item_service.delete_action_item(db, item_id)


@router.post("/{item_id}/convert-to-task", response_model=ActionItemResponse)
async def convert_to_task(
    item_id: uuid.UUID, data: TaskConversionRequest, db: DB
) -> ActionItemResponse:
    """Promotes an action item to an external project task (1-click conversion)."""
    item = await action_item_service.convert_to_task(db, item_id, data)
    return ActionItemResponse.model_validate(item)
