#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 "$ROOT/scripts/rebuild_music_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/rebuild_music_detail_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/rebuild_math_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/rebuild_photo_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/rebuild_research_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/build_feed.py" --root "$ROOT"

# Build responsive image variants + manifest. The deployed pages currently
# reference WebP/JPG fallbacks, while generated AVIF files are not uploaded by
# the Pages workflow; keep AVIF opt-in so CI does not spend minutes generating
# unused artifacts.
MEDIA_ARGS=(--skip-jpg)
if [[ "${CHRONOHAZE_GENERATE_AVIF:-0}" != "1" ]]; then
  MEDIA_ARGS+=(--skip-avif)
fi
bash "$ROOT/scripts/build_media_assets.sh" "${MEDIA_ARGS[@]}"

python3 "$ROOT/scripts/render_catalog_pages.py" --root "$ROOT"
python3 "$ROOT/scripts/build_social_cards_and_meta.py" --root "$ROOT"

python3 "$ROOT/scripts/rebuild_search_index.py" --root "$ROOT"
python3 "$ROOT/scripts/sanitize_public_contact_artifacts.py" --root "$ROOT"
python3 "$ROOT/scripts/build_minified_assets.py" --root "$ROOT"
