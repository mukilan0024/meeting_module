from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.agenda import AgendaItem
    from app.models.mom_signoff import MoMSignOff


class ParticipantRole(str, enum.Enum):
    ORGANIZER = "organizer"
    PRESENTER = "presenter"
    ATTENDEE = "attendee"
    OPTIONAL = "optional"
    GUEST = "guest"


class ParticipantStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    TENTATIVE = "tentative"
    NO_RESPONSE = "no_response"


class Participant(Base):
    """
    Links a user (identified by external user_id) to a specific meeting.
    Tracks RSVP status, role, and actual attendance window.
    """

    __tablename__ = "participants"

    # ── Foreign Keys ──────────────────────────────────────────────────────────
    meeting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── User Identity (external auth system reference) ────────────────────────
    user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    user_email: Mapped[str] = mapped_column(String(320), nullable=False)
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)

    # ── Role & RSVP ───────────────────────────────────────────────────────────
    role: Mapped[ParticipantRole] = mapped_column(
        Enum(ParticipantRole, name="participant_role_enum"),
        nullable=False,
        default=ParticipantRole.ATTENDEE,
    )
    status: Mapped[ParticipantStatus] = mapped_column(
        Enum(ParticipantStatus, name="participant_status_enum"),
        nullable=False,
        default=ParticipantStatus.PENDING,
        index=True,
    )

    # ── Attendance Tracking ───────────────────────────────────────────────────
    joined_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    left_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="participants")
    presented_agenda_items: Mapped[List["AgendaItem"]] = relationship(
        "AgendaItem", back_populates="presenter", foreign_keys="AgendaItem.presenter_id"
    )
    signoffs: Mapped[List["MoMSignOff"]] = relationship(
        "MoMSignOff", back_populates="participant"
    )
