from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.participant import Participant
    from app.models.action_item import ActionItem


class AgendaItemStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    DEFERRED = "deferred"


class AgendaItem(Base):
    """
    A single timeboxed agenda entry within a meeting.
    Items are ordered by order_index and can be reordered via drag-and-drop;
    the API updates order_index in bulk on reorder events.
    """

    __tablename__ = "agenda_items"

    # ── Foreign Keys ──────────────────────────────────────────────────────────
    meeting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    presenter_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participants.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Content ───────────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Scheduling ────────────────────────────────────────────────────────────
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Execution ─────────────────────────────────────────────────────────────
    status: Mapped[AgendaItemStatus] = mapped_column(
        Enum(AgendaItemStatus, name="agenda_item_status_enum"),
        nullable=False,
        default=AgendaItemStatus.PENDING,
    )
    actual_duration_minutes: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    facilitator_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="agenda_items")
    presenter: Mapped[Optional["Participant"]] = relationship(
        "Participant",
        back_populates="presented_agenda_items",
        foreign_keys=[presenter_id],
    )
    action_items: Mapped[List["ActionItem"]] = relationship(
        "ActionItem",
        back_populates="agenda_item",
        cascade="all, delete-orphan",
    )
