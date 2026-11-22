#!/usr/bin/env bash
# Starts the API and the production build of the site, runs the browser tests, then stops both.
# Needs: backend deps installed (pip install -r backend/requirements.txt) and `npm run build` done.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)/.."
WORK="$(mktemp -d)"
PYTHON="${PYTHON:-python3}"
APP_PORT="${E2E_APP_PORT:-3100}"
trap 'kill $API_PID $WEB_PID 2>/dev/null || true; rm -rf "$WORK"' EXIT

(cd "$ROOT/backend" && \
  DATABASE_URL="sqlite:///$WORK/e2e.db" UPLOAD_DIR="$WORK/uploads" ENV=development \
  SECRET_KEY="e2e-only-secret-0123456789-0123456789" CORS_ORIGINS="http://localhost:$APP_PORT" \
  FRONTEND_URL="http://localhost:$APP_PORT" RATE_LIMIT_ENABLED=false \
  exec "$PYTHON" -m uvicorn app.main:app --port 8000 --log-level warning) &
API_PID=$!

cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true
if [ ! -f .next/standalone/server.js ]; then echo "No production build found. Run: npm run build" >&2; exit 1; fi
PORT="$APP_PORT" node .next/standalone/server.js >"$WORK/web.log" 2>&1 &
WEB_PID=$!

ready=0
for i in $(seq 1 40); do
  if curl -fsS localhost:8000/api/ready >/dev/null 2>&1 && curl -fsS "localhost:$APP_PORT/" >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [ "$ready" != 1 ]; then echo "Servers did not become ready. Web log:" >&2; cat "$WORK/web.log" >&2; exit 1; fi
export E2E_APP_URL="http://localhost:$APP_PORT"
# E2E_COMMAND lets other scripts (like screenshot capture) reuse the same server setup.
if [ -n "${E2E_COMMAND:-}" ]; then eval "$E2E_COMMAND"; else npx vitest run --config vitest.e2e.config.mts "$@"; fi
