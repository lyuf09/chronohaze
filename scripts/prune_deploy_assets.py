#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


TEXT_SUFFIXES = {".html", ".css", ".js", ".json", ".xml"}
AUDIO_SUFFIXES = {".mp3", ".m4a", ".wav", ".ogg"}
RASTER_SUFFIXES = {".jpg", ".jpeg", ".png"}


def build_reference_corpus(site: Path) -> str:
    chunks: list[str] = []
    ignored = site / "assets" / "data" / "image-variants.json"
    for path in site.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES or path == ignored:
            continue
        chunks.append(path.read_text(encoding="utf-8", errors="ignore"))
    return "\n".join(chunks)


def has_webp_variant(path: Path) -> bool:
    return any(path.with_name(f"{path.stem}-{width}.webp").is_file() for width in (960, 1600))


def is_referenced(path: Path, site: Path, corpus: str) -> bool:
    relative = path.relative_to(site).as_posix()
    return relative in corpus or path.name in corpus


def referenced_image_variants(site: Path, corpus: str) -> set[str]:
    manifest = site / "assets" / "data" / "image-variants.json"
    if not manifest.is_file():
        return set()
    payload = json.loads(manifest.read_text(encoding="utf-8"))
    variants: set[str] = set()
    for original, entry in payload.get("items", {}).items():
        if not is_referenced(site / original, site, corpus):
            continue
        for image_format in entry.get("formats", {}).values():
            variants.update(image_format.get("files", []))
    return variants


def main() -> int:
    parser = argparse.ArgumentParser(description="Remove unreachable source assets from a Pages artifact")
    parser.add_argument("--site", type=Path, required=True)
    parser.add_argument("--max-bytes", type=int, default=1_000_000_000)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    site = args.site.resolve()
    if not site.is_dir():
        raise SystemExit(f"Site directory does not exist: {site}")

    corpus = build_reference_corpus(site)
    image_variants = referenced_image_variants(site, corpus)
    candidates: list[Path] = []
    for path in site.rglob("*"):
        if not path.is_file() or is_referenced(path, site, corpus):
            continue
        suffix = path.suffix.lower()
        unused_webp = suffix == ".webp" and path.relative_to(site).as_posix() not in image_variants
        if suffix in AUDIO_SUFFIXES or unused_webp or (suffix in RASTER_SUFFIXES and has_webp_variant(path)):
            candidates.append(path)

    removed_bytes = sum(path.stat().st_size for path in candidates)
    if not args.dry_run:
        for path in candidates:
            path.unlink()

    final_bytes = sum(path.stat().st_size for path in site.rglob("*") if path.is_file())
    action = "Would prune" if args.dry_run else "Pruned"
    print(f"{action} {len(candidates)} unreachable deploy assets ({removed_bytes} bytes)")
    print(f"Deploy site payload: {final_bytes} / {args.max_bytes} bytes")
    if not args.dry_run and final_bytes > args.max_bytes:
        print("ERROR: deploy site still exceeds the configured payload budget")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
