# xone-meeting-plugin

Enterprise-grade Meeting Governance & Calendar Module.

## Architecture

```
Meeting Module/
├── backend/          Python 3.12 · FastAPI · SQLAlchemy 2.0 Async · Alembic · Pydantic v2
└── frontend/         Next.js 14 (App Router) · Tailwind CSS v4 · FullCalendar · TipTap · Yjs
```

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Python | ≥ 3.12 | Backend runtime |
| Node.js | ≥ 20 LTS | Frontend build & WebSocket server |
| PostgreSQL | ≥ 13 | Database (`gen_random_uuid()` required) |
| Ollama | latest | Local AI (`qwen2.5:7b-instruct` model) |

---

## 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env: set POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, SECRET_KEY

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**API Docs:** http://localhost:8000/api/docs  
**ReDoc:**    http://localhost:8000/api/redoc

---

## 2. Ollama Setup

```bash
# Install Ollama from https://ollama.com
# Pull the required model
ollama pull qwen2.5:7b-instruct

# Ollama runs automatically on http://localhost:11434
```

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
copy .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL if needed

# Start all services in separate terminals:

# Terminal 1 — Next.js dev server (port 3000)
npm run dev

# Terminal 2 — Yjs WebSocket server (port 1234)
npm run ws-server
```

**App:** http://localhost:3000  
**WS Server:** ws://localhost:1234

---

## 4. Feature Overview

### Calendar (`/meetings`)
- Month / Week / Day / Resource Timeline views via FullCalendar
- Drag-and-drop rescheduling with live conflict detection
- RFC 5545 recurrence rule support
- One-click meeting creation dialog

### Meeting Workspace (`/meetings/:id`)
| Tab | Feature |
|---|---|
| **Agenda** | Drag-and-drop reorderable agenda builder, timebox tracking, status cycling |
| **Live Notes** | TipTap rich-text editor with real-time Yjs CRDT collaboration |
| **Action Items** | Priority tracking, 1-click task conversion to external systems, AI-extracted items |
| **Participants** | RSVP management, role assignment, attendance window tracking |
| **AI Insights** | Async Ollama pipeline: summarize / extract actions / full pipeline |
| **Sign-Off** | Per-participant MoM approval with SHA-256 audit hash |

---

## 5. API Reference

All endpoints under `/api/v1/`:

| Resource | Endpoints |
|---|---|
| `meetings` | CRUD + conflict check |
| `participants` | CRUD + attendance update |
| `agenda` | CRUD + bulk reorder |
| `action-items` | CRUD + task conversion |
| `notes` | Get-or-create + versioned update |
| `mom` | Sign-off + governance status |
| `ai/jobs` | Enqueue + poll + results |

---

## 6. Environment Variables

### Backend (`backend/.env`)
```env
POSTGRES_USER=xone_user
POSTGRES_PASSWORD=xone_pass
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=xone_meetings
SECRET_KEY=<64-char random string>
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:1234
```
