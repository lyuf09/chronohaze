#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Chronohaze checks =="
echo "Root: $ROOT"

echo
echo "[1/4] Site consistency"
python3 "$ROOT/scripts/check_site_consistency.py" --root "$ROOT"

echo
echo "[2/4] Music content drift (page / catalog / search-index)"
python3 "$ROOT/scripts/check_content_drift.py" --root "$ROOT"

echo
echo "[3/4] Math/Photo/Research catalog drift (page / catalog / search-index)"
python3 "$ROOT/scripts/check_catalog_drift.py" --root "$ROOT"

echo
echo "[4/4] Shell script syntax"
bash -n "$ROOT/scripts/optimize_large_jpegs.sh"
bash -n "$ROOT/scripts/build_site_generated_assets.sh"
bash -n "$ROOT/scripts/build_media_assets.sh"

echo
echo "OK: all checks passed"
