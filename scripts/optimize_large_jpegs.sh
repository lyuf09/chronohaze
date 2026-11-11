#!/bin/zsh
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
QUALITY="${JPEG_QUALITY:-92}"

files=(
  "$ROOT/assets/template/photo-bottom-5710.jpg"
  "$ROOT/assets/template/hero_portrait.jpg"
  "$ROOT/assets/template/teenage-best-album-cover.jpg"
  "$ROOT/assets/template/about_branches.jpg"
  "$ROOT/assets/template/ipomoea-alba-album-cover.jpg"
)

function dims() {
  local f="$1"
  local w h
  w=$(sips -g pixelWidth "$f" 2>/dev/null | awk '/pixelWidth/ {print $2}')
  h=$(sips -g pixelHeight "$f" 2>/dev/null | awk '/pixelHeight/ {print $2}')
  echo "${w}x${h}"
}

echo "Optimizing JPEGs (quality=${QUALITY}) under: $ROOT"

for f in "${files[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "skip missing: $f"
    continue
  fi

  before_size=$(stat -f '%z' "$f")
  before_dims=$(dims "$f")
  tmp=$(mktemp "/tmp/chrono-jpeg-XXXXXX.jpg")

  sips -s format jpeg -s formatOptions "$QUALITY" "$f" --out "$tmp" >/dev/null

  after_size=$(stat -f '%z' "$tmp")
  after_dims=$(dims "$tmp")

  if [[ "$before_dims" != "$after_dims" ]]; then
    echo "ERROR dimension changed: $f ($before_dims -> $after_dims)"
    rm -f "$tmp"
    exit 1
  fi

  if (( after_size < before_size )); then
    mv "$tmp" "$f"
    printf 'optimized %-70s %10d -> %10d  (%s)\n' "${f#$ROOT/}" "$before_size" "$after_size" "$before_dims"
  else
    rm -f "$tmp"
    printf 'kept      %-70s %10d -> %10d  (%s)\n' "${f#$ROOT/}" "$before_size" "$after_size" "$before_dims"
  fi
done
