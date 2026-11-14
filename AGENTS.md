# AGENTS.md

Cura / Tilik Jatim — health analytics platform for East Java. Monorepo: FastAPI backend, PostGIS data pipeline, Next.js frontend, ML artifacts.

## Layout
- `backend/app/` — FastAPI app (`main.py`), routers in `api/v1/endpoints/`, SQLAlchemy models, repositories, services.
- `database/` — ETL pipeline + CLI (`cli.py`), Alembic migrations (`migrations/`), seeds, clean exports (`exports/`), data-quality tests.
- `frontend/` — Next.js App Router. `src/app/page.tsx` dynamically mounts `src/App.tsx` with `ssr:false`; screens live in `src/views/`, shared UI in `src/components/`, static data in `src/data/`.
- `ml/` — model artifacts loaded at backend startup (`ML_ARTIFACT_DIR`, default `ml/artifacts`).
- `docs/` — integration notes; may be stale relative to code.

## Setup / run
```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r database/requirements.txt
pip install -r backend/requirements.txt
docker compose up -d                      # PostGIS on host port 5433
alembic upgrade head                      # schema source of truth
python database/cli.py init-db
python database/cli.py seed-wilayah
python database/cli.py seed-references
python database/cli.py seed-puskesmas
python database/cli.py seed-workforce
python database/cli.py seed-morbidity
python database/cli.py seed-kia
python database/cli.py seed-surveillance
python database/cli.py seed-alert-rules
python database/cli.py seed-indicators
python database/cli.py run-etl
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Frontend (separate terminal):
```powershell
cd frontend
npm install
$env:NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
npm run dev        # http://localhost:3001
```

## Tests
- Run from repo root: `pytest database/tests backend/tests -v`. Root `conftest.py` fixes `sys.path`, so no `PYTHONPATH` needed locally.
- Tests need a live, seeded PostGIS DB (port 5433). Backend `conftest.py` auto-creates backend-only auth/transaction tables.
- Single test: `pytest backend/tests/test_api_endpoints.py::test_name -v`.
- Frontend has no lint/typecheck script. Use `npx tsc --noEmit` and `npm run format` (oxfmt). Map consistency check: `npm run test:map`.
- CI (`.github/workflows/ci.yml`) runs database tests then backend tests against a PostGIS service; it seeds all domains first.

## Critical gotchas
- `JWT_SECRET_KEY` must be set and >=32 chars or the backend refuses to boot. `.env` is loaded from repo root.
- Schema is managed **only** by Alembic (`database/migrations/`). Do not reintroduce `Base.metadata.create_all` in app startup.
- DB defaults: `cura_db` / `cura_user` / `cura_password` on `localhost:5433`. Docker maps 5433→5432.
- Frontend `npm run start` listens on 3000; Docker publishes it on 3001. `npm run dev` uses 3001 directly.
- Frontend AI endpoint `src/app/api/v1/ask/route.ts` uses `GEMINI_API_KEY` from `frontend/.env.local`; without it, falls back to grounded local answers. Keep answers plain text (no markdown) per `cleanPlainText`.
- Map GeoJSON `frontend/public/geo/jatim-kabkota.geojson` must stay consistent with `src/data/healthData.ts` and `src/data/mapConfig.ts`; `npm run test:map` enforces 38 regions, clipping, and legend thresholds.
- Offline frontend data comes from `database/exports/*` copied to `frontend/public/data/`; live data uses `NEXT_PUBLIC_API_BASE_URL` + `/api/v1/*`.
- README claims the frontend is a placeholder — it is actually implemented. Trust code/config over prose.

## Conventions
- UI copy and AI answers are Indonesian; keep formal tone and WHO color palette (`#10B981` / `#F59E0B` / `#EF4444`).
- Backend API prefix is `/api/v1`; response envelope is `{ success, message?, data, meta? }`.
- Do not commit secrets (`.env`, `frontend/.env.local`) or generated artifacts (`database/raw/`, `database/logs/`, `data/pgdata/`).
