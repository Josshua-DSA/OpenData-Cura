#!/usr/bin/env bash
# ==============================================================================
# Cura HealthTrust — Daily RS & Alert Sync Runner (Host Linux Cron)
# Run every day at 03:00 WIB (Asia/Jakarta)
# ==============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$APP_DIR"

LOG_FILE="$APP_DIR/deploy/cron/cron_daily.log"
exec >> "$LOG_FILE" 2>&1

echo "=================================================="
echo "START DAILY RS & ALERT SYNC: $(date -Iseconds)"
echo "=================================================="

# Check and activate virtualenv if exists
if [ -d "$APP_DIR/.venv" ]; then
    source "$APP_DIR/.venv/bin/activate"
fi

# Run alert evaluation & pending geocoding
python database/cli.py evaluate-alerts || true
python database/cli.py geocode-pending --max 25 || true

echo "FINISHED DAILY RS & ALERT SYNC: $(date -Iseconds)"
echo "=================================================="
