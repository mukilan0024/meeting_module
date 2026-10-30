"""
Alembic env.py — wired to the async SQLAlchemy engine.

Key decisions:
- Uses `run_sync` with a synchronous psycopg2 connection for offline mode
  (Alembic's migration runner is inherently sync).
- For online mode, wraps the async engine via `AsyncConnection.run_sync`.
- All model metadata is imported via app.models to guarantee Alembic
  detects every table in autogenerate mode.
"""
from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# ── Load application settings & all models ───────────────────────────────────
import sys
import os

# Ensure the project root (backend/) is on sys.path so `app.*` imports resolve
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings          # noqa: E402
from app.models import Base                        # noqa: E402  (imports all models)

# ---------------------------------------------------------------------------
settings = get_settings()
config = context.config

# Override the SQLAlchemy URL from settings (never hard-coded in alembic.ini)
config.set_main_option("sqlalchemy.url", settings.SYNC_DATABASE_URL)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata object containing all table definitions
target_metadata = Base.metadata


# ---------------------------------------------------------------------------
# Offline migrations (generate SQL scripts without a live DB connection)
# ---------------------------------------------------------------------------
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online migrations (run against a live DB connection)
# ---------------------------------------------------------------------------
def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Build an async engine from config, then hand a synchronous connection
    to the Alembic context via run_sync.
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        # Override URL to use the async driver for online mode
        url=settings.DATABASE_URL,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
