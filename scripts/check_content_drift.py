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


def normalize_url_map(items) -> Dict[str, dict]:
    out: Dict[str, dict] = {}
    if not isinstance(items, list):
        return out
    for item in items:
        if not isinstance(item, dict):
            continue
        url = normalize_url(item.get("url", ""))
        if not url:
            continue
        out[url] = item
    return out


def load_music_page_rows(root: Path) -> List[dict]:
    scripts_dir = root / "scripts"
    sys.path.insert(0, str(scripts_dir))
    try:
        import rebuild_music_catalog as builder  # type: ignore
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"Failed to import rebuild_music_catalog.py: {exc}") from exc

    html_path = root / "music.html"
    if not html_path.exists():
        html_path = root / "yin-le.html"
    html_text = html_path.read_text(encoding="utf-8")
    rows = builder.parse_rows(html_text)
    return rows


def load_music_detail_page_rows(root: Path) -> List[dict]:
    scripts_dir = root / "scripts"
    sys.path.insert(0, str(scripts_dir))
    try:
        import rebuild_music_detail_catalog as builder  # type: ignore
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"Failed to import rebuild_music_detail_catalog.py: {exc}") from exc
    return builder.build_items(root)


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


def compare_detail_page_vs_catalog(detail_page_rows: List[dict], detail_catalog_items: List[dict]) -> List[Finding]:
    findings: List[Finding] = []
    page_map = normalize_url_map(detail_page_rows)
    catalog_map = normalize_url_map(detail_catalog_items)

    page_urls = list(page_map.keys())
    catalog_urls = list(catalog_map.keys())

    for url in sorted(set(page_urls) - set(catalog_urls)):
        findings.append(Finding("error", "music-detail-catalog", f"Missing detail catalog item: {url}"))
    for url in sorted(set(catalog_urls) - set(page_urls)):
        findings.append(Finding("error", "music-detail-catalog", f"Extra detail catalog item not in pages: {url}"))

    if page_urls != catalog_urls:
        findings.append(Finding("warn", "music-detail-catalog", "Detail catalog item order differs from page scan"))

    compare_scalar = (
        "title_raw",
        "title_clean",
        "status",
        "creation_period",
        "subtitle",
        "audio_count",
        "body_section_count",
        "description_text",
        "description_excerpt",
        "lyrics_text",
        "lyrics_line_count",
        "notes_text",
        "other_section_text",
        "search_body_text",
    )
    compare_lists = (
        "subtitle_lines",
        "credit_lines",
        "extra_meta_lines",
        "credit_alias_tokens",
        "audio_titles",
        "body_section_headings",
        "description_sections",
        "lyrics_sections",
        "notes_sections",
    )
    compare_nested_lists = ("body_sections",)

    for url in page_urls:
        if url not in catalog_map:
            continue
        page_item = page_map[url]
        catalog_item = catalog_map[url]
        for key in compare_scalar:
            if page_item.get(key) != catalog_item.get(key):
                findings.append(
                    Finding(
                        "error",
                        "music-detail-catalog",
                        f"{url} field mismatch [{key}]: page={page_item.get(key)!r} catalog={catalog_item.get(key)!r}",
                    )
                )
        for key in compare_lists:
            page_list = [str(x).strip() for x in page_item.get(key, [])] if isinstance(page_item.get(key), list) else []
            cat_list = [str(x).strip() for x in catalog_item.get(key, [])] if isinstance(catalog_item.get(key), list) else []
            if page_list != cat_list:
                findings.append(
                    Finding(
                        "error",
                        "music-detail-catalog",
                        f"{url} list mismatch [{key}]: page={page_list!r} catalog={cat_list!r}",
                    )
                )
        for key in compare_nested_lists:
            page_value = page_item.get(key, [])
            cat_value = catalog_item.get(key, [])
            if page_value != cat_value:
                findings.append(
                    Finding(
                        "error",
                        "music-detail-catalog",
                        f"{url} nested mismatch [{key}]",
                    )
                )
    return findings


