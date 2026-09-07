"""Pytest configuration for backend tests.

Provides a strong JWT secret for the test environment so that the security
guard in `backend/app/core/config.py` (which refuses to boot with an insecure
default) is satisfied WITHOUT requiring a .env file in CI or a clean machine.

Also ensures backend-only tables (auth_users, auth_sessions, trx_*) exist
on the test database.  These tables live only in the backend models — they are
NOT created by `database/cli.py init-db` (which only touches domain/data
tables).  On a fresh CI database the auth tests would fail with
"relation auth_users does not exist" without this bootstrap.
"""
import os

# 32+ char secret used ONLY for tests/dev — never for production.
os.environ.setdefault(
    "JWT_SECRET_KEY",
    "test_only_jwt_secret_key_0123456789_abcdefghijklmnop",
)

# ---------------------------------------------------------------------------
# Ensure backend-only tables exist on the test DB
# ---------------------------------------------------------------------------
import asyncio
from sqlalchemy import text
from backend.app.core.database import async_engine, Base

# Force registration of backend-only models so Base.metadata knows them.
import backend.app.models.auth  # noqa: F401
import backend.app.models.transaksi  # noqa: F401


def _create_backend_tables() -> None:
    """Create any tables owned by the backend that are missing in the DB.

    Uses run_sync through the async engine so it works with the asyncpg
    driver already configured in database.py.
    """
    async def _inner():
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    asyncio.get_event_loop().run_until_complete(_inner())


# Run once at import time (session-scoped, before any test collection).
try:
    _create_backend_tables()
except Exception:
    # If DB is unreachable (e.g. read-only endpoint tests), swallow silently;
    # tests that actually need these tables will fail with a clear message.
    pass
