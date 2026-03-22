#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 "$ROOT/scripts/rebuild_music_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/rebuild_music_detail_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/rebuild_math_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/rebuild_photo_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/rebuild_research_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/build_feed.py" --root "$ROOT"

# Build responsive image variants + manifest (AVIF/WebP when encoders are available).
bash "$ROOT/scripts/build_media_assets.sh" --skip-jpg

python3 "$ROOT/scripts/render_catalog_pages.py" --root "$ROOT"
python3 "$ROOT/scripts/build_social_cards_and_meta.py" --root "$ROOT"

python3 "$ROOT/scripts/rebuild_search_index.py" --root "$ROOT"
python3 "$ROOT/scripts/sanitize_public_contact_artifacts.py" --root "$ROOT"
