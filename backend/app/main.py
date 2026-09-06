import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from sqlalchemy import text

from backend.app.core.config import settings
from backend.app.core.database import async_engine
from backend.app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify DB connectivity only.
    # Schema is managed exclusively by Alembic migrations (database/migrations/).
    # create_all was removed to avoid a second, divergent schema source of truth.
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:  # pragma: no cover - environment-specific
        raise RuntimeError(
            "Cannot reach database. Ensure PostGIS is up (port 5433) and "
            "Alembic migrations have been applied: `alembic upgrade head`."
        ) from e
    yield
    # Shutdown: Dispose DB connection pool
    await async_engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API platform analitik geospasial & layanan fasilitas kesehatan terintegrasi Jawa Timur (Cura).",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Response Time Logging Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = f"{process_time * 1000:.2f}ms"
    return response


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal server error occurred.",
            "detail": str(exc) if settings.DEBUG else None,
        },
    )


# Health Check Endpoints
@app.get("/health", tags=["Health & Status"])
async def root_health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "PostgreSQL 15 + PostGIS 3.3 (Connected)",
    }


@app.get(f"{settings.API_V1_STR}/health", tags=["Health & Status"])
async def api_health_check():
    return {
        "status": "ok",
        "api_version": "v1",
        "timestamp": time.time(),
    }


# Mount API v1 Routes
app.include_router(api_router, prefix=settings.API_V1_STR)
