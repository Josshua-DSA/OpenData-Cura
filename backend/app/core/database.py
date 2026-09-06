from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool

from backend.app.core.config import settings

# Single source of truth for schema: database/models.py
# Backend reuses the same declarative Base so there is exactly ONE
# metadata and no divergent table definitions between ETL and API.
from database.models import Base  # noqa: F401  (re-exported)

# Async Engine for FastAPI Endpoints
async_engine = create_async_engine(
    settings.ASYNC_DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    poolclass=NullPool,  # NullPool avoids loop-attachment issues across async tests and worker tasks
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base Declarative Model (re-exported from database.models; no local redeclare)
# Base = declarative_base()  — REMOVED: single source of truth is database.models.Base


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI Dependency to provide per-request AsyncSession.
    Ensures safe rollback on exception and clean close on completion.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
