#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple


@dataclass
class Finding:
    level: str  # "error" | "warn"
    source: str
    detail: str


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def normalize_url(url: str) -> str:
    return str(url or "").strip().replace("\\", "/").lstrip("./")


def normalize_tags(tags) -> List[str]:
    if not isinstance(tags, list):
        return []
    out: List[str] = []
    seen = set()
    for tag in tags:
        value = str(tag or "").strip().lower()
        if not value or value in seen:
            continue
        seen.add(value)
        out.append(value)
    return out


def normalize_text(value: str) -> str:
    return "".join(str(value or "").split()).strip()


def load_music_page_rows(root: Path) -> List[dict]:
    scripts_dir = root / "scripts"
    sys.path.insert(0, str(scripts_dir))
    try:
        import rebuild_music_catalog as builder  # type: ignore
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"Failed to import rebuild_music_catalog.py: {exc}") from exc

    html_path = root / "yin-le.html"
    html_text = html_path.read_text(encoding="utf-8")
    rows = builder.parse_rows(html_text)
    return rows


def compare_page_vs_catalog(page_rows: List[dict], catalog_items: List[dict]) -> List[Finding]:
    findings: List[Finding] = []
    page_urls = [normalize_url(row.get("url", "")) for row in page_rows]
    catalog_urls = [normalize_url(item.get("url", "")) for item in catalog_items if isinstance(item, dict)]

    page_set = set(page_urls)
    catalog_set = set(catalog_urls)

    for url in sorted(page_set - catalog_set):
        findings.append(Finding("error", "catalog", f"Missing catalog item for music row: {url}"))
    for url in sorted(catalog_set - page_set):
        findings.append(Finding("error", "catalog", f"Extra catalog item not in music page: {url}"))

    if page_urls != catalog_urls:
        min_len = min(len(page_urls), len(catalog_urls))
        for idx in range(min_len):
            if page_urls[idx] != catalog_urls[idx]:
                findings.append(
                    Finding(
                        "error",
                        "catalog",
                        f"Row order mismatch at position {idx + 1}: page={page_urls[idx]} catalog={catalog_urls[idx]}",
                    )
                )
                break
        if len(page_urls) != len(catalog_urls):
            findings.append(
                Finding(
                    "error",
                    "catalog",
                    f"Row count mismatch: page={len(page_urls)} catalog={len(catalog_urls)}",
                )
            )

    catalog_by_url: Dict[str, dict] = {
        normalize_url(item.get("url", "")): item
        for item in catalog_items
        if isinstance(item, dict) and item.get("url")
    }

    compare_fields = ("type", "year", "date", "title", "artist", "has_audio")
    for row in page_rows:
        url = normalize_url(row.get("url", ""))
        catalog_item = catalog_by_url.get(url)
        if not catalog_item:
            continue

        for key in compare_fields:
            if row.get(key) != catalog_item.get(key):
                findings.append(
                    Finding(
                        "error",
                        "catalog",
                        f"{url} field mismatch [{key}]: page={row.get(key)!r} catalog={catalog_item.get(key)!r}",
                    )
                )

        page_tags = normalize_tags(row.get("tags", []))
        catalog_tags = normalize_tags(catalog_item.get("tags", []))
        if page_tags != catalog_tags:
            findings.append(
                Finding(
                    "error",
                    "catalog",
                    f"{url} tag mismatch: page={page_tags} catalog={catalog_tags}",
                )
            )

    return findings


def compare_catalog_vs_search_index(page_rows: List[dict], catalog_items: List[dict], search_items: List[dict]) -> List[Finding]:
    findings: List[Finding] = []
    music_urls = [normalize_url(row.get("url", "")) for row in page_rows]
    music_url_set = set(music_urls)

    catalog_by_url: Dict[str, dict] = {
        normalize_url(item.get("url", "")): item
        for item in catalog_items
        if isinstance(item, dict) and item.get("url")
    }
    search_by_url: Dict[str, dict] = {
        normalize_url(item.get("url", "")): item
        for item in search_items
        if isinstance(item, dict) and normalize_url(item.get("url", "")) in music_url_set
    }

    for url in music_urls:
        if url not in search_by_url:
            findings.append(Finding("error", "search-index", f"Missing music entry in search-index.json: {url}"))
            continue
        catalog_item = catalog_by_url.get(url)
        if not catalog_item:
            continue
        search_item = search_by_url[url]

        catalog_date = str(catalog_item.get("date", "")).strip()
        search_date = str(search_item.get("date", "")).strip()
        if catalog_date != search_date:
            findings.append(
                Finding(
                    "error",
                    "search-index",
                    f"{url} date mismatch: catalog={catalog_date!r} search-index={search_date!r}",
                )
            )

        catalog_tags = normalize_tags(catalog_item.get("tags", []))
        search_tags = normalize_tags(search_item.get("tags", []))
        if catalog_tags != search_tags:
            findings.append(
                Finding(
                    "error",
                    "search-index",
                    f"{url} tags mismatch: catalog={catalog_tags} search-index={search_tags}",
                )
            )

        catalog_title = str(catalog_item.get("title", "")).strip()
        search_title = str(search_item.get("title", "")).strip()
        if normalize_text(catalog_title) != normalize_text(search_title):
            findings.append(
                Finding(
                    "warn",
                    "search-index",
                    f"{url} title drift: catalog={catalog_title!r} search-index={search_title!r}",
                )
            )

    return findings


def run_checks(root: Path) -> Tuple[List[Finding], List[Finding]]:
    page_rows = load_music_page_rows(root)

    catalog_payload = load_json(root / "assets" / "data" / "music-catalog.json")
    catalog_items = catalog_payload.get("items", []) if isinstance(catalog_payload, dict) else []
    if not isinstance(catalog_items, list):
        raise RuntimeError("assets/data/music-catalog.json items must be an array")

    search_payload = load_json(root / "assets" / "search-index.json")
    search_items = search_payload.get("items", []) if isinstance(search_payload, dict) else []
    if not isinstance(search_items, list):
        raise RuntimeError("assets/search-index.json items must be an array")

    errors_warnings: List[Finding] = []
    errors_warnings.extend(compare_page_vs_catalog(page_rows, catalog_items))
    errors_warnings.extend(compare_catalog_vs_search_index(page_rows, catalog_items, search_items))

    errors = [f for f in errors_warnings if f.level == "error"]
    warnings = [f for f in errors_warnings if f.level == "warn"]
    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check drift between music page rows, canonical music metadata, and combined search index"
    )
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument(
        "--strict-warnings",
        action="store_true",
        help="Treat warnings (e.g. title drift) as failures",
    )
    args = parser.parse_args()

    root = args.root.resolve()
    errors, warnings = run_checks(root)

    if not errors and not warnings:
        print("OK: no music metadata/search drift findings")
        return 0

    for finding in errors + warnings:
        prefix = "ERROR" if finding.level == "error" else "WARN"
        print(f"[{prefix}] {finding.source}: {finding.detail}")

    print(
        f"\nSummary: {len(errors)} error(s), {len(warnings)} warning(s)"
        + (" (warnings treated as errors)" if args.strict_warnings else "")
    )

    if errors:
        return 1
    if warnings and args.strict_warnings:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
