"""
models/__init__.py
Aggregates all ORM models so Alembic's env.py can import Base.metadata
from a single location and detect all tables automatically.
"""

from app.models.base import Base  # noqa: F401 — must be first
from app.models.meeting import Meeting, MeetingStatus, MeetingType  # noqa: F401
from app.models.participant import Participant, ParticipantRole, ParticipantStatus  # noqa: F401
from app.models.agenda import AgendaItem, AgendaItemStatus  # noqa: F401
from app.models.action_item import ActionItem, ActionPriority, ActionStatus  # noqa: F401
from app.models.meeting_note import MeetingNote, NoteType  # noqa: F401
from app.models.mom_signoff import MoMSignOff  # noqa: F401
from app.models.ai_job import AIProcessingJob, AIJobStatus, AIJobType  # noqa: F401

__all__ = [
    "Base",
    "Meeting", "MeetingStatus", "MeetingType",
    "Participant", "ParticipantRole", "ParticipantStatus",
    "AgendaItem", "AgendaItemStatus",
    "ActionItem", "ActionPriority", "ActionStatus",
    "MeetingNote", "NoteType",
    "MoMSignOff",
    "AIProcessingJob", "AIJobStatus", "AIJobType",
]
