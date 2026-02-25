#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SMOKE_ROOT="$ROOT/.tmp-smoke-root"
PORT="${CHRONOHAZE_SMOKE_PORT:-4174}"
BASE_URL="http://127.0.0.1:${PORT}/chronohaze/"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  rm -rf "$SMOKE_ROOT"
}
trap cleanup EXIT

rm -rf "$SMOKE_ROOT"
mkdir -p "$SMOKE_ROOT"
ln -s "$ROOT" "$SMOKE_ROOT/chronohaze"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$SMOKE_ROOT" >/tmp/chronohaze-playwright-structured-http.log 2>&1 &
SERVER_PID=$!

for _ in {1..30}; do
  if curl -sSf "${BASE_URL}index.html" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

export CHRONOHAZE_SMOKE_BASE_URL="$BASE_URL"
npx playwright test -c "$ROOT/playwright.smoke.config.js" --project=chromium "$ROOT/tests/structured-data.spec.js"
