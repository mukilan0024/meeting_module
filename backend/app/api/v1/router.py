from fastapi import APIRouter
from app.core.config import get_settings

settings = get_settings()
api_router = APIRouter(prefix="/api/v1")

if settings.USE_MOCK_DATA:
    from app.api.v1.mock_router import mock_api_router
    api_router.include_router(mock_api_router)
else:
    from app.api.v1 import (
        action_items,
        agenda,
        ai_jobs,
        meetings,
        mom_signoff,
        notes,
        participants,
    )
    api_router.include_router(meetings.router)
    api_router.include_router(participants.router)
    api_router.include_router(agenda.router)
    api_router.include_router(action_items.router)
    api_router.include_router(notes.router)
    api_router.include_router(mom_signoff.router)
    api_router.include_router(ai_jobs.router)