def compare_detail_catalog_vs_search_index(list_page_rows: List[dict], detail_catalog_items: List[dict], search_items: List[dict]) -> List[Finding]:
    findings: List[Finding] = []
    listed_urls = {
        normalize_url(row.get("url", ""))
        for row in list_page_rows
        if str(row.get("type", "")).strip().lower() == "single"
    }
    listed_urls.discard("")

    detail_map = normalize_url_map(detail_catalog_items)
    search_map = normalize_url_map(search_items)

    for url in sorted(listed_urls):
        detail_item = detail_map.get(url)
        search_item = search_map.get(url)
        if not detail_item:
            findings.append(Finding("error", "music-detail-search-index", f"Listed music row missing detail catalog entry: {url}"))
            continue
        if not search_item:
            findings.append(Finding("error", "music-detail-search-index", f"Listed music row missing search-index entry: {url}"))
            continue

        expected_status = str(detail_item.get("status", "")).strip()
        search_status = str(search_item.get("status", "")).strip()
        if expected_status and search_status != expected_status:
            findings.append(
                Finding(
                    "error",
                    "music-detail-search-index",
                    f"{url} status mismatch: detail-catalog={expected_status!r} search-index={search_status!r}",
                )
            )

        search_content_norm = normalize_text(str(search_item.get("content", "")))
        required_snippets = []
        for key in ("title_clean", "creation_period", "subtitle"):
            value = str(detail_item.get(key, "")).strip()
            if value:
                required_snippets.append((key, value))
        for key in ("description_excerpt",):
            value = str(detail_item.get(key, "")).strip()
            if value:
                required_snippets.append((key, value))
        for alias in detail_item.get("credit_alias_tokens", []) if isinstance(detail_item.get("credit_alias_tokens"), list) else []:
            alias_text = str(alias).strip()
            if alias_text:
                required_snippets.append(("credit_alias_tokens", alias_text))
        for heading in detail_item.get("body_section_headings", []) if isinstance(detail_item.get("body_section_headings"), list) else []:
            heading_text = str(heading).strip()
            if heading_text:
                required_snippets.append(("body_section_headings", heading_text))

        for label, snippet in required_snippets:
            if normalize_text(snippet) and normalize_text(snippet) not in search_content_norm:
                findings.append(
                    Finding(
                        "warn",
                        "music-detail-search-index",
                        f"{url} search content missing detail metadata [{label}]: {snippet!r}",
                    )
                )
    return findings


def run_checks(root: Path) -> Tuple[List[Finding], List[Finding]]:
    page_rows = load_music_page_rows(root)
    detail_page_rows = load_music_detail_page_rows(root)

    catalog_payload = load_json(root / "assets" / "data" / "music-catalog.json")
    catalog_items = catalog_payload.get("items", []) if isinstance(catalog_payload, dict) else []
    if not isinstance(catalog_items, list):
        raise RuntimeError("assets/data/music-catalog.json items must be an array")

    detail_catalog_payload = load_json(root / "assets" / "data" / "music-detail-catalog.json")
    detail_catalog_items = detail_catalog_payload.get("items", []) if isinstance(detail_catalog_payload, dict) else []
    if not isinstance(detail_catalog_items, list):
        raise RuntimeError("assets/data/music-detail-catalog.json items must be an array")

    search_payload = load_json(root / "assets" / "search-index.json")
    search_items = search_payload.get("items", []) if isinstance(search_payload, dict) else []
    if not isinstance(search_items, list):
        raise RuntimeError("assets/search-index.json items must be an array")

    errors_warnings: List[Finding] = []
    errors_warnings.extend(compare_page_vs_catalog(page_rows, catalog_items))
    errors_warnings.extend(compare_catalog_vs_search_index(page_rows, catalog_items, search_items))
    errors_warnings.extend(compare_detail_page_vs_catalog(detail_page_rows, detail_catalog_items))
    errors_warnings.extend(compare_detail_catalog_vs_search_index(page_rows, detail_catalog_items, search_items))

    errors = [f for f in errors_warnings if f.level == "error"]
    warnings = [f for f in errors_warnings if f.level == "warn"]
    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check drift between music list/detail pages, canonical music metadata, and combined search index"
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
