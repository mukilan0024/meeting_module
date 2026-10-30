from __future__ import annotations

import asyncio
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Response, status
from pydantic import BaseModel

from app.mock_store import mock_store


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_sha256(val: str) -> str:
    return hashlib.sha256(val.encode("utf-8")).hexdigest()


mock_api_router = APIRouter()


# ── MEETINGS ROUTER ────────────────────────────────────────────────────────────
meetings_router = APIRouter(prefix="/meetings", tags=["Mock Meetings"])


@meetings_router.get("/")
async def list_meetings(
    created_by: Optional[str] = Query(default=None),
    project_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    start_after: Optional[str] = Query(default=None),
    start_before: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=200, ge=1),
) -> Dict[str, Any]:
    items = list(mock_store.meetings.values())

    if created_by:
        items = [m for m in items if m.get("created_by") == created_by]
    if project_id:
        items = [m for m in items if m.get("project_id") == project_id]
    if status:
        items = [m for m in items if m.get("status") == status]
    if start_after:
        items = [m for m in items if m.get("start_time", "") >= start_after]
    if start_before:
        items = [m for m in items if m.get("start_time", "") <= start_before]

    # Sort ascending by start_time
    items.sort(key=lambda m: m.get("start_time", ""))

    total = len(items)
    offset = (page - 1) * page_size
    paged = items[offset : offset + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": paged,
    }


@meetings_router.get("/{meeting_id}")
async def get_meeting(meeting_id: str) -> Dict[str, Any]:
    meeting = mock_store.meetings.get(str(meeting_id))
    if not meeting:
        raise HTTPException(status_code=404, detail=f"Meeting {meeting_id} not found")
    return meeting


@meetings_router.post("/", status_code=status.HTTP_201_CREATED)
async def create_meeting(data: Dict[str, Any]) -> Dict[str, Any]:
    new_id = str(uuid.uuid4())
    now = _now_iso()
    meeting = {
        "id": new_id,
        "title": data.get("title", "New Meeting"),
        "description": data.get("description"),
        "meeting_type": data.get("meeting_type", "general"),
        "status": data.get("status", "scheduled"),
        "start_time": data.get("start_time", now),
        "end_time": data.get("end_time", now),
        "timezone": data.get("timezone", "UTC"),
        "recurrence_rule": data.get("recurrence_rule"),
        "physical_location": data.get("physical_location"),
        "meeting_url": data.get("meeting_url"),
        "created_by": data.get("created_by", "user_001"),
        "project_id": data.get("project_id", "default_project"),
        "created_at": now,
        "updated_at": now,
    }
    mock_store.meetings[new_id] = meeting
    return meeting


