from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.mom_signoff import (
    MoMSignOffCreate,
    MoMSignOffResponse,
    MoMSignOffStatusResponse,
)
from app.services import mom_signoff_service

router = APIRouter(prefix="/mom", tags=["Minutes of Meeting"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.post("/signoff", response_model=MoMSignOffResponse, status_code=status.HTTP_201_CREATED)
async def create_signoff(data: MoMSignOffCreate, db: DB) -> MoMSignOffResponse:
    """
    Records a digital sign-off. Generates a SHA-256 audit hash binding
    meeting_id, participant_id, timestamp, and note_version.
    """
    signoff = await mom_signoff_service.create_signoff(db, data)
    return MoMSignOffResponse.model_validate(signoff)


@router.get("/meeting/{meeting_id}/status", response_model=MoMSignOffStatusResponse)
async def get_signoff_status(
    meeting_id: uuid.UUID, db: DB
) -> MoMSignOffStatusResponse:
    """Returns a governance dashboard summary: who has/hasn't signed off."""
    status_data = await mom_signoff_service.get_signoff_status(db, meeting_id)
    return MoMSignOffStatusResponse(
        meeting_id=status_data["meeting_id"],
        total_participants=status_data["total_participants"],
        signed_count=status_data["signed_count"],
        pending_count=status_data["pending_count"],
        all_approved=status_data["all_approved"],
        signoffs=[MoMSignOffResponse.model_validate(s) for s in status_data["signoffs"]],
    )
