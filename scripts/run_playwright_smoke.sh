#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${CHRONOHAZE_SMOKE_PORT:-4173}"
SCHEME="${CHRONOHAZE_SMOKE_SCHEME:-https}"
if [[ "$SCHEME" != "http" && "$SCHEME" != "https" ]]; then
  echo "ERROR: CHRONOHAZE_SMOKE_SCHEME must be either 'http' or 'https'" >&2
  exit 1
fi
BASE_URL="${SCHEME}://127.0.0.1:${PORT}/chronohaze/"
SMOKE_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/chronohaze-runtime.XXXXXX")"
RESULTS_DIR="$ROOT/test-results/$(basename "$SMOKE_ROOT")"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  rm -rf "$SMOKE_ROOT"
}
trap cleanup EXIT

mkdir -p "$RESULTS_DIR"
ln -s "$ROOT" "$SMOKE_ROOT/chronohaze"
READY_FILE=".ready-$(basename "$SMOKE_ROOT")"
touch "$SMOKE_ROOT/$READY_FILE"

if [[ "$SCHEME" == "https" ]]; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "ERROR: openssl is required for HTTPS smoke tests" >&2
    exit 1
  fi
  CERT_DIR="$SMOKE_ROOT/.cert"
  mkdir -p "$CERT_DIR"
  CERT_CONF="$CERT_DIR/localhost.cnf"
  CERT_FILE="$CERT_DIR/localhost.crt"
  KEY_FILE="$CERT_DIR/localhost.key"
  cat >"$CERT_CONF" <<'EOF'
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
EOF
  openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
    -keyout "$KEY_FILE" -out "$CERT_FILE" -config "$CERT_CONF" >/dev/null 2>&1
  python3 "$ROOT/scripts/serve_smoke_https.py" \
    --port "$PORT" \
    --directory "$SMOKE_ROOT" \
    --cert "$CERT_FILE" \
    --key "$KEY_FILE" >"$RESULTS_DIR/server.log" 2>&1 &
  CURL_ARGS=(-k -sSf)
  export CHRONOHAZE_SMOKE_IGNORE_HTTPS_ERRORS=1
else
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$SMOKE_ROOT" >"$RESULTS_DIR/server.log" 2>&1 &
  CURL_ARGS=(-sSf)
fi
SERVER_PID=$!

# Give the local server a brief moment to come up.
SERVER_READY=0
for _ in {1..30}; do
  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    cat "$RESULTS_DIR/server.log" >&2
    echo "ERROR: smoke-test server exited before becoming ready" >&2
    exit 1
  fi
  if curl "${CURL_ARGS[@]}" "${SCHEME}://127.0.0.1:${PORT}/${READY_FILE}" >/dev/null 2>&1; then
    SERVER_READY=1
    break
  fi
  sleep 0.2
done
if [[ "$SERVER_READY" != "1" ]]; then
  echo "ERROR: smoke-test server did not become ready at ${BASE_URL}" >&2
  exit 1
fi

export CHRONOHAZE_SMOKE_BASE_URL="$BASE_URL"
PLAYWRIGHT_CMD=(npx playwright test -c "$ROOT/playwright.smoke.config.js" --output "$RESULTS_DIR/artifacts")
if [[ -n "${CHRONOHAZE_SMOKE_PROJECTS:-}" ]]; then
  IFS=',' read -r -a _projects <<<"${CHRONOHAZE_SMOKE_PROJECTS}"
  for _project in "${_projects[@]}"; do
    _project="${_project//[[:space:]]/}"
    if [[ -n "$_project" ]]; then
      PLAYWRIGHT_CMD+=("--project=$_project")
    fi
  done
fi
PLAYWRIGHT_CMD+=("$ROOT/tests/runtime-smoke.spec.js")
"${PLAYWRIGHT_CMD[@]}" "$@"
