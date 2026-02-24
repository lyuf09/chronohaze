#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List


@dataclass
class Finding:
    level: str  # error | warn
    source: str
    detail: str


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def norm_url(value) -> str:
    return str(value or "").strip().lstrip("./")


def norm_text(value) -> str:
    return " ".join(str(value or "").split()).strip()


def norm_tags(value) -> List[str]:
    if not isinstance(value, list):
        return []
    out: List[str] = []
    seen = set()
    for tag in value:
        t = str(tag or "").strip().lower()
        if not t or t in seen:
            continue
        seen.add(t)
        out.append(t)
    return out


def import_builder(root: Path, module_name: str):
    scripts_dir = root / "scripts"
    sys.path.insert(0, str(scripts_dir))
    return __import__(module_name)


def compare_maps(
    label: str,
    page_map: Dict[str, dict],
    catalog_map: Dict[str, dict],
    compare_keys: List[str],
    compare_tags: bool = True,
) -> List[Finding]:
    findings: List[Finding] = []
    page_urls = list(page_map.keys())
    catalog_urls = list(catalog_map.keys())

    for url in sorted(set(page_urls) - set(catalog_urls)):
        findings.append(Finding("error", f"{label}-catalog", f"Missing catalog item: {url}"))
    for url in sorted(set(catalog_urls) - set(page_urls)):
        findings.append(Finding("error", f"{label}-catalog", f"Extra catalog item: {url}"))

    if page_urls != catalog_urls:
        findings.append(Finding("warn", f"{label}-catalog", "Item order differs between page parse and catalog"))

    for url in page_urls:
        if url not in catalog_map:
            continue
        a = page_map[url]
        b = catalog_map[url]
        for key in compare_keys:
            if norm_text(a.get(key, "")) != norm_text(b.get(key, "")):
                findings.append(
                    Finding(
                        "error",
                        f"{label}-catalog",
                        f"{url} field mismatch [{key}]: page={a.get(key)!r} catalog={b.get(key)!r}",
                    )
                )
        if compare_tags and norm_tags(a.get("tags")) != norm_tags(b.get("tags")):
            findings.append(
                Finding(
                    "error",
                    f"{label}-catalog",
                    f"{url} tags mismatch: page={norm_tags(a.get('tags'))} catalog={norm_tags(b.get('tags'))}",
                )
            )
    return findings


def compare_catalog_to_search(
    label: str,
    catalog_map: Dict[str, dict],
    search_map: Dict[str, dict],
    compare_keys: List[str],
) -> List[Finding]:
    findings: List[Finding] = []
    for url, item in catalog_map.items():
        search_item = search_map.get(url)
        if not search_item:
            findings.append(Finding("error", f"{label}-search-index", f"Missing search entry: {url}"))
            continue
        for key in compare_keys:
            if key == "tags":
                if norm_tags(item.get("tags")) != norm_tags(search_item.get("tags")):
                    findings.append(
                        Finding(
                            "error",
                            f"{label}-search-index",
                            f"{url} tags mismatch: catalog={norm_tags(item.get('tags'))} search={norm_tags(search_item.get('tags'))}",
                        )
                    )
                continue
            if norm_text(item.get(key, "")) != norm_text(search_item.get(key, "")):
                findings.append(
                    Finding(
                        "warn" if key == "title" else "error",
                        f"{label}-search-index",
                        f"{url} field mismatch [{key}]: catalog={item.get(key)!r} search={search_item.get(key)!r}",
                    )
                )
    return findings


def build_math_page_map(root: Path) -> Dict[str, dict]:
    builder = import_builder(root, "rebuild_math_catalog")
    html_text = (root / "math.html").read_text(encoding="utf-8")
    items = builder.parse_cards(html_text)
    out: Dict[str, dict] = {}
    for item in items:
        url = norm_url(item.get("url"))
        if not url:
            continue
        out[url] = item
    return out


