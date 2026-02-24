#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 "$ROOT/scripts/rebuild_music_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/rebuild_math_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/rebuild_photo_catalog.py" --root "$ROOT"
python3 "$ROOT/scripts/rebuild_research_catalog.py" --root "$ROOT"

# Build responsive image variants + manifest (AVIF/WebP when encoders are available).
bash "$ROOT/scripts/build_media_assets.sh" --skip-jpg

python3 "$ROOT/scripts/rebuild_search_index.py" --root "$ROOT"
