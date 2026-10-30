from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.meeting import MeetingStatus
from app.schemas.meeting import (
    MeetingConflictResponse,
    MeetingCreate,
    MeetingListResponse,
    MeetingResponse,
    MeetingUpdate,
)
from app.services import meeting_service

router = APIRouter(prefix="/meetings", tags=["Meetings"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(data: MeetingCreate, db: DB) -> MeetingResponse:
    meeting = await meeting_service.create_meeting(db, data)
    return MeetingResponse.model_validate(meeting)


@router.get("/", response_model=MeetingListResponse)
async def list_meetings(
    db: DB,
    created_by: Optional[str] = Query(default=None),
    project_id: Optional[str] = Query(default=None),
    status: Optional[MeetingStatus] = Query(default=None),
    start_after: Optional[datetime] = Query(default=None),
    start_before: Optional[datetime] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> MeetingListResponse:
    meetings, total = await meeting_service.list_meetings(
        db,
        created_by=created_by,
        project_id=project_id,
        status=status,
        start_after=start_after,
        start_before=start_before,
        page=page,
        page_size=page_size,
    )
    return MeetingListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[MeetingResponse.model_validate(m) for m in meetings],
    )


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(meeting_id: uuid.UUID, db: DB) -> MeetingResponse:
    meeting = await meeting_service.get_meeting(db, meeting_id, load_relations=True)
    return MeetingResponse.model_validate(meeting)


@router.patch("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: uuid.UUID, data: MeetingUpdate, db: DB
) -> MeetingResponse:
    meeting = await meeting_service.update_meeting(db, meeting_id, data)
    return MeetingResponse.model_validate(meeting)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(meeting_id: uuid.UUID, db: DB) -> None:
    await meeting_service.delete_meeting(db, meeting_id)


@router.post("/conflicts/check", response_model=MeetingConflictResponse)
async def check_conflicts(
    created_by: str,
    start_time: datetime,
    end_time: datetime,
    db: DB,
    exclude_meeting_id: Optional[uuid.UUID] = None,
) -> MeetingConflictResponse:
    conflicts = await meeting_service.detect_conflicts(
        db,
        created_by=created_by,
        start_time=start_time,
        end_time=end_time,
        exclude_meeting_id=exclude_meeting_id,
    )
    return MeetingConflictResponse(
        has_conflict=len(conflicts) > 0,
        conflicting_meetings=[MeetingResponse.model_validate(m) for m in conflicts],
    )
