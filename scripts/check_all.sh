#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Chronohaze checks =="
echo "Root: $ROOT"

echo
echo "[1/10] Site consistency"
python3 "$ROOT/scripts/check_site_consistency.py" --root "$ROOT"

echo
echo "[2/10] Music content drift (list+detail pages / catalogs / search-index)"
python3 "$ROOT/scripts/check_content_drift.py" --root "$ROOT"

echo
echo "[3/10] Math/Photo/Research catalog drift (page / catalog / search-index)"
python3 "$ROOT/scripts/check_catalog_drift.py" --root "$ROOT"

echo
echo "[4/10] Priority AVIF coverage"
python3 "$ROOT/scripts/check_priority_avif.py" --root "$ROOT"

echo
if [[ "${CHRONOHAZE_CHECK_EXTERNAL_LINKS:-0}" == "1" ]]; then
  echo "[5/10] Broken links (internal + key external)"
  python3 "$ROOT/scripts/check_broken_links.py" --root "$ROOT" --check-external
else
  echo "[5/10] Broken links (internal only; external moved to nightly/manual)"
  python3 "$ROOT/scripts/check_broken_links.py" --root "$ROOT" --skip-external
fi

echo
echo "[6/10] Critical page smoke test"
python3 "$ROOT/scripts/check_smoke_pages.py" --root "$ROOT"

echo
echo "[7/10] Performance budgets"
python3 "$ROOT/scripts/check_performance_budgets.py" --root "$ROOT"

echo
echo "[8/10] ALT coverage"
python3 "$ROOT/scripts/check_alt_coverage.py" --root "$ROOT"

echo
echo "[9/10] Public contact leak grep"
EMAIL_LOCAL="feier530"
EMAIL_DOMAIN_REGEX="icloud\\.com"
EMAIL_PATTERN="${EMAIL_LOCAL}@${EMAIL_DOMAIN_REGEX}"
PUBLIC_CONTACT_SCAN_TARGETS=(
  "$ROOT"/*.html
  "$ROOT/assets/search-index.json"
  "$ROOT/assets/search-data"
  "$ROOT/music"
  "$ROOT/notes"
  "$ROOT/photo"
  "$ROOT/post"
)
if rg -n "${EMAIL_PATTERN}|mailto:${EMAIL_PATTERN}" \
  "${PUBLIC_CONTACT_SCAN_TARGETS[@]}" >/dev/null 2>&1; then
  echo "ERROR: raw public email found in public site artifacts"
  rg -n "${EMAIL_PATTERN}|mailto:${EMAIL_PATTERN}" \
    "${PUBLIC_CONTACT_SCAN_TARGETS[@]}"
  exit 1
fi

echo
echo "[10/10] Shell script syntax"
bash -n "$ROOT/scripts/optimize_large_jpegs.sh"
bash -n "$ROOT/scripts/build_site_generated_assets.sh"
bash -n "$ROOT/scripts/build_media_assets.sh"
bash -n "$ROOT/scripts/run_playwright_smoke.sh"
bash -n "$ROOT/scripts/run_playwright_structured_data_check.sh"

echo
echo "OK: all checks passed"
