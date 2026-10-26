# Tilik Jatim frontend

This UI is built with Next.js App Router. The imported Figma Make screens are kept as client-side views under `src/views` and are mounted from `src/app/page.tsx`.

## Run locally

```powershell
npm install
$env:NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
npm run dev
```

Open `http://localhost:3001`. The dashboard summary and AI Insight use the FastAPI endpoints described in `../docs/FRONTEND_INTEGRATION_NOTES.md`. Analytics CSVs from `database/exports` are bundled under `public/data` as the offline data source, including regional program recommendations.

For Docker Compose, Next.js listens on container port 3000; `docker-compose.yml` publishes it on host port 3001.
