from __future__ import annotations

import uuid
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

from app.models.agenda import AgendaItemStatus


class AgendaItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    description: Optional[str] = Field(default=None, max_length=4000)
    presenter_id: Optional[uuid.UUID] = None
    duration_minutes: int = Field(default=15, ge=1, le=480)
    order_index: int = Field(default=0, ge=0)
    facilitator_notes: Optional[str] = Field(default=None, max_length=4000)


class AgendaItemCreate(AgendaItemBase):
    meeting_id: uuid.UUID


class AgendaItemUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=512)
    description: Optional[str] = None
    presenter_id: Optional[uuid.UUID] = None
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=480)
    order_index: Optional[int] = Field(default=None, ge=0)
    status: Optional[AgendaItemStatus] = None
    actual_duration_minutes: Optional[int] = Field(default=None, ge=0)
    facilitator_notes: Optional[str] = None


class AgendaReorderRequest(BaseModel):
    """
    Bulk reorder payload.
    Clients send the full ordered list of item IDs after a drag-and-drop operation.
    """
    ordered_ids: List[uuid.UUID] = Field(..., min_length=1)


class AgendaItemResponse(AgendaItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    status: AgendaItemStatus
    actual_duration_minutes: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class AgendaListResponse(BaseModel):
    total: int
    items: List[AgendaItemResponse]
