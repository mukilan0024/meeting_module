from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _fmt(dt: datetime) -> str:
    return dt.isoformat()


def _make_sha256(val: str) -> str:
    return hashlib.sha256(val.encode("utf-8")).hexdigest()


class MockStore:
    def __init__(self) -> None:
        self.meetings: Dict[str, Dict[str, Any]] = {}
        self.participants: Dict[str, Dict[str, Any]] = {}
        self.agenda_items: Dict[str, Dict[str, Any]] = {}
        self.action_items: Dict[str, Dict[str, Any]] = {}
        self.notes: Dict[Tuple[str, str], Dict[str, Any]] = {}  # (meeting_id, note_type) -> note
        self.signoffs: Dict[str, Dict[str, Any]] = {}  # signoff_id -> signoff
        self.ai_jobs: Dict[str, Dict[str, Any]] = {}
        self.seed_data()

    def seed_data(self) -> None:
        now = _now()
        # Clean current state
        self.meetings.clear()
        self.participants.clear()
        self.agenda_items.clear()
        self.action_items.clear()
        self.notes.clear()
        self.signoffs.clear()
        self.ai_jobs.clear()

        # ── Meeting 1: Happening Right Now (Active) ──────────────────────────
        m1_id = "00000000-0000-4000-8000-000000000001"
        m1_start = now - timedelta(minutes=25)
        m1_end = now + timedelta(minutes=35)
        self.meetings[m1_id] = {
            "id": m1_id,
            "title": "Executive Governance & Sprint Alignment",
            "description": "Weekly governance review discussing Q4 release deliverables, CMS Commander design system tokens, and CRDT synchronization.",
            "meeting_type": "planning",
            "status": "in_progress",
            "start_time": _fmt(m1_start),
            "end_time": _fmt(m1_end),
            "timezone": "UTC",
            "recurrence_rule": None,
            "physical_location": "Executive Boardroom 4A",
            "meeting_url": "https://meet.xone.io/exec-gov-4a",
            "created_by": "user_001",
            "project_id": "proj_xone_core",
            "created_at": _fmt(now - timedelta(days=2)),
            "updated_at": _fmt(now),
        }

        # Participants for Meeting 1
        p1_1 = {
            "id": "10000000-0000-4000-8000-000000000001",
            "meeting_id": m1_id,
            "user_id": "user_001",
            "user_name": "Mukilan J",
            "user_email": "mukilan.j@xone.io",
            "role": "organizer",
            "status": "accepted",
            "joined_at": _fmt(m1_start + timedelta(minutes=1)),
            "created_at": _fmt(m1_start),
            "updated_at": _fmt(now),
        }
        p1_2 = {
            "id": "10000000-0000-4000-8000-000000000002",
            "meeting_id": m1_id,
            "user_id": "user_002",
            "user_name": "Sarah Chen",
            "user_email": "sarah.chen@xone.io",
            "role": "presenter",
            "status": "accepted",
            "joined_at": _fmt(m1_start + timedelta(minutes=2)),
            "created_at": _fmt(m1_start),
            "updated_at": _fmt(now),
        }
        p1_3 = {
            "id": "10000000-0000-4000-8000-000000000003",
            "meeting_id": m1_id,
            "user_id": "user_003",
            "user_name": "Alex Rivera",
            "user_email": "alex.rivera@xone.io",
            "role": "attendee",
            "status": "accepted",
            "joined_at": _fmt(m1_start + timedelta(minutes=3)),
            "created_at": _fmt(m1_start),
            "updated_at": _fmt(now),
        }
        p1_4 = {
            "id": "10000000-0000-4000-8000-000000000004",
            "meeting_id": m1_id,
            "user_id": "user_004",
            "user_name": "Priya Sharma",
            "user_email": "priya.sharma@xone.io",
            "role": "attendee",
            "status": "tentative",
            "joined_at": None,
            "created_at": _fmt(m1_start),
            "updated_at": _fmt(now),
        }
        for p in [p1_1, p1_2, p1_3, p1_4]:
            self.participants[p["id"]] = p

        # Agenda Items for Meeting 1
        a1_1 = {
            "id": "20000000-0000-4000-8000-000000000001",
            "meeting_id": m1_id,
            "title": "Welcome & Sprint Velocity Review",
            "description": "Review completed story points and sprint blockers across engineering teams.",
            "duration_minutes": 15,
            "order_index": 0,
            "status": "completed",
            "created_at": _fmt(m1_start),
            "updated_at": _fmt(now),
        }
        a1_2 = {
            "id": "20000000-0000-4000-8000-000000000002",
            "meeting_id": m1_id,
            "title": "CMS Commander Design System Adoption",
            "description": "Audit green #249E5E tokens, contrast compliance, and FullCalendar integration.",
            "duration_minutes": 20,
            "order_index": 1,
            "status": "in_progress",
            "created_at": _fmt(m1_start),
            "updated_at": _fmt(now),
        }
        a1_3 = {
            "id": "20000000-0000-4000-8000-000000000003",
            "meeting_id": m1_id,
            "title": "Local Ollama AI Governance Pipeline",
            "description": "Discuss asynchronous qwen2.5:7b-instruct summarization and action item extraction.",
            "duration_minutes": 15,
            "order_index": 2,
            "status": "pending",
            "created_at": _fmt(m1_start),
            "updated_at": _fmt(now),
        }
        a1_4 = {
            "id": "20000000-0000-4000-8000-000000000004",
            "meeting_id": m1_id,
            "title": "Action Items & Digital MoM Sign-Off",
            "description": "Review task allocation and prepare cryptographic digital sign-offs.",
            "duration_minutes": 10,
            "order_index": 3,
            "status": "pending",
            "created_at": _fmt(m1_start),
            "updated_at": _fmt(now),
        }
        for a in [a1_1, a1_2, a1_3, a1_4]:
            self.agenda_items[a["id"]] = a

        # Notes for Meeting 1
        n1 = {
            "id": "30000000-0000-4000-8000-000000000001",
            "meeting_id": m1_id,
            "note_type": "live_notes",
            "content_html": (
                "<h2>Executive Governance Session Notes</h2>"
                "<p><strong>Chair:</strong> Mukilan J | <strong>Date:</strong> Today</p>"
                "<h3>1. Sprint Velocity & Engineering Health</h3>"
                "<p>Overall sprint velocity reached 88 story points, up 12% from previous cycle. Backend asyncpg integration completed successfully.</p>"
                "<h3>2. CMS Commander Design System</h3>"
                "<p>Confirmed strict alignment with proposed DSM: primary green <code>#249E5E</code>, neutral grays from <code>#F9FAFB</code> to <code>#111827</code>, 8px base radius, and 1.5px stroke Lucide icons.</p>"
                "<h3>3. AI Intelligence Hub</h3>"
                "<p>Local Ollama pipeline verified for offline privacy compliance. Summaries and task extractions run in under 3.5 seconds.</p>"
            ),
            "content_text": (
                "Executive Governance Session Notes\n"
                "Chair: Mukilan J | Date: Today\n\n"
                "1. Sprint Velocity & Engineering Health\n"
                "Overall sprint velocity reached 88 story points, up 12% from previous cycle. Backend asyncpg integration completed successfully.\n\n"
                "2. CMS Commander Design System\n"
                "Confirmed strict alignment with proposed DSM: primary green #249E5E, neutral grays, 8px base radius.\n\n"
                "3. AI Intelligence Hub\n"
                "Local Ollama pipeline verified for offline privacy compliance."
            ),
            "content_json": {},
            "version": 3,
            "created_by": "user_001",
            "last_edited_by": "user_001",
            "created_at": _fmt(m1_start),
            "updated_at": _fmt(now),
        }
        self.notes[(m1_id, "live_notes")] = n1

        # Action items for Meeting 1
        act1 = {
            "id": "40000000-0000-4000-8000-000000000001",
            "meeting_id": m1_id,
            "title": "Finalize CMS Commander design tokens across all workspace dialogs",
            "priority": "high",
            "status": "in_progress",
            "due_date": _fmt(now + timedelta(days=1))[:10],
            "converted_to_task": True,
            "external_task_id": "TASK-1048",
            "external_task_url": "https://jira.xone.internal/browse/TASK-1048",
            "ai_confidence_score": 0.94,
            "created_at": _fmt(m1_start),
            "updated_at": _fmt(now),
        }
        act2 = {
            "id": "40000000-0000-4000-8000-000000000002",
            "meeting_id": m1_id,
            "title": "Benchmark Ollama qwen2.5:7b-instruct response latency on dev instances",
            "priority": "medium",
            "status": "open",
            "due_date": _fmt(now + timedelta(days=3))[:10],
            "converted_to_task": False,
            "external_task_id": None,
            "external_task_url": None,
            "ai_confidence_score": 0.88,
            "created_at": _fmt(m1_start),
            "updated_at": _fmt(now),
        }
        act3 = {
            "id": "40000000-0000-4000-8000-000000000003",
            "meeting_id": m1_id,
            "title": "Validate WebSocket CRDT conflict recovery over high-latency networks",
            "priority": "critical",
            "status": "completed",
            "due_date": _fmt(now)[:10],
            "converted_to_task": True,
            "external_task_id": "TASK-1012",
            "external_task_url": "https://jira.xone.internal/browse/TASK-1012",
            "ai_confidence_score": 0.97,
            "created_at": _fmt(m1_start),
            "updated_at": _fmt(now),
        }
        for act in [act1, act2, act3]:
            self.action_items[act["id"]] = act

        # MoM Sign-off for Meeting 1
        s1 = {
            "id": "50000000-0000-4000-8000-000000000001",
            "meeting_id": m1_id,
            "participant_id": p1_1["id"],
            "signed_at": _fmt(now - timedelta(minutes=5)),
            "signature_hash": _make_sha256(f"{m1_id}:{p1_1['id']}:1:true"),
            "note_version": 1,
            "is_approved": True,
            "comments": "Approved without objections. Excellent velocity.",
            "created_at": _fmt(now - timedelta(minutes=5)),
            "updated_at": _fmt(now - timedelta(minutes=5)),
        }
        self.signoffs[s1["id"]] = s1

        # AI Job for Meeting 1
        job1 = {
            "id": "60000000-0000-4000-8000-000000000001",
            "meeting_id": m1_id,
            "job_type": "full_pipeline",
            "status": "completed",
            "model_used": "qwen2.5:7b-instruct",
            "output_json": {
                "summary": "The executive session ratified the transition to the CMS Commander Design System, approved sprint deliverables, and confirmed the deployment of local Ollama governance models for privacy-preserving task extraction.",
                "key_points": [
                    "Engineering velocity increased by 12% in the current sprint.",
                    "CMS Commander green (#249E5E) design tokens are fully integrated into frontend components.",
                    "Local Ollama models provide asynchronous summarization with zero cloud leakage.",
                    "CRDT live sync validated with sub-50ms latency across concurrent editors.",
                ],
                "decisions_made": [
                    "Approved immediate merge of the CMS Commander design overhaul.",
                    "Mandated SHA-256 digital sign-offs for all executive governance meetings.",
                    "Designated Ollama qwen2.5:7b-instruct as the standard local enterprise model.",
                ],
                "action_items": [
                    {
                        "title": "Finalize CMS Commander design tokens across all workspace dialogs",
                        "description": "Audit padding, button heights (36px default), and border radius (8px/12px).",
                        "assignee_name": "Alex Rivera",
                        "priority": "high",
                        "due_date": _fmt(now + timedelta(days=1))[:10],
                        "confidence_score": 0.94,
                    },
                    {
                        "title": "Benchmark Ollama qwen2.5:7b-instruct response latency",
                        "description": "Run prompt evaluation against meeting transcripts.",
                        "assignee_name": "Sarah Chen",
                        "priority": "medium",
                        "due_date": _fmt(now + timedelta(days=3))[:10],
                        "confidence_score": 0.88,
                    },
                ],
            },
            "duration_ms": 2340,
            "created_at": _fmt(now - timedelta(minutes=15)),
            "updated_at": _fmt(now - timedelta(minutes=15)),
        }
        self.ai_jobs[job1["id"]] = job1

        # ── Meeting 2: Upcoming Later Today ──────────────────────────────────
        m2_id = "00000000-0000-4000-8000-000000000002"
        m2_start = now + timedelta(hours=2)
        m2_end = now + timedelta(hours=3, minutes=15)
        self.meetings[m2_id] = {
            "id": m2_id,
            "title": "Architecture Sync: CRDT Live Notes & Yjs Pipeline",
            "description": "Deep-dive session into real-time collaborative editing, awareness state management, and document versioning.",
            "meeting_type": "review",
            "status": "scheduled",
            "start_time": _fmt(m2_start),
            "end_time": _fmt(m2_end),
            "timezone": "UTC",
            "recurrence_rule": None,
            "physical_location": "Virtual High-Security Room",
            "meeting_url": "https://meet.xone.io/arch-sync-crdt",
            "created_by": "user_001",
            "project_id": "proj_xone_core",
            "created_at": _fmt(now - timedelta(days=1)),
            "updated_at": _fmt(now),
        }
        self.participants["10000000-0000-4000-8000-000000000005"] = {
            "id": "10000000-0000-4000-8000-000000000005",
            "meeting_id": m2_id,
            "user_id": "user_001",
            "user_name": "Mukilan J",
            "user_email": "mukilan.j@xone.io",
            "role": "organizer",
            "status": "accepted",
            "joined_at": None,
            "created_at": _fmt(m2_start),
            "updated_at": _fmt(now),
        }
        self.participants["10000000-0000-4000-8000-000000000006"] = {
            "id": "10000000-0000-4000-8000-000000000006",
            "meeting_id": m2_id,
            "user_id": "user_005",
            "user_name": "Elena Rostova",
            "user_email": "elena.r@xone.io",
            "role": "presenter",
            "status": "accepted",
            "joined_at": None,
            "created_at": _fmt(m2_start),
            "updated_at": _fmt(now),
        }

        # ── Meeting 3: Completed Earlier Today ───────────────────────────────
        m3_id = "00000000-0000-4000-8000-000000000003"
        m3_start = now - timedelta(hours=4)
        m3_end = now - timedelta(hours=3)
        self.meetings[m3_id] = {
            "id": m3_id,
            "title": "Design System Audit & Contrast Verification",
            "description": "Verification of CMS Commander design tokens, WCAG AA compliance, and interactive FullCalendar styling.",
            "meeting_type": "review",
            "status": "completed",
            "start_time": _fmt(m3_start),
            "end_time": _fmt(m3_end),
            "timezone": "UTC",
            "recurrence_rule": None,
            "physical_location": "Design Studio Beta",
            "meeting_url": "https://meet.xone.io/dsm-review",
            "created_by": "user_001",
            "project_id": "proj_xone_dsm",
            "created_at": _fmt(now - timedelta(days=3)),
            "updated_at": _fmt(m3_end),
        }
        p3_1_id = "10000000-0000-4000-8000-000000000007"
        self.participants[p3_1_id] = {
            "id": p3_1_id,
            "meeting_id": m3_id,
            "user_id": "user_001",
            "user_name": "Mukilan J",
            "user_email": "mukilan.j@xone.io",
            "role": "organizer",
            "status": "accepted",
            "joined_at": _fmt(m3_start),
            "created_at": _fmt(m3_start),
            "updated_at": _fmt(m3_end),
        }
        # Add sign-off for Meeting 3
        s3 = {
            "id": "50000000-0000-4000-8000-000000000002",
            "meeting_id": m3_id,
            "participant_id": p3_1_id,
            "signed_at": _fmt(m3_end),
            "signature_hash": _make_sha256(f"{m3_id}:{p3_1_id}:1:true"),
            "note_version": 1,
            "is_approved": True,
            "comments": "Tokens approved for production release.",
            "created_at": _fmt(m3_end),
            "updated_at": _fmt(m3_end),
        }
        self.signoffs[s3["id"]] = s3

        # ── Meeting 4: Tomorrow Morning ──────────────────────────────────────
        m4_id = "00000000-0000-4000-8000-000000000004"
        tomorrow = now + timedelta(days=1)
        m4_start = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 10, 0, tzinfo=timezone.utc)
        m4_end = m4_start + timedelta(hours=1)
        self.meetings[m4_id] = {
            "id": m4_id,
            "title": "Quarterly Roadmap & Resource Capacity Planning",
            "description": "Stakeholder review of enterprise milestones, engineering allocations, and plugin deliverables.",
            "meeting_type": "planning",
            "status": "scheduled",
            "start_time": _fmt(m4_start),
            "end_time": _fmt(m4_end),
            "timezone": "UTC",
            "recurrence_rule": None,
            "physical_location": "Conference Hall C",
            "meeting_url": "https://meet.xone.io/q4-roadmap",
            "created_by": "user_001",
            "project_id": "proj_xone_core",
            "created_at": _fmt(now),
            "updated_at": _fmt(now),
        }

        # ── Meeting 5: Day After Tomorrow ────────────────────────────────────
        m5_id = "00000000-0000-4000-8000-000000000005"
        day_after = now + timedelta(days=2)
        m5_start = datetime(day_after.year, day_after.month, day_after.day, 14, 30, tzinfo=timezone.utc)
        m5_end = m5_start + timedelta(hours=1, minutes=15)
        self.meetings[m5_id] = {
            "id": m5_id,
            "title": "Security & Enterprise Compliance Audit",
            "description": "Review cryptographic signatures, SHA-256 audit trails, and role-based access governance.",
            "meeting_type": "workshop",
            "status": "scheduled",
            "start_time": _fmt(m5_start),
            "end_time": _fmt(m5_end),
            "timezone": "UTC",
            "recurrence_rule": None,
            "physical_location": "Security Lab 1",
            "meeting_url": "https://meet.xone.io/sec-audit",
            "created_by": "user_001",
            "project_id": "proj_xone_sec",
            "created_at": _fmt(now),
            "updated_at": _fmt(now),
        }


# Global singleton instance
mock_store = MockStore()
