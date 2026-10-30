"""Initial schema — all meeting module tables

Revision ID: 0001
Revises:
Create Date: 2026-10-23 00:00:00.000000+00:00

Creates:
  - meetings
  - participants
  - agenda_items
  - action_items
  - meeting_notes
  - mom_signoffs
  - ai_processing_jobs

All tables use gen_random_uuid() as PK default (available in PostgreSQL 13+).
All timestamps are TIMESTAMPTZ (UTC).
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enum types ────────────────────────────────────────────────────────────
    meeting_type_enum = postgresql.ENUM(
        "standup", "planning", "review", "retrospective",
        "one_on_one", "general", "workshop", "client_call",
        name="meeting_type_enum",
    )
    meeting_status_enum = postgresql.ENUM(
        "scheduled", "in_progress", "completed", "cancelled", "postponed",
        name="meeting_status_enum",
    )
    participant_role_enum = postgresql.ENUM(
        "organizer", "presenter", "attendee", "optional", "guest",
        name="participant_role_enum",
    )
    participant_status_enum = postgresql.ENUM(
        "pending", "accepted", "declined", "tentative", "no_response",
        name="participant_status_enum",
    )
    agenda_item_status_enum = postgresql.ENUM(
        "pending", "in_progress", "completed", "skipped", "deferred",
        name="agenda_item_status_enum",
    )
    action_priority_enum = postgresql.ENUM(
        "low", "medium", "high", "critical",
        name="action_priority_enum",
    )
    action_status_enum = postgresql.ENUM(
        "open", "in_progress", "completed", "cancelled", "blocked",
        name="action_status_enum",
    )
    note_type_enum = postgresql.ENUM(
        "live_notes", "mom", "transcript", "ai_summary",
        name="note_type_enum",
    )
    ai_job_type_enum = postgresql.ENUM(
        "summarize", "extract_actions", "full_pipeline", "sentiment_analysis",
        name="ai_job_type_enum",
    )
    ai_job_status_enum = postgresql.ENUM(
        "queued", "processing", "completed", "failed", "cancelled",
        name="ai_job_status_enum",
    )

    for enum in [
        meeting_type_enum, meeting_status_enum,
        participant_role_enum, participant_status_enum,
        agenda_item_status_enum,
        action_priority_enum, action_status_enum,
        note_type_enum,
        ai_job_type_enum, ai_job_status_enum,
    ]:
        enum.create(op.get_bind(), checkfirst=True)

    # ── meetings ──────────────────────────────────────────────────────────────
    op.create_table(
        "meetings",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("meeting_type", sa.Enum("standup", "planning", "review", "retrospective", "one_on_one", "general", "workshop", "client_call", name="meeting_type_enum"), nullable=False, server_default="general"),
        sa.Column("status", sa.Enum("scheduled", "in_progress", "completed", "cancelled", "postponed", name="meeting_status_enum"), nullable=False, server_default="scheduled"),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
        sa.Column("recurrence_rule", sa.String(512), nullable=True),
        sa.Column("recurrence_parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("meetings.id", ondelete="SET NULL"), nullable=True),
        sa.Column("physical_location", sa.String(512), nullable=True),
        sa.Column("meeting_url", sa.String(2048), nullable=True),
        sa.Column("conference_id", sa.String(256), nullable=True),
        sa.Column("created_by", sa.String(128), nullable=False),
        sa.Column("project_id", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_meetings_title", "meetings", ["title"])
    op.create_index("ix_meetings_status", "meetings", ["status"])
    op.create_index("ix_meetings_start_time", "meetings", ["start_time"])
    op.create_index("ix_meetings_created_by", "meetings", ["created_by"])
    op.create_index("ix_meetings_project_id", "meetings", ["project_id"])
    op.create_index("ix_meetings_recurrence_parent_id", "meetings", ["recurrence_parent_id"])

    # ── participants ──────────────────────────────────────────────────────────
    op.create_table(
        "participants",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(128), nullable=False),
        sa.Column("user_email", sa.String(320), nullable=False),
        sa.Column("user_name", sa.String(255), nullable=False),
        sa.Column("avatar_url", sa.String(2048), nullable=True),
        sa.Column("role", sa.Enum("organizer", "presenter", "attendee", "optional", "guest", name="participant_role_enum"), nullable=False, server_default="attendee"),
        sa.Column("status", sa.Enum("pending", "accepted", "declined", "tentative", "no_response", name="participant_status_enum"), nullable=False, server_default="pending"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("left_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_participants_meeting_id", "participants", ["meeting_id"])
    op.create_index("ix_participants_user_id", "participants", ["user_id"])
    op.create_index("ix_participants_status", "participants", ["status"])

    # ── agenda_items ──────────────────────────────────────────────────────────
    op.create_table(
        "agenda_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("presenter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("participants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("duration_minutes", sa.Integer, nullable=False, server_default="15"),
        sa.Column("order_index", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", sa.Enum("pending", "in_progress", "completed", "skipped", "deferred", name="agenda_item_status_enum"), nullable=False, server_default="pending"),
        sa.Column("actual_duration_minutes", sa.Integer, nullable=True),
        sa.Column("facilitator_notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_agenda_items_meeting_id", "agenda_items", ["meeting_id"])

    # ── ai_processing_jobs (created before action_items for FK) ───────────────
    op.create_table(
        "ai_processing_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_type", sa.Enum("summarize", "extract_actions", "full_pipeline", "sentiment_analysis", name="ai_job_type_enum"), nullable=False),
        sa.Column("status", sa.Enum("queued", "processing", "completed", "failed", "cancelled", name="ai_job_status_enum"), nullable=False, server_default="queued"),
        sa.Column("input_text", sa.Text, nullable=False),
        sa.Column("output_json", postgresql.JSONB, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("model_used", sa.String(128), nullable=False, server_default="qwen2.5:7b-instruct"),
        sa.Column("prompt_tokens", sa.Integer, nullable=True),
        sa.Column("completion_tokens", sa.Integer, nullable=True),
        sa.Column("duration_ms", sa.Integer, nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_ai_jobs_meeting_id", "ai_processing_jobs", ["meeting_id"])
    op.create_index("ix_ai_jobs_status", "ai_processing_jobs", ["status"])
    op.create_index("ix_ai_jobs_job_type", "ai_processing_jobs", ["job_type"])

    # ── action_items ──────────────────────────────────────────────────────────
    op.create_table(
        "action_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("agenda_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agenda_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assignee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("participants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("source_ai_job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_processing_jobs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("priority", sa.Enum("low", "medium", "high", "critical", name="action_priority_enum"), nullable=False, server_default="medium"),
        sa.Column("status", sa.Enum("open", "in_progress", "completed", "cancelled", "blocked", name="action_status_enum"), nullable=False, server_default="open"),
        sa.Column("due_date", sa.Date, nullable=True),
        sa.Column("converted_to_task", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("external_task_id", sa.String(256), nullable=True),
        sa.Column("external_task_url", sa.String(2048), nullable=True),
        sa.Column("ai_confidence_score", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_action_items_meeting_id", "action_items", ["meeting_id"])
    op.create_index("ix_action_items_agenda_item_id", "action_items", ["agenda_item_id"])
    op.create_index("ix_action_items_assignee_id", "action_items", ["assignee_id"])
    op.create_index("ix_action_items_priority", "action_items", ["priority"])
    op.create_index("ix_action_items_status", "action_items", ["status"])
    op.create_index("ix_action_items_converted", "action_items", ["converted_to_task"])

    # ── meeting_notes ─────────────────────────────────────────────────────────
    op.create_table(
        "meeting_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("note_type", sa.Enum("live_notes", "mom", "transcript", "ai_summary", name="note_type_enum"), nullable=False, server_default="live_notes"),
        sa.Column("content_json", postgresql.JSONB, nullable=True),
        sa.Column("content_html", sa.Text, nullable=True),
        sa.Column("content_text", sa.Text, nullable=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("created_by", sa.String(128), nullable=False),
        sa.Column("last_edited_by", sa.String(128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_meeting_notes_meeting_id", "meeting_notes", ["meeting_id"])
    op.create_index("ix_meeting_notes_note_type", "meeting_notes", ["note_type"])

    # ── mom_signoffs ──────────────────────────────────────────────────────────
    op.create_table(
        "mom_signoffs",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("participant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("participants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("signature_hash", sa.String(64), nullable=False),
        sa.Column("note_version", sa.Integer, nullable=False),
        sa.Column("is_approved", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("comments", sa.Text, nullable=True),
        sa.Column("pdf_path", sa.String(1024), nullable=True),
        sa.Column("pdf_generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_mom_signoffs_meeting_id", "mom_signoffs", ["meeting_id"])
    op.create_index("ix_mom_signoffs_participant_id", "mom_signoffs", ["participant_id"])

    # ── updated_at trigger function ───────────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION trigger_set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    for table in [
        "meetings", "participants", "agenda_items", "action_items",
        "meeting_notes", "mom_signoffs", "ai_processing_jobs",
    ]:
        op.execute(f"""
            CREATE TRIGGER set_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
        """)


def downgrade() -> None:
    # Drop triggers first
    for table in [
        "meetings", "participants", "agenda_items", "action_items",
        "meeting_notes", "mom_signoffs", "ai_processing_jobs",
    ]:
        op.execute(f"DROP TRIGGER IF EXISTS set_{table}_updated_at ON {table};")

    op.execute("DROP FUNCTION IF EXISTS trigger_set_updated_at();")

    # Drop tables in reverse FK dependency order
    op.drop_table("mom_signoffs")
    op.drop_table("meeting_notes")
    op.drop_table("action_items")
    op.drop_table("ai_processing_jobs")
    op.drop_table("agenda_items")
    op.drop_table("participants")
    op.drop_table("meetings")

    # Drop enum types
    for enum_name in [
        "meeting_type_enum", "meeting_status_enum",
        "participant_role_enum", "participant_status_enum",
        "agenda_item_status_enum",
        "action_priority_enum", "action_status_enum",
        "note_type_enum",
        "ai_job_type_enum", "ai_job_status_enum",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name};")