@meetings_router.patch("/{meeting_id}")
async def update_meeting(meeting_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    meeting = mock_store.meetings.get(str(meeting_id))
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    for k, v in data.items():
        if v is not None:
            meeting[k] = v
    meeting["updated_at"] = _now_iso()
    return meeting


@meetings_router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_meeting(meeting_id: str) -> None:
    if str(meeting_id) in mock_store.meetings:
        del mock_store.meetings[str(meeting_id)]


@meetings_router.post("/conflicts/check")
async def check_conflicts(
    created_by: str = Query(...),
    start_time: str = Query(...),
    end_time: str = Query(...),
    exclude_meeting_id: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    conflicts = []
    for m in mock_store.meetings.values():
        if exclude_meeting_id and m["id"] == str(exclude_meeting_id):
            continue
        if m.get("created_by") == created_by and m.get("status") not in ["cancelled", "postponed"]:
            m_start = m.get("start_time", "")
            m_end = m.get("end_time", "")
            if m_start < end_time and m_end > start_time:
                conflicts.append(m)

    return {
        "has_conflict": len(conflicts) > 0,
        "conflicting_meetings": conflicts,
    }


# ── PARTICIPANTS ROUTER ────────────────────────────────────────────────────────
participants_router = APIRouter(prefix="/participants", tags=["Mock Participants"])


@participants_router.get("/meeting/{meeting_id}")
async def list_participants(meeting_id: str) -> Dict[str, Any]:
    items = [p for p in mock_store.participants.values() if p["meeting_id"] == str(meeting_id)]
    return {"total": len(items), "items": items}


@participants_router.post("/", status_code=status.HTTP_201_CREATED)
async def add_participant(data: Dict[str, Any]) -> Dict[str, Any]:
    p_id = str(uuid.uuid4())
    now = _now_iso()
    participant = {
        "id": p_id,
        "meeting_id": str(data["meeting_id"]),
        "user_id": data.get("user_id", str(uuid.uuid4())),
        "user_name": data.get("user_name", "Anonymous"),
        "user_email": data.get("user_email", "user@xone.io"),
        "role": data.get("role", "attendee"),
        "status": data.get("status", "accepted"),
        "joined_at": data.get("joined_at"),
        "created_at": now,
        "updated_at": now,
    }
    mock_store.participants[p_id] = participant
    return participant


@participants_router.patch("/{participant_id}")
async def update_participant(participant_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    p = mock_store.participants.get(str(participant_id))
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    for k, v in data.items():
        if v is not None:
            p[k] = v
    p["updated_at"] = _now_iso()
    return p


@participants_router.patch("/{participant_id}/attendance")
async def update_attendance(participant_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    p = mock_store.participants.get(str(participant_id))
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    if "joined_at" in data:
        p["joined_at"] = data["joined_at"]
    if "left_at" in data:
        p["left_at"] = data["left_at"]
    p["updated_at"] = _now_iso()
    return p


@participants_router.delete("/{participant_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def remove_participant(participant_id: str) -> None:
    if str(participant_id) in mock_store.participants:
        del mock_store.participants[str(participant_id)]


# ── AGENDA ROUTER ─────────────────────────────────────────────────────────────
agenda_router = APIRouter(prefix="/agenda", tags=["Mock Agenda"])


@agenda_router.get("/meeting/{meeting_id}")
async def list_agenda(meeting_id: str) -> Dict[str, Any]:
    items = [a for a in mock_store.agenda_items.values() if a["meeting_id"] == str(meeting_id)]
    items.sort(key=lambda a: a.get("order_index", 0))
    return {"total": len(items), "items": items}


@agenda_router.post("/", status_code=status.HTTP_201_CREATED)
async def create_agenda_item(data: Dict[str, Any]) -> Dict[str, Any]:
    a_id = str(uuid.uuid4())
    now = _now_iso()
    item = {
        "id": a_id,
        "meeting_id": str(data["meeting_id"]),
        "title": data.get("title", "Topic"),
        "description": data.get("description"),
        "duration_minutes": data.get("duration_minutes", 15),
        "order_index": data.get("order_index", 0),
        "status": data.get("status", "pending"),
        "created_at": now,
        "updated_at": now,
    }
    mock_store.agenda_items[a_id] = item
    return item


@agenda_router.patch("/{item_id}")
async def update_agenda_item(item_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    item = mock_store.agenda_items.get(str(item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Agenda item not found")
    for k, v in data.items():
        if v is not None:
            item[k] = v
    item["updated_at"] = _now_iso()
    return item


@agenda_router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_agenda_item(item_id: str) -> None:
    if str(item_id) in mock_store.agenda_items:
        del mock_store.agenda_items[str(item_id)]


@agenda_router.put("/meeting/{meeting_id}/reorder")
async def reorder_agenda(meeting_id: str, payload: Dict[str, List[str]]) -> Dict[str, Any]:
    ordered_ids = payload.get("ordered_ids", [])
    for idx, item_id in enumerate(ordered_ids):
        if item_id in mock_store.agenda_items:
            mock_store.agenda_items[item_id]["order_index"] = idx
            mock_store.agenda_items[item_id]["updated_at"] = _now_iso()

    items = [a for a in mock_store.agenda_items.values() if a["meeting_id"] == str(meeting_id)]
    items.sort(key=lambda a: a.get("order_index", 0))
    return {"total": len(items), "items": items}


# ── ACTION ITEMS ROUTER ───────────────────────────────────────────────────────
actions_router = APIRouter(prefix="/action-items", tags=["Mock Action Items"])


@actions_router.get("/meeting/{meeting_id}")
async def list_action_items(meeting_id: str) -> Dict[str, Any]:
    items = [act for act in mock_store.action_items.values() if act["meeting_id"] == str(meeting_id)]
    return {"total": len(items), "items": items}


@actions_router.post("/", status_code=status.HTTP_201_CREATED)
async def create_action_item(data: Dict[str, Any]) -> Dict[str, Any]:
    act_id = str(uuid.uuid4())
    now = _now_iso()
    item = {
        "id": act_id,
        "meeting_id": str(data["meeting_id"]),
        "title": data.get("title", ""),
        "description": data.get("description"),
        "priority": data.get("priority", "medium"),
        "status": data.get("status", "open"),
        "due_date": data.get("due_date"),
        "converted_to_task": False,
        "external_task_id": None,
        "external_task_url": None,
        "ai_confidence_score": 0.90,
        "created_at": now,
        "updated_at": now,
    }
    mock_store.action_items[act_id] = item
    return item


@actions_router.patch("/{item_id}")
async def update_action_item(item_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    item = mock_store.action_items.get(str(item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    for k, v in data.items():
        if v is not None:
            item[k] = v
    item["updated_at"] = _now_iso()
    return item


@actions_router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_action_item(item_id: str) -> None:
    if str(item_id) in mock_store.action_items:
        del mock_store.action_items[str(item_id)]


@actions_router.post("/{item_id}/convert-to-task")
async def convert_action_to_task(item_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    item = mock_store.action_items.get(str(item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    task_id = payload.get("external_task_id", f"TASK-{int(datetime.now().timestamp()) % 10000}")
    item["converted_to_task"] = True
    item["external_task_id"] = task_id
    item["external_task_url"] = f"https://jira.xone.internal/browse/{task_id}"
    item["updated_at"] = _now_iso()
    return item


# ── NOTES ROUTER ──────────────────────────────────────────────────────────────
notes_router = APIRouter(prefix="/notes", tags=["Mock Notes"])


@notes_router.post("/")
async def get_or_create_note(data: Dict[str, Any]) -> Dict[str, Any]:
    meeting_id = str(data["meeting_id"])
    note_type = data.get("note_type", "live_notes")
    key = (meeting_id, note_type)

    if key in mock_store.notes:
        return mock_store.notes[key]

    n_id = str(uuid.uuid4())
    now = _now_iso()
    note = {
        "id": n_id,
        "meeting_id": meeting_id,
        "note_type": note_type,
        "content_html": "<p>Start collaborating on notes here...</p>",
        "content_text": "Start collaborating on notes here...",
        "content_json": {},
        "version": 1,
        "created_by": data.get("created_by", "user_001"),
        "last_edited_by": data.get("last_edited_by", "user_001"),
        "created_at": now,
        "updated_at": now,
    }
    mock_store.notes[key] = note
    return note


@notes_router.get("/meeting/{meeting_id}/{note_type}")
async def get_note(meeting_id: str, note_type: str) -> Dict[str, Any]:
    key = (str(meeting_id), note_type)
    if key in mock_store.notes:
        return mock_store.notes[key]
    # Return new default
    return await get_or_create_note({"meeting_id": meeting_id, "note_type": note_type})


@notes_router.patch("/{note_id}")
async def update_note(note_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    target = None
    for n in mock_store.notes.values():
        if n["id"] == str(note_id):
            target = n
            break

    if not target:
        raise HTTPException(status_code=404, detail="Note not found")

    if "content_html" in data:
        target["content_html"] = data["content_html"]
    if "content_text" in data:
        target["content_text"] = data["content_text"]
    if "content_json" in data:
        target["content_json"] = data["content_json"]
    if "last_edited_by" in data:
        target["last_edited_by"] = data["last_edited_by"]

    target["version"] = target.get("version", 1) + 1
    target["updated_at"] = _now_iso()
    return target


# ── MOM SIGN-OFF ROUTER ────────────────────────────────────────────────────────
mom_router = APIRouter(prefix="/mom", tags=["Mock MoM Sign-off"])


@mom_router.post("/signoff", status_code=status.HTTP_201_CREATED)
async def sign_off_mom(data: Dict[str, Any]) -> Dict[str, Any]:
    s_id = str(uuid.uuid4())
    now = _now_iso()
    meeting_id = str(data["meeting_id"])
    participant_id = str(data["participant_id"])
    note_version = data.get("note_version", 1)
    is_approved = data.get("is_approved", True)

    sig_hash = _make_sha256(f"{meeting_id}:{participant_id}:{note_version}:{is_approved}")

    signoff = {
        "id": s_id,
        "meeting_id": meeting_id,
        "participant_id": participant_id,
        "signed_at": now,
        "signature_hash": sig_hash,
        "note_version": note_version,
        "is_approved": is_approved,
        "comments": data.get("comments"),
        "created_at": now,
        "updated_at": now,
    }
    mock_store.signoffs[s_id] = signoff
    return signoff


@mom_router.get("/meeting/{meeting_id}/status")
async def get_mom_status(meeting_id: str) -> Dict[str, Any]:
    participants = [p for p in mock_store.participants.values() if p["meeting_id"] == str(meeting_id)]
    signoffs = [s for s in mock_store.signoffs.values() if s["meeting_id"] == str(meeting_id)]

    signed_participant_ids = set(s["participant_id"] for s in signoffs)
    total = len(participants)
    signed_count = len(signed_participant_ids)
    pending_count = max(0, total - signed_count)
    all_approved = (total > 0 and signed_count == total and all(s.get("is_approved", False) for s in signoffs))

    return {
        "meeting_id": str(meeting_id),
        "total_participants": total,
        "signed_count": signed_count,
        "pending_count": pending_count,
        "all_approved": all_approved,
        "signoffs": signoffs,
    }


# ── AI JOBS ROUTER ────────────────────────────────────────────────────────────
ai_router = APIRouter(prefix="/ai", tags=["Mock AI Intelligence"])


async def _simulate_ai_completion(job_id: str, input_text: str, job_type: str) -> None:
    await asyncio.sleep(1.8)
    job = mock_store.ai_jobs.get(job_id)
    if not job:
        return

    words = input_text.split()
    sample_topic = " ".join(words[:6]) if len(words) >= 6 else "Key Discussion Topics"

    job["status"] = "completed"
    job["duration_ms"] = 1820
    job["completed_at"] = _now_iso()
    job["output_json"] = {
        "summary": (
            f"Autonomous AI synthesis completed for meeting discussions: {sample_topic}. "
            "All core decisions, deliverables, and engineering constraints have been ratified."
        ),
        "key_points": [
            "Validated CMS Commander green (#249E5E) design system compliance.",
            "Reviewed team velocity, sprint capacity, and active task allocations.",
            "Enforced SHA-256 digital signature governance for audit trails.",
            "Confirmed offline execution of the local Ollama LLM pipeline.",
        ],
        "decisions_made": [
            "Deploy meeting workspace with FullCalendar drag-and-drop support.",
            "Mandate cryptographic sign-off before official minutes are closed.",
            "Enable 1-click external task conversion for high-priority items.",
        ],
        "action_items": [
            {
                "title": f"Execute action items arising from {sample_topic[:30]}",
                "description": "Follow up with meeting stakeholders on identified action tracks.",
                "assignee_name": "Mukilan J",
                "priority": "high",
                "due_date": _now_iso()[:10],
                "confidence_score": 0.95,
            },
            {
                "title": "Synchronize CRDT state changes with offline participants",
                "description": "Ensure reconnecting clients replay CRDT vector logs cleanly.",
                "assignee_name": "Alex Rivera",
                "priority": "medium",
                "due_date": _now_iso()[:10],
                "confidence_score": 0.89,
            },
        ],
    }


@ai_router.post("/jobs", status_code=status.HTTP_202_ACCEPTED)
async def enqueue_ai_job(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
) -> Dict[str, Any]:
    job_id = str(uuid.uuid4())
    now = _now_iso()
    meeting_id = str(payload.get("meeting_id", ""))
    job_type = payload.get("job_type", "full_pipeline")
    input_text = payload.get("input_text", "")

    job = {
        "id": job_id,
        "meeting_id": meeting_id,
        "job_type": job_type,
        "status": "processing",
        "model_used": "qwen2.5:7b-instruct (mock)",
        "output_json": None,
        "error_message": None,
        "duration_ms": None,
        "started_at": now,
        "created_at": now,
        "updated_at": now,
    }
    mock_store.ai_jobs[job_id] = job

    # Simulate asynchronous completion in background
    background_tasks.add_task(_simulate_ai_completion, job_id, input_text, job_type)
    return job


@ai_router.get("/jobs/{job_id}")
async def get_ai_job(job_id: str) -> Dict[str, Any]:
    job = mock_store.ai_jobs.get(str(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="AI job not found")
    return job


@ai_router.get("/jobs/{job_id}/status")
async def get_ai_job_status(job_id: str) -> Dict[str, Any]:
    job = mock_store.ai_jobs.get(str(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="AI job not found")
    return {
        "id": job["id"],
        "status": job["status"],
        "duration_ms": job.get("duration_ms"),
        "error_message": job.get("error_message"),
    }


@ai_router.get("/jobs/meeting/{meeting_id}")
async def list_jobs_for_meeting(meeting_id: str) -> List[Dict[str, Any]]:
    return [j for j in mock_store.ai_jobs.values() if j["meeting_id"] == str(meeting_id)]


# ── COMBINE ALL ROUTERS ───────────────────────────────────────────────────────
mock_api_router.include_router(meetings_router)
mock_api_router.include_router(participants_router)
mock_api_router.include_router(agenda_router)
mock_api_router.include_router(actions_router)
mock_api_router.include_router(notes_router)
mock_api_router.include_router(mom_router)
mock_api_router.include_router(ai_router)
