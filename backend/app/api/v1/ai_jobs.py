from __future__ import annotations

import asyncio
import uuid
from typing import Annotated, List

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, get_db
from app.schemas.ai_job import AIJobCreate, AIJobResponse, AIJobStatusResponse
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["AI Processing"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.post(
    "/jobs",
    response_model=AIJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def enqueue_ai_job(
    data: AIJobCreate,
    background_tasks: BackgroundTasks,
    db: DB,
) -> AIJobResponse:
    """
    Enqueues an async Ollama processing job. Returns immediately with the
    job record (status=QUEUED). Poll GET /ai/jobs/{id}/status to track progress.
    """
    job = await ai_service.enqueue_job(db, data)
    await db.commit()  # commit before background task reads the job

    # Fire-and-forget background coroutine
    background_tasks.add_task(
        asyncio.ensure_future,
        ai_service.process_job(job.id, AsyncSessionLocal),
    )
    return AIJobResponse.model_validate(job)


@router.get("/jobs/{job_id}", response_model=AIJobResponse)
async def get_ai_job(job_id: uuid.UUID, db: DB) -> AIJobResponse:
    """Returns the full job record including output_json when completed."""
    job = await ai_service.get_job(db, job_id)
    return AIJobResponse.model_validate(job)


@router.get("/jobs/{job_id}/status", response_model=AIJobStatusResponse)
async def get_ai_job_status(job_id: uuid.UUID, db: DB) -> AIJobStatusResponse:
    """Lightweight status poll — does not return large output_json payload."""
    job = await ai_service.get_job(db, job_id)
    return AIJobStatusResponse(
        id=job.id,
        status=job.status,
        duration_ms=job.duration_ms,
        error_message=job.error_message,
    )


@router.get("/jobs/meeting/{meeting_id}", response_model=List[AIJobResponse])
async def list_jobs_for_meeting(
    meeting_id: uuid.UUID, db: DB
) -> List[AIJobResponse]:
    jobs = await ai_service.list_jobs_for_meeting(db, meeting_id)
    return [AIJobResponse.model_validate(j) for j in jobs]