def build_photo_page_map(root: Path) -> Dict[str, dict]:
    builder = import_builder(root, "rebuild_photo_catalog")
    html_text = (root / "portfolio-1.html").read_text(encoding="utf-8")
    featured = builder.parse_featured(html_text)
    archive = builder.parse_archive(html_text, {str(x["url"]) for x in featured})
    items = builder.build_combined_items(featured, archive)
    out: Dict[str, dict] = {}
    for item in items:
        url = norm_url(item.get("url"))
        if not url:
            continue
        out[url] = item
    return out


def build_research_page_map(root: Path) -> Dict[str, dict]:
    builder = import_builder(root, "rebuild_research_catalog")
    html_text = (root / "research.html").read_text(encoding="utf-8")
    payload = builder.parse_research_page(html_text)
    search_entry = payload.get("search", {})
    if not isinstance(search_entry, dict):
        return {}
    url = norm_url(search_entry.get("url"))
    return {url: search_entry} if url else {}


def run_checks(root: Path):
    findings: List[Finding] = []
    search_payload = load_json(root / "assets" / "search-index.json")
    search_items = search_payload.get("items", []) if isinstance(search_payload, dict) else []
    search_map = {norm_url(item.get("url")): item for item in search_items if isinstance(item, dict)}

    # math
    math_catalog_payload = load_json(root / "assets" / "data" / "math-catalog.json")
    math_catalog_items = math_catalog_payload.get("items", []) if isinstance(math_catalog_payload, dict) else []
    math_catalog_map = {norm_url(item.get("url")): item for item in math_catalog_items if isinstance(item, dict)}
    math_page_map = build_math_page_map(root)
    findings.extend(compare_maps("math", math_page_map, math_catalog_map, ["title", "date", "excerpt"]))
    findings.extend(compare_catalog_to_search("math", math_catalog_map, search_map, ["date", "tags", "title", "excerpt"]))

    # photo
    photo_catalog_payload = load_json(root / "assets" / "data" / "photo-catalog.json")
    photo_catalog_items = photo_catalog_payload.get("items", []) if isinstance(photo_catalog_payload, dict) else []
    photo_catalog_map = {norm_url(item.get("url")): item for item in photo_catalog_items if isinstance(item, dict)}
    photo_page_map = build_photo_page_map(root)
    findings.extend(compare_maps("photo", photo_page_map, photo_catalog_map, ["title", "date", "excerpt"]))
    findings.extend(compare_catalog_to_search("photo", photo_catalog_map, search_map, ["date", "tags", "title", "excerpt"]))

    # research (search-facing entry)
    research_catalog_payload = load_json(root / "assets" / "data" / "research-catalog.json")
    research_search = research_catalog_payload.get("search", {}) if isinstance(research_catalog_payload, dict) else {}
    research_catalog_map = {norm_url(research_search.get("url")): research_search} if isinstance(research_search, dict) and research_search.get("url") else {}
    research_page_map = build_research_page_map(root)
    findings.extend(compare_maps("research", research_page_map, research_catalog_map, ["title", "excerpt"], compare_tags=True))
    findings.extend(compare_catalog_to_search("research", research_catalog_map, search_map, ["tags", "title", "excerpt"]))

    errors = [f for f in findings if f.level == "error"]
    warns = [f for f in findings if f.level == "warn"]
    return errors, warns


def main() -> int:
    ap = argparse.ArgumentParser(description="Check math/photo/research catalog drift vs pages and search index")
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--strict-warnings", action="store_true")
    args = ap.parse_args()
    root = args.root.resolve()

    errors, warns = run_checks(root)
    if not errors and not warns:
        print("OK: no math/photo/research catalog drift findings")
        return 0

    for item in errors + warns:
        prefix = "ERROR" if item.level == "error" else "WARN"
        print(f"[{prefix}] {item.source}: {item.detail}")

    print(f"\nSummary: {len(errors)} error(s), {len(warns)} warning(s)")
    if errors:
        return 1
    if warns and args.strict_warnings:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
