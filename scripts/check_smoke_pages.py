#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, List, Tuple


@dataclass
class SmokeCheck:
    label: str
    predicate: Callable[[str], bool]
    detail: str


def contains(token: str) -> Callable[[str], bool]:
    return lambda text: token in text


def count_at_least(token: str, minimum: int) -> Callable[[str], bool]:
    return lambda text: text.count(token) >= minimum


def run_checks(path: Path, checks: List[SmokeCheck]) -> List[str]:
    text = path.read_text(encoding="utf-8")
    failures: List[str] = []
    for check in checks:
        if not check.predicate(text):
            failures.append(f"{path.name}: {check.label} ({check.detail})")
    return failures


def main() -> int:
    ap = argparse.ArgumentParser(description="Smoke-test critical pages for key rendered nodes.")
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = ap.parse_args()
    root = args.root.resolve()

    matrix: List[Tuple[Path, List[SmokeCheck]]] = [
        (
            root / "index.html",
            [
                SmokeCheck("home body", contains('class="home-body"'), "home page body class"),
                SmokeCheck("hero portrait image", contains('class="hero-portrait"'), "hero image present"),
                SmokeCheck("hero WEBP source", contains("hero_portrait-1600.webp"), "priority WEBP source reference"),
                SmokeCheck("player shell", contains('id="playerShell"'), "homepage player container"),
            ],
        ),
        (
            root / "music.html",
            [
                SmokeCheck("music index body", contains('class="music-index-page"'), "music page class"),
                SmokeCheck("album entry", contains("music/album-ipomoea-alba.html"), "album row link present"),
                SmokeCheck("track rows", count_at_least('class="track-row', 20), "at least 20 track rows rendered"),
                SmokeCheck("music intro section", contains("music-intro-layout"), "top intro block present"),
            ],
        ),
        (
            root / "search.html",
            [
                SmokeCheck("search page body", contains('class="search-index-page"'), "search body class"),
                SmokeCheck("search input", contains('id="site-search-input"'), "search input id"),
                SmokeCheck("search results container", contains('class="search-results"'), "search results mount"),
                SmokeCheck("search script", contains('assets/js/search-page.min.js'), "minified search page script loaded"),
            ],
        ),
        (
            root / "music" / "album-ipomoea-alba.html",
            [
                SmokeCheck("album title", contains("Ipomoea Alba"), "album title"),
                SmokeCheck("album tracklist", contains('class="album-tracklist"'), "tracklist container"),
                SmokeCheck("album tracks count", count_at_least('class="album-track-link"', 10), "track links rendered"),
                SmokeCheck("album cover AVIF", contains("ipomoea-alba-album-cover-1600.avif"), "cover AVIF source"),
            ],
        ),
        (
            root / "music" / "album-teenage-best.html",
            [
                SmokeCheck("album title", contains("best-of collection from HazezZ"), "teenage collection subtitle/title block"),
                SmokeCheck("album tracklist", contains('class="album-tracklist"'), "tracklist container"),
                SmokeCheck("album cover AVIF", contains("teenage-best-album-cover-1600.avif"), "cover AVIF source"),
            ],
        ),
        (
            root / "cv.html",
            [
                SmokeCheck("cv page block", contains("cv-policy"), "CV main article"),
                SmokeCheck("cv utility bar", contains('class="cv-utility-bar"'), "CV controls"),
                SmokeCheck("research link", contains('class="cv-research-link"'), "research landing CTA"),
                SmokeCheck("cv toc", contains('class="cv-toc"'), "CV TOC navigation"),
            ],
        ),
        (
            root / "research.html",
            [
                SmokeCheck("research page body", contains('research-landing-page'), "research body class"),
                SmokeCheck("project section", contains('id="research-projects"'), "projects anchor"),
                SmokeCheck("outputs section", contains('id="research-outputs"'), "outputs anchor"),
                SmokeCheck("project cards", count_at_least('class="research-project-card"', 3), "3 project cards"),
                SmokeCheck("current questions section", contains('id="research-now"'), "current questions anchor"),
            ],
        ),
    ]

    failures: List[str] = []
    missing_files: List[str] = []
    for path, checks in matrix:
        if not path.exists():
            missing_files.append(str(path))
            continue
        failures.extend(run_checks(path, checks))

    if missing_files:
        print("ERROR: smoke-test target files missing")
        for path in missing_files:
            print(f"- {path}")
        return 1

    if failures:
        print("ERROR: page smoke-test failed")
        for item in failures:
            print(f"- {item}")
        return 1

    print(f"OK: critical page smoke-test passed ({len(matrix)} pages)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
