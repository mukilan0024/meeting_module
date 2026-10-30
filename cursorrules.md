# xone-meeting-plugin — Cursor Rules

You are a Senior Enterprise Engineer building a **standalone** Meeting Management and Governance Module (`xone-meeting-plugin`) **from scratch**.

Build contract: `prd.md` (PRD-XMP-001), `tad.md` (TAD-XMP-001), `wbs_and_execution_plan.md` (WBS-XMP-001).

---

## Product spine (five pillars — all in scope)

1. **Interactive multi-view calendar (FullCalendar):** Month, Week, Day, Resource Timeline; drag-and-drop; recurrence; real-time conflict detection.
2. **Timeboxed agenda builder:** reorderable items, presenters, duration, pre-read attachments.
3. **Live collaborative companion:** TipTap + Yjs WebSockets (CRDT), live agenda timers, inline action-item / decision flagging.
4. **Execution:** 1-click conversion of flagged actions into tracked tasks via TaskPort (local task store by default; optional host adapter later).
5. **AI + governance:** async local Ollama (`qwen2.5:7b-instruct`) summarization, MoM sign-off, locked notes, PDF export.

---

## Stack (do not substitute)

- Frontend: Next.js 14 (App Router), TypeScript, FullCalendar, TipTap, Yjs
- Backend: Python 3.12, FastAPI
- Data: PostgreSQL (system of record), Redis (presence / job queue)
- Collab: Yjs over WebSockets; persist snapshots to PostgreSQL
- AI: local Ollama only; model `qwen2.5:7b-instruct`; never call cloud LLMs
- PDF: generated from **approved** MoM only

---

## Repository layout (Xerago)

Allowed root: `apps`, `core`, `workers`, `infrastructure`, `config`, `docs`, `tests`, `scripts`.

Never create `src/`, `lib/`, `services/`, `features/`, or `modules/` at root.

| Path | Allowed contents |
| --- | --- |
| `apps/meetings/api/` | HTTP routing, auth, parsing only |
| `apps/meetings/services/` | Business logic |
| `apps/meetings/models/` | ORM only |
| `apps/meetings/schemas/` | Pydantic DTOs only |
| `apps/meetings/tests/` | Domain tests |
| `apps/meetings/prompts/` | Ollama prompt templates only |
| `apps/web/` | Next.js UI only; no direct DB or config-file access |
| `core/typing/` | Shared types |
| `core/errors/` | Custom exceptions |
| `core/helpers/` | Shared helpers |
| `core/db/` | Session / DB utilities |
| `core/integrations/` | Ports and adapters |
| `workers/` | Ollama, CRDT snapshot flush, PDF |
| `infrastructure/gateway/` | Gateway config |
| `docs/` | PRD, TAD, SOP, diagrams — no executable code |
| `config/` | Environment and product configuration |

Never create `core/utils/`.

---

## Architecture boundaries

- No business logic in `apps/meetings/api/`.
- External systems (identity, tasks, video, email, optional Xone) go through ports in `core/integrations/`. Default adapters are local.
- Meetings remain usable if video providers or Ollama are down (circuit breaker + local commit first).
- Configuration is externalized. Do not hardcode URLs, secrets, or environment-specific values.
- Pin dependency versions. Do not add libraries without a clear gap in the stack above.

---

## Domain rules

- One meeting system of record. No parallel meeting tables.
- Agenda items are child rows, never a single blob as source of truth.
- Action items are follow-ups until converted. Converted work lives behind TaskPort; store `linked_task_id` on the action.
- AI writes `is_candidate=true` only. Human review required before convert. Workers never call TaskPort.
- `APPROVED` MoM locks notes and agendas. No silent unlock.
- Recurrence is stored as a rule + series id; instances are queryable.
- Conflict detection runs on create and on drag-and-drop reschedule.
- Video is a stored join URL, not a native media engine.

---

## Quality

- Production-ready only. No demo shortcuts, debug prints, `console.log`, or hardcoded secrets.
- Validate all inputs. JWT on REST and WebSockets. RBAC: `manage_meetings`, `edit_notes`, `approve_mom`, `convert_task`.
- Structured logging with correlation IDs. Mask PII.
- Tests for conflict engine, recurrence expansion, convert-task (including candidate rejection), MoM lock, and CRDT snapshot persistence.
- Handle timeouts, retries, and degradation on adapters. Do not swallow exceptions.
- After modifying code files, run `graphify update .` if `graphify-out/` exists.

---

## Out of scope (refuse to build)

- Native Zoom / Teams / Meet video engine
- Cloud LLM providers
- Public external calendar publishing as v1
- In-app billing or expense from meetings
- Copying Xone 2.0 schema names into this plugin
- Auto-creating project tasks from Ollama output
