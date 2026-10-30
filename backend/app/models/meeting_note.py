from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING, Any, Dict, Optional

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.meeting import Meeting


class NoteType(str, enum.Enum):
    LIVE_NOTES = "live_notes"       # Real-time collaborative Yjs document
    MINUTES_OF_MEETING = "mom"      # Finalised MoM document
    TRANSCRIPT = "transcript"       # Raw transcript text
    AI_SUMMARY = "ai_summary"       # AI-generated summary


class MeetingNote(Base):
    """
    Stores TipTap/Yjs document state for a given meeting and note type.
    Each (meeting_id, note_type) pair has at most one active document;
    historical versions are tracked via the `version` integer column and
    an append-only audit approach handled at the API layer.
    """

    __tablename__ = "meeting_notes"

    # ── Foreign Keys ──────────────────────────────────────────────────────────
    meeting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Classification ────────────────────────────────────────────────────────
    note_type: Mapped[NoteType] = mapped_column(
        Enum(NoteType, name="note_type_enum"),
        nullable=False,
        default=NoteType.LIVE_NOTES,
        index=True,
    )

    # ── Content ───────────────────────────────────────────────────────────────
    # Full TipTap ProseMirror JSON document — used as the source of truth
    content_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True
    )
    # Pre-rendered HTML for read-only views / PDF export (derived from content_json)
    content_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Plain text representation for AI processing
    content_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Versioning ────────────────────────────────────────────────────────────
    # Monotonically increasing; bumped on every save — used for optimistic locking
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # ── Authorship ────────────────────────────────────────────────────────────
    created_by: Mapped[str] = mapped_column(String(128), nullable=False)
    last_edited_by: Mapped[str] = mapped_column(String(128), nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="notes")
