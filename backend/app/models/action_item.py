from __future__ import annotations

import enum
import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Date, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.agenda import AgendaItem
    from app.models.participant import Participant


class ActionPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ActionStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"


class ActionItem(Base):
    """
    An actionable task captured during a meeting.
    Supports 1-click promotion to an external task system via task_id.
    All AI-extracted action items link back to an AIProcessingJob for traceability.
    """

    __tablename__ = "action_items"

    # ── Foreign Keys ──────────────────────────────────────────────────────────
    meeting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    agenda_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agenda_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ── Content ───────────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Classification ────────────────────────────────────────────────────────
    priority: Mapped[ActionPriority] = mapped_column(
        Enum(ActionPriority, name="action_priority_enum"),
        nullable=False,
        default=ActionPriority.MEDIUM,
        index=True,
    )
    status: Mapped[ActionStatus] = mapped_column(
        Enum(ActionStatus, name="action_status_enum"),
        nullable=False,
        default=ActionStatus.OPEN,
        index=True,
    )

    # ── Scheduling ────────────────────────────────────────────────────────────
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # ── Task Integration ──────────────────────────────────────────────────────
    converted_to_task: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )
    # Opaque reference to the external project task (e.g. Jira, Linear, xone-tasks)
    external_task_id: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    external_task_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)

    # ── AI Provenance ─────────────────────────────────────────────────────────
    # Set when this item was auto-extracted by the AI pipeline
    source_ai_job_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_processing_jobs.id", ondelete="SET NULL"),
        nullable=True,
    )
    ai_confidence_score: Mapped[Optional[float]] = mapped_column(nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="action_items")
    agenda_item: Mapped[Optional["AgendaItem"]] = relationship(
        "AgendaItem", back_populates="action_items"
    )
    assignee: Mapped[Optional["Participant"]] = relationship("Participant")
