# Backend FastAPI — Cura HealthTrust
# Build:  docker build -t cura-backend -f backend/Dockerfile .
# Run:    docker run --rm -p 8000:8000 --env-file .env cura-backend

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps for psycopg2 & shapely/geos (PostGIS geometry)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (layer cache-friendly)
COPY backend/requirements.txt backend/requirements.txt
COPY database/requirements.txt database/requirements.txt
RUN pip install --upgrade pip \
    && pip install -r backend/requirements.txt \
    && pip install -r database/requirements.txt

# Copy application code (repo root needed for `backend.*` and `database.*` imports)
COPY . .

EXPOSE 8000

# Default command. Provide DB_* and JWT_SECRET_KEY via --env-file / environment.
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
