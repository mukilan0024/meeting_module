from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.participant import Participant


class MoMSignOff(Base):
    """
    Records a digital sign-off by a participant on the Minutes of Meeting.
    The signature_hash provides a tamper-evident audit trail:
      SHA-256( meeting_id || participant_id || signed_at_iso || content_version )
    Once signed, the record is immutable — revisions require a new sign-off row.
    """

    __tablename__ = "mom_signoffs"

    # ── Foreign Keys ──────────────────────────────────────────────────────────
    meeting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    participant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Sign-Off Data ─────────────────────────────────────────────────────────
    signed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    # SHA-256 hash as hex string (64 chars)
    signature_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    # Version of the MeetingNote document this sign-off applies to
    note_version: Mapped[int] = mapped_column(nullable=False)

    # ── Decision ──────────────────────────────────────────────────────────────
    is_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Reviewer comments or objections (required when is_approved=False)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── PDF Export ────────────────────────────────────────────────────────────
    # Relative path inside PDF_OUTPUT_DIR after the signed PDF is generated
    pdf_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    pdf_generated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="mom_signoffs")
    participant: Mapped["Participant"] = relationship(
        "Participant", back_populates="signoffs"
    )
