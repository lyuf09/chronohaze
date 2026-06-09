#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def file_size(path: Path) -> int:
    return path.stat().st_size


def check_file_budget(root: Path, rel: str, max_bytes: int, label: str, errors: List[str]) -> None:
    path = root / rel
    if not path.exists():
        errors.append(f"{label}: missing file `{rel}`")
        return
    size = file_size(path)
    if size > max_bytes:
        errors.append(f"{label}: {size} bytes exceeds budget {max_bytes} bytes (`{rel}`)")


def variant_path(rel: str, width: int, ext: str) -> str:
    p = Path(rel)
    return str(p.with_name(f"{p.stem}-{width}.{ext}")).replace("\\", "/")


def main() -> int:
    ap = argparse.ArgumentParser(description="Lightweight performance budget checks for Chronohaze")
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = ap.parse_args()
    root = args.root.resolve()

    errors: List[str] = []
    notes: List[str] = []

    # Core JS/CSS/HTML file budgets. These track the generated site baseline with modest
    # headroom so the check catches real bloat instead of failing every content polish pass.
    file_budgets: List[Tuple[str, int, str]] = [
        ("protect-media.min.js", 560_000, "core frontend runtime bundle"),
        ("styles.min.css", 320_000, "global styles"),
        ("home.min.css", 48_000, "home page styles"),
        ("assets/js/search-page.min.js", 60_000, "search page runtime"),
        ("assets/js/structured-data.min.js", 20_000, "structured data module"),
        ("assets/js/music-detail-transcript.min.js", 15_000, "music transcript module"),
        ("index.html", 66_000, "home page HTML"),
        ("music.html", 35_000, "music index HTML"),
        ("search.html", 240_000, "search page HTML"),
    ]
    for rel, max_bytes, label in file_budgets:
        check_file_budget(root, rel, max_bytes, label, errors)

    # Aggregate budgets to detect slow growth across multiple files.
    aggregate_groups: List[Tuple[str, List[str], int]] = [
        (
                "core JS payload (checked modules)",
                [
                "protect-media.min.js",
                "assets/js/search-page.min.js",
                "assets/js/catalog-pages.min.js",
                "assets/js/research-page.min.js",
                "assets/js/music-detail-transcript.min.js",
                "assets/js/structured-data.min.js",
                ],
            680_000,
        ),
        ("key CSS payload", ["styles.min.css", "home.min.css"], 365_000),
    ]
    for label, rels, max_bytes in aggregate_groups:
        total = 0
        for rel in rels:
            path = root / rel
            if not path.exists():
                errors.append(f"{label}: missing file `{rel}`")
                continue
            total += path.stat().st_size
        if total > max_bytes:
            errors.append(f"{label}: {total} bytes exceeds budget {max_bytes} bytes")
        else:
            notes.append(f"{label}: {total} / {max_bytes} bytes")

    # Priority visual assets (responsive variants used in LCP / key landing pages).
    manifest_path = root / "assets" / "data" / "image-variants.json"
    photo_catalog_path = root / "assets" / "data" / "photo-catalog.json"
    if not manifest_path.exists():
        errors.append("image variants manifest missing: `assets/data/image-variants.json`")
    else:
        manifest = load_json(manifest_path)
        items = (manifest.get("items") or {}) if isinstance(manifest, dict) else {}
        avif_encoder_available = bool(manifest.get("avif_encoder_available")) if isinstance(manifest, dict) else False

        priority_webp_budgets: List[Tuple[str, int, str]] = [
            ("assets/template/hero_portrait.jpg", 220_000, "home hero 1600 webp"),
            ("assets/template/ipomoea-alba-album-cover.jpg", 350_000, "ipomoea alba album cover 1600 webp"),
            ("assets/template/teenage-best-album-cover.jpg", 1_100_000, "teenage best album cover 1600 webp"),
        ]
        for src_rel, max_bytes, label in priority_webp_budgets:
            webp_rel = variant_path(src_rel, 1600, "webp")
            check_file_budget(root, webp_rel, max_bytes, label, errors)

        # Featured photo covers should stay lightweight on index page (960w preview variants).
        if photo_catalog_path.exists():
            photo_catalog = load_json(photo_catalog_path)
            for featured in (photo_catalog.get("featured") or []):
                cover = str(featured.get("cover") or "").strip()
                if not cover:
                    continue
                cover_webp = variant_path(cover, 960, "webp")
                label = f"photo featured cover 960 webp ({featured.get('title') or cover})"
                check_file_budget(root, cover_webp, 500_000, label, errors)

        # If AVIF is generated in this environment (CI), ensure priority AVIF variants exist and are not wildly larger.
        if avif_encoder_available:
            for src_rel, _, label in priority_webp_budgets:
                avif_rel = variant_path(src_rel, 1600, "avif")
                webp_rel = variant_path(src_rel, 1600, "webp")
                avif_path = root / avif_rel
                webp_path = root / webp_rel
                if not avif_path.exists():
                    errors.append(f"{label}: expected AVIF variant missing in AVIF-enabled build (`{avif_rel}`)")
                    continue
                if webp_path.exists():
                    avif_size = avif_path.stat().st_size
                    webp_size = webp_path.stat().st_size
                    if avif_size > int(webp_size * 1.15):
                        notes.append(
                            f"{label}: AVIF variant {avif_size} bytes is >15% larger than WebP {webp_size} bytes"
                        )
        else:
            notes.append("AVIF encoder unavailable in current environment; AVIF size budgets skipped.")

        if isinstance(items, dict) and items:
            notes.append(f"image variants manifest entries: {len(items)}")

    if errors:
        print("ERROR: performance budgets exceeded")
        for err in errors:
            print(f"- {err}")
        return 1

    print("OK: performance budgets within limits")
    for note in notes:
        print(f"- {note}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
