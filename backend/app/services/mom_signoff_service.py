from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictException, NotFoundException
from app.models.mom_signoff import MoMSignOff
from app.models.participant import Participant
from app.schemas.mom_signoff import MoMSignOffCreate


def _compute_signature_hash(
    meeting_id: uuid.UUID,
    participant_id: uuid.UUID,
    signed_at: datetime,
    note_version: int,
) -> str:
    """
    Produces a deterministic SHA-256 hex digest binding all four inputs.
    Used as a tamper-evident audit trail — not a cryptographic signature.
    """
    payload = (
        f"{meeting_id}|{participant_id}|{signed_at.isoformat()}|{note_version}"
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def create_signoff(
    db: AsyncSession, data: MoMSignOffCreate
) -> MoMSignOff:
    # Verify participant belongs to meeting
    stmt = select(Participant).where(
        and_(
            Participant.id == data.participant_id,
            Participant.meeting_id == data.meeting_id,
        )
    )
    participant = (await db.execute(stmt)).scalar_one_or_none()
    if participant is None:
        raise NotFoundException(
            "Participant (in this meeting)", str(data.participant_id)
        )

    # Prevent duplicate sign-off for same note version
    existing_stmt = select(MoMSignOff).where(
        and_(
            MoMSignOff.meeting_id == data.meeting_id,
            MoMSignOff.participant_id == data.participant_id,
            MoMSignOff.note_version == data.note_version,
        )
    )
    if (await db.execute(existing_stmt)).scalar_one_or_none():
        raise ConflictException(
            f"Participant '{data.participant_id}' has already signed off "
            f"on version {data.note_version} of this MoM."
        )

    signed_at = datetime.now(timezone.utc)
    sig_hash = _compute_signature_hash(
        data.meeting_id, data.participant_id, signed_at, data.note_version
    )

    signoff = MoMSignOff(
        meeting_id=data.meeting_id,
        participant_id=data.participant_id,
        note_version=data.note_version,
        is_approved=data.is_approved,
        comments=data.comments,
        signed_at=signed_at,
        signature_hash=sig_hash,
    )
    db.add(signoff)
    await db.flush()
    await db.refresh(signoff)
    return signoff


async def get_signoff_status(
    db: AsyncSession, meeting_id: uuid.UUID
) -> Dict:
    # Total participants
    p_count_stmt = (
        select(func.count())
        .select_from(Participant)
        .where(Participant.meeting_id == meeting_id)
    )
    total_participants: int = (await db.execute(p_count_stmt)).scalar_one()

    # All sign-offs for this meeting
    s_stmt = select(MoMSignOff).where(MoMSignOff.meeting_id == meeting_id)
    signoffs: List[MoMSignOff] = (await db.execute(s_stmt)).scalars().all()

    signed_count = len(signoffs)
    all_approved = all(s.is_approved for s in signoffs) if signoffs else False

    return {
        "meeting_id": meeting_id,
        "total_participants": total_participants,
        "signed_count": signed_count,
        "pending_count": max(0, total_participants - signed_count),
        "all_approved": all_approved and signed_count == total_participants,
        "signoffs": signoffs,
    }


async def record_pdf_path(
    db: AsyncSession,
    signoff_id: uuid.UUID,
    pdf_path: str,
) -> MoMSignOff:
    stmt = select(MoMSignOff).where(MoMSignOff.id == signoff_id)
    signoff = (await db.execute(stmt)).scalar_one_or_none()
    if signoff is None:
        raise NotFoundException("MoMSignOff", str(signoff_id))
    signoff.pdf_path = pdf_path
    signoff.pdf_generated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(signoff)
    return signoff
