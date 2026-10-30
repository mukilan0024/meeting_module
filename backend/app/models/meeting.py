from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.agenda import AgendaItem
    from app.models.action_item import ActionItem
    from app.models.meeting_note import MeetingNote
    from app.models.mom_signoff import MoMSignOff
    from app.models.participant import Participant
    from app.models.ai_job import AIProcessingJob


class MeetingType(str, enum.Enum):
    STANDUP = "standup"
    PLANNING = "planning"
    REVIEW = "review"
    RETROSPECTIVE = "retrospective"
    ONE_ON_ONE = "one_on_one"
    GENERAL = "general"
    WORKSHOP = "workshop"
    CLIENT_CALL = "client_call"


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    POSTPONED = "postponed"


class Meeting(Base):
    """
    Core meeting entity. Stores all scheduling metadata, recurrence rules
    (RFC 5545 RRULE strings), and virtual/physical location data.
    """

    __tablename__ = "meetings"

    # ── Identity ─────────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Classification ────────────────────────────────────────────────────────
    meeting_type: Mapped[MeetingType] = mapped_column(
        Enum(MeetingType, name="meeting_type_enum"),
        nullable=False,
        default=MeetingType.GENERAL,
    )
    status: Mapped[MeetingStatus] = mapped_column(
        Enum(MeetingStatus, name="meeting_status_enum"),
        nullable=False,
        default=MeetingStatus.SCHEDULED,
        index=True,
    )

    # ── Scheduling ────────────────────────────────────────────────────────────
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    timezone: Mapped[str] = mapped_column(
        String(64), nullable=False, default="UTC"
    )

    # RFC 5545 RRULE string — None means non-recurring
    recurrence_rule: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Parent meeting UUID for recurring instances
    recurrence_parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ── Location ──────────────────────────────────────────────────────────────
    physical_location: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    meeting_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    conference_id: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    # ── Ownership ─────────────────────────────────────────────────────────────
    # References an external user/auth system; no FK to keep the module portable
    created_by: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    project_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    participants: Mapped[List["Participant"]] = relationship(
        "Participant", back_populates="meeting", cascade="all, delete-orphan"
    )
    agenda_items: Mapped[List["AgendaItem"]] = relationship(
        "AgendaItem",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="AgendaItem.order_index",
    )
    action_items: Mapped[List["ActionItem"]] = relationship(
        "ActionItem", back_populates="meeting", cascade="all, delete-orphan"
    )
    notes: Mapped[List["MeetingNote"]] = relationship(
        "MeetingNote", back_populates="meeting", cascade="all, delete-orphan"
    )
    mom_signoffs: Mapped[List["MoMSignOff"]] = relationship(
        "MoMSignOff", back_populates="meeting", cascade="all, delete-orphan"
    )
    ai_jobs: Mapped[List["AIProcessingJob"]] = relationship(
        "AIProcessingJob", back_populates="meeting", cascade="all, delete-orphan"
    )
    child_occurrences: Mapped[List["Meeting"]] = relationship(
        "Meeting", foreign_keys=[recurrence_parent_id]
    )
