from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.ai_job import AIJobStatus, AIJobType


class AIJobCreate(BaseModel):
    meeting_id: uuid.UUID
    job_type: AIJobType
    input_text: str = Field(..., min_length=10)
    model_used: str = Field(default="qwen2.5:7b-instruct", max_length=128)


class AIJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meeting_id: uuid.UUID
    job_type: AIJobType
    status: AIJobStatus
    model_used: str
    output_json: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    duration_ms: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class AIJobStatusResponse(BaseModel):
    """Lightweight polling response — no heavy output_json."""
    id: uuid.UUID
    status: AIJobStatus
    duration_ms: Optional[int] = None
    error_message: Optional[str] = None
