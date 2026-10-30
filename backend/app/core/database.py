from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Optional

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()

engine: Optional[AsyncEngine] = None
AsyncSessionLocal: Optional[async_sessionmaker[AsyncSession]] = None

if not settings.USE_MOCK_DATA:
    try:
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.APP_ENV == "development",
            future=True,
            poolclass=NullPool,
        )
        AsyncSessionLocal = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
    except Exception:
        engine = None
        AsyncSessionLocal = None


# ---------------------------------------------------------------------------
# FastAPI dependency — yields a session per request, rolls back on error
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ---------------------------------------------------------------------------
# Lifespan helpers
# ---------------------------------------------------------------------------
async def init_db() -> None:
    """
    Called once at application startup.
    In production, Alembic handles migrations; this is a safety net.
    """
    if engine is None:
        return
    import logging
    logger = logging.getLogger(__name__)
    try:
        from app.models.base import Base  # local import to avoid circular deps

        async with engine.begin() as conn:
            # Creates tables only if they don't exist — non-destructive
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        logger.warning(
            "Could not connect to PostgreSQL on startup (%s). Server starting in resilient mode.",
            exc,
        )


async def close_db() -> None:
    """Dispose engine connection pool on shutdown."""
    if engine is not None:
        await engine.dispose()
