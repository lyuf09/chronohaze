#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Chronohaze checks =="
echo "Root: $ROOT"

echo
echo "[1/9] Site consistency"
python3 "$ROOT/scripts/check_site_consistency.py" --root "$ROOT"

echo
echo "[2/9] Music content drift (list+detail pages / catalogs / search-index)"
python3 "$ROOT/scripts/check_content_drift.py" --root "$ROOT"

echo
echo "[3/9] Math/Photo/Research catalog drift (page / catalog / search-index)"
python3 "$ROOT/scripts/check_catalog_drift.py" --root "$ROOT"

echo
echo "[4/9] Priority AVIF coverage"
python3 "$ROOT/scripts/check_priority_avif.py" --root "$ROOT"

echo
echo "[5/9] Broken links (internal + key external in CI)"
python3 "$ROOT/scripts/check_broken_links.py" --root "$ROOT"

echo
echo "[6/9] Critical page smoke test"
python3 "$ROOT/scripts/check_smoke_pages.py" --root "$ROOT"

echo
echo "[7/9] Performance budgets"
python3 "$ROOT/scripts/check_performance_budgets.py" --root "$ROOT"

echo
echo "[8/9] ALT coverage"
python3 "$ROOT/scripts/check_alt_coverage.py" --root "$ROOT"

echo
echo "[9/9] Shell script syntax"
bash -n "$ROOT/scripts/optimize_large_jpegs.sh"
bash -n "$ROOT/scripts/build_site_generated_assets.sh"
bash -n "$ROOT/scripts/build_media_assets.sh"
bash -n "$ROOT/scripts/run_playwright_smoke.sh"
bash -n "$ROOT/scripts/run_playwright_structured_data_check.sh"

echo
echo "OK: all checks passed"
