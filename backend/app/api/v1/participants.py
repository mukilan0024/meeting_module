from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.participant import (
    ParticipantAttendanceUpdate,
    ParticipantCreate,
    ParticipantListResponse,
    ParticipantResponse,
    ParticipantUpdate,
)
from app.services import participant_service

router = APIRouter(prefix="/participants", tags=["Participants"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.post("/", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED)
async def add_participant(data: ParticipantCreate, db: DB) -> ParticipantResponse:
    participant = await participant_service.add_participant(db, data)
    return ParticipantResponse.model_validate(participant)


@router.get("/meeting/{meeting_id}", response_model=ParticipantListResponse)
async def list_participants(meeting_id: uuid.UUID, db: DB) -> ParticipantListResponse:
    participants, total = await participant_service.list_participants(db, meeting_id)
    return ParticipantListResponse(
        total=total,
        items=[ParticipantResponse.model_validate(p) for p in participants],
    )


@router.get("/{participant_id}", response_model=ParticipantResponse)
async def get_participant(participant_id: uuid.UUID, db: DB) -> ParticipantResponse:
    participant = await participant_service.get_participant(db, participant_id)
    return ParticipantResponse.model_validate(participant)


@router.patch("/{participant_id}", response_model=ParticipantResponse)
async def update_participant(
    participant_id: uuid.UUID, data: ParticipantUpdate, db: DB
) -> ParticipantResponse:
    participant = await participant_service.update_participant(db, participant_id, data)
    return ParticipantResponse.model_validate(participant)


@router.patch("/{participant_id}/attendance", response_model=ParticipantResponse)
async def update_attendance(
    participant_id: uuid.UUID, data: ParticipantAttendanceUpdate, db: DB
) -> ParticipantResponse:
    participant = await participant_service.update_attendance(db, participant_id, data)
    return ParticipantResponse.model_validate(participant)


@router.delete("/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_participant(participant_id: uuid.UUID, db: DB) -> None:
    await participant_service.remove_participant(db, participant_id)
