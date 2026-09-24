#!/usr/bin/env bash
set -euo pipefail
set -m

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="${YOLO_PY:-/opt/homebrew/Caskroom/miniconda/base/envs/yolo/bin/python3.12}"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-5173}"

trap 'kill -- "-$API_PID" "-$WEB_PID" 2>/dev/null' EXIT INT TERM

printf '→ API      http://localhost:%s/health\n' "$API_PORT"
printf '→ Frontend http://localhost:%s\n' "$WEB_PORT"

"$PY" -m uvicorn backend.main:app --app-dir "$ROOT" --host 127.0.0.1 --port "$API_PORT" >> "$ROOT/.dev-api.log" 2>&1 &
API_PID=$!

npm --prefix "$ROOT/frontend" run dev -- --port "$WEB_PORT" >> "$ROOT/.dev-web.log" 2>&1 &
WEB_PID=$!

wait