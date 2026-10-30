from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AIJobException, NotFoundException
from app.models.ai_job import AIJobStatus, AIJobType, AIProcessingJob
from app.models.action_item import ActionItem, ActionPriority, ActionStatus
from app.schemas.ai_job import AIJobCreate

settings = get_settings()

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------
_SUMMARIZE_PROMPT = """You are an expert meeting summarizer. Given the following meeting transcript or notes, produce a concise executive summary.

Respond ONLY with a valid JSON object in this exact structure:
{{
  "summary": "<2-5 paragraph executive summary>",
  "key_points": ["<key point 1>", "<key point 2>", "..."],
  "decisions_made": ["<decision 1>", "..."],
  "topics_discussed": ["<topic 1>", "..."]
}}

TRANSCRIPT:
{input_text}"""

_EXTRACT_ACTIONS_PROMPT = """You are an expert at extracting action items from meeting transcripts or notes.

Respond ONLY with a valid JSON object in this exact structure:
{{
  "action_items": [
    {{
      "title": "<short actionable title>",
      "description": "<detailed description>",
      "assignee_name": "<name or null>",
      "priority": "<low|medium|high|critical>",
      "due_date": "<ISO date YYYY-MM-DD or null>",
      "confidence_score": <0.0-1.0>
    }}
  ]
}}

TRANSCRIPT:
{input_text}"""

_FULL_PIPELINE_PROMPT = """You are an expert meeting analyst. Given the following meeting transcript or notes, produce both a summary and extract all action items.

Respond ONLY with a valid JSON object in this exact structure:
{{
  "summary": "<2-5 paragraph executive summary>",
  "key_points": ["<key point 1>", "..."],
  "decisions_made": ["<decision 1>", "..."],
  "topics_discussed": ["<topic 1>", "..."],
  "action_items": [
    {{
      "title": "<short actionable title>",
      "description": "<detailed description>",
      "assignee_name": "<name or null>",
      "priority": "<low|medium|high|critical>",
      "due_date": "<ISO date YYYY-MM-DD or null>",
      "confidence_score": <0.0-1.0>
    }}
  ]
}}

TRANSCRIPT:
{input_text}"""

_PROMPT_MAP: Dict[AIJobType, str] = {
    AIJobType.SUMMARIZE: _SUMMARIZE_PROMPT,
    AIJobType.EXTRACT_ACTIONS: _EXTRACT_ACTIONS_PROMPT,
    AIJobType.FULL_PIPELINE: _FULL_PIPELINE_PROMPT,
    AIJobType.SENTIMENT_ANALYSIS: _SUMMARIZE_PROMPT,  # fallback
}


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------
async def enqueue_job(db: AsyncSession, data: AIJobCreate) -> AIProcessingJob:
    job = AIProcessingJob(
        meeting_id=data.meeting_id,
        job_type=data.job_type,
        input_text=data.input_text,
        model_used=data.model_used,
        status=AIJobStatus.QUEUED,
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)
    return job


async def get_job(db: AsyncSession, job_id: uuid.UUID) -> AIProcessingJob:
    stmt = select(AIProcessingJob).where(AIProcessingJob.id == job_id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    if job is None:
        raise NotFoundException("AIProcessingJob", str(job_id))
    return job


async def list_jobs_for_meeting(
    db: AsyncSession, meeting_id: uuid.UUID
) -> List[AIProcessingJob]:
    stmt = (
        select(AIProcessingJob)
        .where(AIProcessingJob.meeting_id == meeting_id)
        .order_by(AIProcessingJob.created_at.desc())
    )
    return (await db.execute(stmt)).scalars().all()


async def _call_ollama(prompt: str, model: str) -> Dict[str, Any]:
    """
    Calls the Ollama /api/chat endpoint and returns the parsed JSON response body.
    Raises AIJobException on HTTP or parse errors.
    """
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "top_p": 0.9},
    }
    async with httpx.AsyncClient(
        base_url=settings.OLLAMA_BASE_URL,
        timeout=settings.OLLAMA_TIMEOUT_SECONDS,
    ) as client:
        response = await client.post("/api/chat", json=payload)
        if response.status_code != 200:
            raise AIJobException(
                f"Ollama returned HTTP {response.status_code}: {response.text[:500]}"
            )
        body = response.json()

    import json

    raw_content: str = body.get("message", {}).get("content", "")
    try:
        parsed = json.loads(raw_content)
    except (json.JSONDecodeError, ValueError) as exc:
        raise AIJobException(f"LLM returned non-JSON content: {raw_content[:300]}") from exc

    return {
        "output": parsed,
        "prompt_tokens": body.get("prompt_eval_count"),
        "completion_tokens": body.get("eval_count"),
        "duration_ms": int((body.get("total_duration", 0)) / 1_000_000),
    }


async def process_job(
    job_id: uuid.UUID,
    session_factory,  # async_sessionmaker[AsyncSession]
) -> None:
    """
    Background coroutine that processes a queued AIProcessingJob.
    Opens its own session so it is fully independent from the request session.
    """
    import json

    async with session_factory() as db:
        stmt = select(AIProcessingJob).where(AIProcessingJob.id == job_id)
        job: Optional[AIProcessingJob] = (await db.execute(stmt)).scalar_one_or_none()
        if job is None or job.status != AIJobStatus.QUEUED:
            return

        job.status = AIJobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc)
        await db.commit()

        prompt_template = _PROMPT_MAP.get(job.job_type, _FULL_PIPELINE_PROMPT)
        prompt = prompt_template.format(input_text=job.input_text)

        try:
            result = await _call_ollama(prompt, job.model_used)
            job.output_json = result["output"]
            job.prompt_tokens = result["prompt_tokens"]
            job.completion_tokens = result["completion_tokens"]
            job.duration_ms = result["duration_ms"]
            job.status = AIJobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc)

            # Auto-create ActionItems from extracted data
            if job.job_type in (AIJobType.EXTRACT_ACTIONS, AIJobType.FULL_PIPELINE):
                extracted: List[Dict] = result["output"].get("action_items", [])
                for raw in extracted:
                    ai_action = ActionItem(
                        meeting_id=job.meeting_id,
                        title=raw.get("title", "Untitled Action"),
                        description=raw.get("description"),
                        priority=ActionPriority(raw.get("priority", "medium")),
                        status=ActionStatus.OPEN,
                        source_ai_job_id=job.id,
                        ai_confidence_score=raw.get("confidence_score"),
                    )
                    db.add(ai_action)

        except Exception as exc:  # noqa: BLE001
            job.status = AIJobStatus.FAILED
            job.error_message = str(exc)
            job.completed_at = datetime.now(timezone.utc)

        await db.commit()
