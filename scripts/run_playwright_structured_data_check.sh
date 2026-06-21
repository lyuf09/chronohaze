#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SMOKE_ROOT="$ROOT/.tmp-smoke-root"
PORT="${CHRONOHAZE_SMOKE_PORT:-4174}"
SCHEME="${CHRONOHAZE_SMOKE_SCHEME:-https}"
if [[ "$SCHEME" != "http" && "$SCHEME" != "https" ]]; then
  echo "ERROR: CHRONOHAZE_SMOKE_SCHEME must be either 'http' or 'https'" >&2
  exit 1
fi
BASE_URL="${SCHEME}://127.0.0.1:${PORT}/chronohaze/"

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
    --key "$KEY_FILE" >/tmp/chronohaze-playwright-structured-https.log 2>&1 &
  CURL_ARGS=(-k -sSf)
  export CHRONOHAZE_SMOKE_IGNORE_HTTPS_ERRORS=1
else
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$SMOKE_ROOT" >/tmp/chronohaze-playwright-structured-http.log 2>&1 &
  CURL_ARGS=(-sSf)
fi
SERVER_PID=$!

SERVER_READY=0
for _ in {1..30}; do
  if curl "${CURL_ARGS[@]}" "${BASE_URL}index.html" >/dev/null 2>&1; then
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
npx playwright test -c "$ROOT/playwright.smoke.config.js" --project=chromium "$ROOT/tests/structured-data.spec.js"
