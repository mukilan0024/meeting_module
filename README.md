# xone-meeting-plugin

Enterprise-grade Meeting Governance & Calendar Module built with FastAPI, Next.js 14, and real-time CRDT collaboration.

---

## 🏛 Architecture

```text
Meeting Module/
├── backend/          Python ≥ 3.12 · FastAPI · SQLAlchemy 2.0 Async · Alembic · Pydantic v2
├── frontend/         Next.js 14 (App Router) · Tailwind CSS v4 · FullCalendar · TipTap · Yjs
├── docs/             Architectural specifications & audit logs
├── prd.md            Product Requirements Document
├── tad.md            Technical Architecture Document
└── wbs_and_execution_plan.md  Work Breakdown Structure
```

---

## 📋 Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Python** | ≥ 3.12 | Backend API runtime |
| **Node.js** | ≥ 20 LTS | Frontend application & WebSocket runtime |
| **PostgreSQL** | ≥ 13 | Primary database (`gen_random_uuid()` enabled) |
| **Ollama** | latest | Local AI summarization & action extraction (`qwen2.5:7b-instruct`) |

---

## 🚀 Quick Start Guide

### 1. Backend Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Note: On Windows command prompt use: copy .env.example .env

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **API Documentation (Swagger UI):** [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)
- **API Documentation (ReDoc):** [http://127.0.0.1:8000/api/redoc](http://127.0.0.1:8000/api/redoc)
- **Health Check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

*(Note: In development without PostgreSQL, the backend defaults gracefully to a built-in mock store).*

---

### 2. Ollama AI Setup (Optional for local AI)

```bash
# Install Ollama from https://ollama.com
ollama pull qwen2.5:7b-instruct
# Runs by default on http://localhost:11434
```

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Note: On Windows command prompt use: copy .env.local.example .env.local

# Terminal 1: Next.js dev server (port 3000)
npm run dev

# Terminal 2: Real-time Yjs WebSocket collaboration server (port 1234)
npm run ws-server
```

- **Web App:** [http://localhost:3000](http://localhost:3000)
- **WebSocket Server:** `ws://localhost:1234`

---

## ✨ Features

- **Interactive Calendar (`/meetings`)**:
  - FullCalendar view with Month, Week, Day, and Resource Timeline views.
  - Interactive meeting creation, drag-and-drop rescheduling, and conflict detection.
  - Recurrence rule (RRULE) support.

- **Collaborative Meeting Workspace (`/meetings/:id`)**:
  - **Agenda**: Drag-and-drop reorderable items, allocated timeboxes, and real-time status transitions.
  - **Live Notes**: Real-time multi-user rich text collaboration powered by TipTap and Yjs CRDTs.
  - **Action Items**: Priority tracking, ownership assignment, deadline management, and external task conversions.
  - **Participants**: Attendance tracking, RSVPs, and role-based permissions.
  - **MoM Governance**: Formal Minutes of Meeting (MoM) sign-off workflow with SHA-256 integrity verification.
  - **AI Insights**: Automated meeting summarization, key decisions, and action item extraction via local Ollama.

---

## 🧪 Testing & Linting

### Frontend
```bash
cd frontend
npm run test    # Runs utility and logic unit test suites
npm run lint    # Runs Next.js ESLint verification
```

---

## 🔒 Security & Environment Variables

Never commit `.env` or `.env.local` files containing secrets to version control. Always copy from `.env.example` and `.env.local.example` and keep production credentials secure.
