#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_PORT="${WEB_PORT:-5173}"

printf '→ Frontend http://localhost:%s\n' "$WEB_PORT"
npm --prefix "$ROOT/frontend" run dev -- --port "$WEB_PORT"
