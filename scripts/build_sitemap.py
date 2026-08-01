#!/usr/bin/env python3
"""Refresh sitemap lastmod values from the files that back each public URL."""

from __future__ import annotations

import argparse
import re
import subprocess
from datetime import date
from pathlib import Path
from urllib.parse import urlparse


SITE_PREFIX = "/chronohaze/"
URL_BLOCK_RE = re.compile(r"(<url>\s*<loc>([^<]+)</loc>\s*<lastmod>)(\d{4}-\d{2}-\d{2})(</lastmod>\s*</url>)")


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


def file_lastmod(root: Path, path: Path, today: str) -> str:
    relative = path.relative_to(root).as_posix()
    if git_output(root, "status", "--porcelain", "--", relative):
        return today
    return git_output(root, "log", "-1", "--format=%cs", "--", relative)


def refresh_sitemap(root: Path, today: str) -> int:
    sitemap = root / "sitemap.xml"
    original = sitemap.read_text(encoding="utf-8")
    changed = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal changed
        path = source_path(root, match.group(2))
        if path is None:
            return match.group(0)
        lastmod = file_lastmod(root, path, today)
        if not lastmod or lastmod == match.group(3):
            return match.group(0)
        changed += 1
        return f"{match.group(1)}{lastmod}{match.group(4)}"

    updated = URL_BLOCK_RE.sub(replace, original)
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
