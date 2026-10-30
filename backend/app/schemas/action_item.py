from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.action_item import ActionPriority, ActionStatus


class ActionItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    description: Optional[str] = Field(default=None, max_length=4000)
    assignee_id: Optional[uuid.UUID] = None
    priority: ActionPriority = ActionPriority.MEDIUM
    due_date: Optional[date] = None


class ActionItemCreate(ActionItemBase):
    meeting_id: uuid.UUID
    agenda_item_id: Optional[uuid.UUID] = None


class ActionItemUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=512)
    description: Optional[str] = None
    assignee_id: Optional[uuid.UUID] = None
    priority: Optional[ActionPriority] = None
    status: Optional[ActionStatus] = None
    due_date: Optional[date] = None


class TaskConversionRequest(BaseModel):
    """
    Payload for promoting an action item to an external task.
    The API will write external_task_id + url back to the row.
    """
    external_task_id: str = Field(..., min_length=1, max_length=256)
    external_task_url: Optional[str] = Field(default=None, max_length=2048)


class ActionItemResponse(ActionItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    agenda_item_id: Optional[uuid.UUID] = None
    status: ActionStatus
    converted_to_task: bool
    external_task_id: Optional[str] = None
    external_task_url: Optional[str] = None
    source_ai_job_id: Optional[uuid.UUID] = None
    ai_confidence_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class ActionItemListResponse(BaseModel):
    total: int
    items: List[ActionItemResponse]
