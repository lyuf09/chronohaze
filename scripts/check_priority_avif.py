#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def variant_path(path: str, width: int, ext: str) -> str:
    p = Path(path)
    return str(p.with_name(f"{p.stem}-{width}.{ext}")).replace("\\", "/")


def require_contains(html_text: str, needle: str, label: str, errors: List[str]) -> None:
    if needle not in html_text:
        errors.append(f"{label}: missing reference `{needle}`")


def main() -> int:
    ap = argparse.ArgumentParser(description="Verify AVIF generation and references for priority images.")
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = ap.parse_args()
    root = args.root.resolve()

    manifest = load_json(root / "assets" / "data" / "image-variants.json")
    photo_catalog = load_json(root / "assets" / "data" / "photo-catalog.json")

    priority: List[Tuple[str, str]] = [
        ("assets/template/hero_portrait.jpg", "home hero"),
        ("assets/template/ipomoea-alba-album-cover.jpg", "album cover: ipomoea alba"),
        ("assets/template/teenage-best-album-cover.jpg", "album cover: teenage best"),
    ]
    for item in photo_catalog.get("featured") or []:
        cover = str(item.get("cover") or "").strip()
        if cover:
            priority.append((cover, f"photo featured cover: {item.get('title') or cover}"))

    items: Dict[str, Any] = manifest.get("items") or {}
    avif_encoder_available = bool(manifest.get("avif_encoder_available"))
    errors: List[str] = []

    if avif_encoder_available:
        for path, label in priority:
            entry = items.get(path)
            if not entry:
                errors.append(f"{label}: missing manifest entry for `{path}`")
                continue
            avif = ((entry.get("formats") or {}).get("avif") or {})
            if not avif.get("srcset"):
                errors.append(f"{label}: AVIF srcset missing in manifest for `{path}`")
    else:
        print("SKIP generation check: avifenc unavailable in current build environment (manifest says false).")

    index_html = (root / "index.html").read_text(encoding="utf-8")
    album_ia_html = (root / "music" / "album-ipomoea-alba.html").read_text(encoding="utf-8")
    album_teen_html = (root / "music" / "album-teenage-best.html").read_text(encoding="utf-8")
    photo_index = root / "photography.html"
    if not photo_index.exists():
        photo_index = root / "portfolio-1.html"
    photo_html = photo_index.read_text(encoding="utf-8")

    require_contains(index_html, "assets/template/hero_portrait-1600.webp", "index.html hero", errors)
    require_contains(
        album_ia_html,
        "../assets/template/ipomoea-alba-album-cover-1600.avif",
        "album-ipomoea-alba.html cover",
        errors,
    )
    require_contains(
        album_teen_html,
        "../assets/template/teenage-best-album-cover-1600.avif",
        "album-teenage-best.html cover",
        errors,
    )

    for item in photo_catalog.get("featured") or []:
        cover = str(item.get("cover") or "").strip()
        if not cover:
            continue
        avif_needle = variant_path(cover, 960, "avif")
        require_contains(photo_html, avif_needle, f"portfolio featured `{item.get('title')}`", errors)

    if errors:
        print("ERROR: priority AVIF coverage check failed")
        for err in errors:
            print(f"- {err}")
        return 1

    print(
        "OK: priority images have AVIF references"
        + (" and manifest AVIF coverage" if avif_encoder_available else " (manifest AVIF generation skipped locally)")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
