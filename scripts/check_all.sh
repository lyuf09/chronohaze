#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Chronohaze checks =="
echo "Root: $ROOT"

echo
echo "[1/3] Site consistency"
python3 "$ROOT/scripts/check_site_consistency.py" --root "$ROOT"

echo
echo "[2/3] Music content drift (page / catalog / search-index)"
python3 "$ROOT/scripts/check_content_drift.py" --root "$ROOT"

echo
echo "[3/3] Shell script syntax"
bash -n "$ROOT/scripts/optimize_large_jpegs.sh"

echo
echo "OK: all checks passed"
