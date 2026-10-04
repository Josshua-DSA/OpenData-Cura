#!/usr/bin/env bash
# ==============================================================================
# Cura HealthTrust — Weekly Open Data & Macro Indicators ETL Runner
# Run every Sunday at 01:00 WIB (Asia/Jakarta)
# ==============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$APP_DIR"

LOG_FILE="$APP_DIR/deploy/cron/cron_weekly.log"
exec >> "$LOG_FILE" 2>&1

echo "=================================================="
echo "START WEEKLY OPEN DATA ETL: $(date -Iseconds)"
echo "=================================================="

# Check and activate virtualenv if exists
if [ -d "$APP_DIR/.venv" ]; then
    source "$APP_DIR/.venv/bin/activate"
fi

# Run full ETL pipeline + KPI evaluation + feature building
python database/cli.py run-etl || true
python database/cli.py evaluate-kpi || true
python database/cli.py build-ml-features || true

echo "FINISHED WEEKLY OPEN DATA ETL: $(date -Iseconds)"
echo "=================================================="
