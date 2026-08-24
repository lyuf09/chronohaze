#!/usr/bin/env python3
"""Refresh sitemap lastmod values from the files that back each public URL."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import date
from pathlib import Path
from urllib.parse import urlparse


SITE_PREFIX = "/chronohaze/"
URL_BLOCK_RE = re.compile(r"(<url>\s*<loc>([^<]+)</loc>\s*<lastmod>)(\d{4}-\d{2}-\d{2})(</lastmod>\s*</url>)")
NOINDEX_RE = re.compile(r'<meta\s+[^>]*name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', re.I)
MODIFIED_META_RE = re.compile(
    r'<meta\s+[^>]*property=["\']article:(?:modified|published)_time["\'][^>]*content=["\'](\d{4}-\d{2}-\d{2})',
    re.I,
)


def source_path(root: Path, public_url: str) -> Path | None:
    path = urlparse(public_url).path
    if not path.startswith(SITE_PREFIX):
        return None
    relative = path[len(SITE_PREFIX) :] or "index.html"
    candidate = root / relative
    return candidate if candidate.is_file() else None


def git_output(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else ""


def normalize_catalog_date(value: object) -> str:
    text = str(value or "").strip()
    iso_match = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if iso_match:
        year, month, day = (int(part) for part in iso_match.groups())
        return f"{year:04d}-{month:02d}-{day:02d}"
    zh_match = re.search(r"(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日", text)
    if zh_match:
        year, month, day = (int(part) for part in zh_match.groups())
        return f"{year:04d}-{month:02d}-{day:02d}"
    dmy_match = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if dmy_match:
        day, month, year = (int(part) for part in dmy_match.groups())
        return f"{year:04d}-{month:02d}-{day:02d}"
    return ""


def load_catalog_dates(root: Path) -> dict[str, str]:
    dates: dict[str, str] = {}

    def visit(value: object) -> None:
        if isinstance(value, dict):
            url = str(value.get("url") or "").lstrip("/")
            normalized = normalize_catalog_date(value.get("date"))
            if url and normalized:
                dates[url] = normalized
            for child in value.values():
                visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    for catalog_path in sorted((root / "assets" / "data").glob("*-catalog.json")):
        try:
            visit(json.loads(catalog_path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            continue
    return dates


def file_lastmod(root: Path, path: Path, today: str, catalog_dates: dict[str, str]) -> str:
    relative = path.relative_to(root).as_posix()
    candidates: list[str] = []
    if git_output(root, "status", "--porcelain", "--", relative):
        candidates.append(today)
    html_path = path.with_suffix(".html") if path.suffix.lower() == ".pdf" else path
    if html_path.is_file() and html_path.suffix.lower() == ".html":
        text = html_path.read_text(encoding="utf-8", errors="ignore")
        candidates.extend(MODIFIED_META_RE.findall(text))
    semantic_date = catalog_dates.get(relative)
    if not semantic_date and path.suffix.lower() == ".pdf":
        semantic_date = catalog_dates.get(path.with_suffix(".html").relative_to(root).as_posix())
    if semantic_date:
        candidates.append(semantic_date)
    git_date = git_output(root, "log", "-1", "--format=%cs", "--", relative)
    if git_date:
        candidates.append(git_date)
    return max(candidates, default="")


def noindex_source(root: Path, public_url: str) -> Path | None:
    """Return the backing HTML file when a sitemap URL belongs to a noindex note."""
    path = source_path(root, public_url)
    if path is None:
        return None
    html_path = path.with_suffix(".html") if path.suffix.lower() == ".pdf" else path
    if html_path.suffix.lower() != ".html" or not html_path.is_file():
        return None
    text = html_path.read_text(encoding="utf-8", errors="ignore")
    return html_path if NOINDEX_RE.search(text) else None


def refresh_sitemap(root: Path, today: str) -> int:
    sitemap = root / "sitemap.xml"
    original = sitemap.read_text(encoding="utf-8")
    changed = 0
    catalog_dates = load_catalog_dates(root)

    def replace(match: re.Match[str]) -> str:
        nonlocal changed
        if noindex_source(root, match.group(2)) is not None:
            changed += 1
            return ""
        path = source_path(root, match.group(2))
        if path is None:
            return match.group(0)
        lastmod = file_lastmod(root, path, today, catalog_dates)
        if not lastmod or lastmod == match.group(3):
            return match.group(0)
        changed += 1
        return f"{match.group(1)}{lastmod}{match.group(4)}"

    updated = URL_BLOCK_RE.sub(replace, original)
    updated = re.sub(r"(?m)^[ \t]+$", "", updated)
    if updated != original:
        sitemap.write_text(updated, encoding="utf-8")
    return changed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--today", default=date.today().isoformat())
    args = parser.parse_args()
    count = refresh_sitemap(args.root.resolve(), args.today)
    print(f"sitemap lastmod refreshed for {count} URL(s)")


if __name__ == "__main__":
    main()
