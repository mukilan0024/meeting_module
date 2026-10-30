from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.meeting import Meeting


class AIJobType(str, enum.Enum):
    SUMMARIZE = "summarize"
    EXTRACT_ACTIONS = "extract_actions"
    FULL_PIPELINE = "full_pipeline"       # Summary + action extraction in one shot
    SENTIMENT_ANALYSIS = "sentiment_analysis"


class AIJobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AIProcessingJob(Base):
    """
    Tracks asynchronous Ollama LLM jobs.
    Jobs are enqueued by the API, processed by a background worker,
    and their output stored here. Linked action items reference this
    table for full AI provenance.
    """

    __tablename__ = "ai_processing_jobs"

    # ── Foreign Keys ──────────────────────────────────────────────────────────
    meeting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Job Classification ────────────────────────────────────────────────────
    job_type: Mapped[AIJobType] = mapped_column(
        Enum(AIJobType, name="ai_job_type_enum"),
        nullable=False,
        index=True,
    )
    status: Mapped[AIJobStatus] = mapped_column(
        Enum(AIJobStatus, name="ai_job_status_enum"),
        nullable=False,
        default=AIJobStatus.QUEUED,
        index=True,
    )

    # ── Payload ───────────────────────────────────────────────────────────────
    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    # Structured output from the LLM (summary, extracted actions, etc.)
    output_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Model Metadata ────────────────────────────────────────────────────────
    model_used: Mapped[str] = mapped_column(
        String(128), nullable=False, default="qwen2.5:7b-instruct"
    )
    prompt_tokens: Mapped[Optional[int]] = mapped_column(nullable=True)
    completion_tokens: Mapped[Optional[int]] = mapped_column(nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(nullable=True)

    # ── Timing ────────────────────────────────────────────────────────────────
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="ai_jobs")
