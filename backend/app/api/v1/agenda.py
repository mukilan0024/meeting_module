from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.agenda import (
    AgendaItemCreate,
    AgendaItemResponse,
    AgendaItemUpdate,
    AgendaListResponse,
    AgendaReorderRequest,
)
from app.services import agenda_service

router = APIRouter(prefix="/agenda", tags=["Agenda"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.post("/", response_model=AgendaItemResponse, status_code=status.HTTP_201_CREATED)
async def create_agenda_item(data: AgendaItemCreate, db: DB) -> AgendaItemResponse:
    item = await agenda_service.create_agenda_item(db, data)
    return AgendaItemResponse.model_validate(item)


@router.get("/meeting/{meeting_id}", response_model=AgendaListResponse)
async def list_agenda_items(meeting_id: uuid.UUID, db: DB) -> AgendaListResponse:
    items, total = await agenda_service.list_agenda_items(db, meeting_id)
    return AgendaListResponse(
        total=total,
        items=[AgendaItemResponse.model_validate(i) for i in items],
    )


@router.get("/{item_id}", response_model=AgendaItemResponse)
async def get_agenda_item(item_id: uuid.UUID, db: DB) -> AgendaItemResponse:
    item = await agenda_service.get_agenda_item(db, item_id)
    return AgendaItemResponse.model_validate(item)


@router.patch("/{item_id}", response_model=AgendaItemResponse)
async def update_agenda_item(
    item_id: uuid.UUID, data: AgendaItemUpdate, db: DB
) -> AgendaItemResponse:
    item = await agenda_service.update_agenda_item(db, item_id, data)
    return AgendaItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agenda_item(item_id: uuid.UUID, db: DB) -> None:
    await agenda_service.delete_agenda_item(db, item_id)


@router.put("/meeting/{meeting_id}/reorder", response_model=AgendaListResponse)
async def reorder_agenda_items(
    meeting_id: uuid.UUID, payload: AgendaReorderRequest, db: DB
) -> AgendaListResponse:
    items = await agenda_service.reorder_agenda_items(db, meeting_id, payload)
    return AgendaListResponse(
        total=len(items),
        items=[AgendaItemResponse.model_validate(i) for i in items],
    )
