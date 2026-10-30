# Product Requirements Document

## Standalone Enterprise Meeting Management & Governance Module (`xone-meeting-plugin`)

| Field | Value |
| --- | --- |
| Document ID | PRD-XMP-001 |
| Version | 1.0.0 |
| Status | Approved for greenfield build |
| Product | xone-meeting-plugin |
| Architecture | Standalone plugin; optional ports to host systems |
| Stack | Next.js 14, FastAPI (Python 3.12), PostgreSQL, FullCalendar, TipTap + Yjs, Ollama `qwen2.5:7b-instruct` |

This document is the **build contract**. Do not implement against Xone 2.0 reuse maps (`governance_*` tables, live Resource Management, or in-product wiki). Those files are archived as an embed variant only.

---

## 1. Objective

Build a **standalone, enterprise-grade** Meeting Management and Governance Module from scratch. Meetings are an execution loop, not a calendar widget:

**schedule → timeboxed agenda → live co-authored notes → flagged actions → tracked tasks → governed MoM (sign-off + PDF).**

The plugin must run without Xone 2.0. Identity, tasks, files, mail, and video are reached through **ports**. Default adapters are local. A later Xone adapter must not leak into domain services.

---

## 2. Personas

1. **Organizer / Project Manager** — schedules meetings, enforces timeboxed agendas, converts actions to tasks, drives MoM sign-off.
2. **Participant / Contributor** — sees assigned meetings, pre-reads, co-edits notes, owns action items.
3. **Scribe** — runs the live companion, timers, and inline flagging. Cannot create meetings unless also Organizer.
4. **Executive / Approver** — reads summaries, signs off MoM, exports PDF.

---

## 3. Five functional pillars

### P1 — Interactive multi-view calendar

- FullCalendar views: **Month, Week, Day, Resource Timeline**.
- Create by click or drag; **reschedule by drag-and-drop and resize**.
- **Recurrence**: daily, weekly, bi-weekly, monthly; series identifier plus exception dates (this instance / this and following).
- **Real-time conflict detection** on attendees and resources at create and on drop. Warn, offer next free slot, optional `allow_overlap` with audit.
- Store join URL for Zoom / Teams / Meet. Provider outage must not block booking.

### P2 — Timeboxed agenda builder

- Reorderable items: title, estimated minutes, assigned presenter, description.
- **Pre-read file attachments** per agenda item.
- Sum of item minutes versus scheduled slot; warn when overboxed.
- Live mode: mark covered; highlight overtime.

### P3 — Live collaborative companion workspace

- TipTap rich text synchronized via **Yjs WebSockets (CRDT)**.
- At least **20 concurrent editors**; IndexedDB cache; reconnect merge.
- Live agenda countdown; overtime amber then red.
- Selection popup: tag a line as **Action Item** or **Key Decision** (assignee, due date).

### P4 — Execution and task conversion

- **One-click** conversion of a flagged action into a tracked task via TaskPort.
- Persist `linked_task_id`; reflect task status in the meeting workspace.
- AI candidates cannot convert until a human accepts them.

### P5 — AI summarizer and governance

- Asynchronous **local Ollama** pipeline; model **`qwen2.5:7b-instruct`**.
- Extract executive summary, decisions, and **candidate** action items as JSON.
- Transcripts never leave the premises; no cloud LLM.
- MoM states: `DRAFT` → `SUBMITTED` → `APPROVED` (or `REJECTED` → `DRAFT`).
- `APPROVED` **locks** notes and agendas.
- Styled PDF: meeting header, attendees, agenda, notes, decisions, actions/tasks.

---

## 4. Functional requirements

| ID | Pillar | Requirement | Acceptance |
| --- | --- | --- | --- |
| FR-01 | P1 | View toggle Month / Week / Day / Resource Timeline | All four views render the same authorized meeting set |
| FR-02 | P1 | Drag-and-drop reschedule | Persist within 200 ms; conflict check runs |
| FR-03 | P1 | Recurrence engine | Create, edit, cancel this instance or this-and-following |
| FR-04 | P1 | Conflict detection | Double-booked attendee or resource → warning + alternatives; HTTP 409 unless `allow_overlap` |
| FR-05 | P2 | Agenda CRUD and reorder | Order persisted; duration sum vs slot warning |
| FR-06 | P2 | Pre-reads | Attach, list, and download files per agenda item |
| FR-07 | P3 | CRDT co-edit | 20 users, no lost characters; WebSocket authenticated with JWT |
| FR-08 | P3 | Live timer | Active item countdown; overtime visual |
| FR-09 | P3 | Flag action / decision | Creates `MeetingAction` or `MeetingDecision` |
| FR-10 | P4 | Convert to task | TaskPort create; action locked; `linked_task_id` stored |
| FR-11 | P5 | Ollama summary | Structured JSON p95 ≤ 15 s for a 1-hour transcript; no external LLM |
| FR-12 | P5 | MoM lock | `APPROVED` disables TipTap writes and agenda edits |
| FR-13 | P5 | PDF export | Pack includes agenda, notes, decisions, and actions |

---

## 5. Non-functional requirements

1. **Performance:** REST p95 &lt; 200 ms for standard CRUD. Yjs sync &lt; 100 ms on LAN.
2. **Privacy:** All AI processing on local Ollama. No transcript payload to third-party LLM APIs.
3. **Resilience:** Editor content cached in the browser. CRDT merge on reconnect. Booking, notes, and convert work if video or Ollama is down.
4. **Security:** JWT on REST and WebSockets. RBAC keys: `manage_meetings`, `edit_notes`, `approve_mom`, `convert_task`.
5. **Observability:** Structured logs with correlation IDs. Mask PII and secrets.

---

## 6. Domain entities (plugin-owned)

| Entity | Responsibility |
| --- | --- |
| `Meeting` | Title, time window, status, series, organizer, join URL, notes snapshot, MoM status |
| `MeetingAttendee` | Principal, kind (internal / external), role |
| `MeetingAgendaItem` | Order, title, minutes, presenter, description, covered flag |
| `MeetingAttachment` | Pre-read file for an agenda item |
| `MeetingNoteDocument` | Yjs room id and persisted snapshot |
| `MeetingAction` | Body, assignee, due date, `is_candidate`, `linked_task_id` |
| `MeetingDecision` | Body, owner |
| `MeetingTranscript` | Raw text, summary JSON, job status |
| `MeetingApproval` | Approver, decision, timestamp |
| `Task` | Local TaskPort default: title, assignee, due, status, source action |

---

## 7. Out of scope (v1)

- Native Zoom / Teams / Meet video engine
- Cloud LLM providers
- Public external calendar publishing
- In-app billing or expense lines from a meeting
- Embedding or altering Xone 2.0 `governance_*` / `hr_employees` / `project_tasks` schema

---

## 8. Success criteria

- Organizer books with conflict check in one flow.
- Agenda overbox warning appears before save.
- Two browsers co-edit without last-write-wins loss.
- Convert creates a task and round-trips status into the meeting.
- Approved MoM is immutable and exportable as PDF.
- Ollama never creates a task without human acceptance.
