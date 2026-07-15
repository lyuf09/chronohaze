#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import List, Optional

CURRENT_YEAR = 2026
SEO_PENDING_PATTERNS = (
    "音频待上传",
    "audio pending upload",
)
SUBMODULAR_STATUS_PAGES = {
    "academic.html",
    "cv.html",
    "index.html",
    "projects.html",
    "research.html",
}
SUBMODULAR_PUBLISHED_SCOPE = (
    "Published in AFP (2026): a formalization of the classical greedy algorithm "
    "and a verified stateful lazy-greedy variant for cardinality-constrained "
    "monotone submodular maximization."
)
SUBMODULAR_POST_PUBLICATION_SCOPE = (
    "Post-publication extension: the current repository additionally develops a "
    "stochastic-greedy line, including sampling, approximation packaging, and "
    "oracle-cost accounting."
)
LEGACY_SUBMODULAR_STATUS_PATTERNS = (
    "future extension / experimental branch",
    "stochasticgreedy skeleton",
    "stochastic-greedy skeleton",
    "proof roadmap for stochasticgreedy has already entered the repo, but it is not yet complete",
    "证明路线图已经进了 repo 但还没完善",
)
ACADEMIC_ROOT_PAGES = {
    "academic.html",
    "cv.html",
    "math.html",
    "projects.html",
    "research.html",
}
LEGACY_ACADEMIC_IDENTITY_PATTERNS = (
    "Fay / Feier Lyu",
    "also known as HazezZ",
)
LEGACY_LOCATION_PATTERNS = (
    "currently between Chongqing, Edinburgh, and Ithaca",
    "Between Chongqing, Edinburgh, and Ithaca",
    "重庆 / Edinburgh / Ithaca 之间",
    "No fixed phone number while moving across countries",
    "辗转不同国家无固定号码",
)
RUNTIME_ACADEMIC_LEGACY_PATTERNS = (
    '<p class="article-meta">HazezZ · Oct 18, 2025</p>',
    '<p class="article-meta">HazezZ · Dec 29, 2025</p>',
    '<p class="article-meta">HazezZ · Jan 29, 2026</p>',
    "An Ongoing Isabelle Research Project: Formalising Submodular Greedy",
    'name: "Fay / Feier Lyu"',
)


@dataclass
class Finding:
    path: Path
    kind: str
    detail: str


class NavParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_nav = False
        self.nav_depth = 0
        self.current_anchor: Optional[dict] = None
        self.navs: List[List[dict]] = []
        self._current_nav_links: Optional[List[dict]] = None

    def handle_starttag(self, tag: str, attrs):
        attrs_dict = dict(attrs)
        classes = set((attrs_dict.get("class") or "").split())

        if tag == "nav" and "nav" in classes:
            if not self.in_nav:
                self.in_nav = True
                self.nav_depth = 1
                self._current_nav_links = []
                self.navs.append(self._current_nav_links)
            else:
                self.nav_depth += 1
            return

        if self.in_nav and tag == "a":
            self.current_anchor = {
                "href": attrs_dict.get("href", "").strip(),
                "text": "",
            }

    def handle_endtag(self, tag: str):
        if self.in_nav and tag == "a" and self.current_anchor is not None:
            self.current_anchor["text"] = re.sub(r"\s+", " ", self.current_anchor["text"]).strip()
            if self._current_nav_links is not None:
                self._current_nav_links.append(self.current_anchor)
            self.current_anchor = None
            return

        if self.in_nav and tag == "nav":
            self.nav_depth -= 1
            if self.nav_depth <= 0:
                self.in_nav = False
                self.nav_depth = 0
                self._current_nav_links = None

    def handle_data(self, data: str):
        if self.current_anchor is not None:
            self.current_anchor["text"] += data


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", "", value or "").lower()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def check_footer_years(path: Path, text: str) -> List[Finding]:
    findings: List[Finding] = []
    for m in re.finditer(r"©\s*(\d{4})", text):
        year = int(m.group(1))
        if year != CURRENT_YEAR:
            findings.append(Finding(path, "footer-year", f"Found © {year} (expected {CURRENT_YEAR})"))
    return findings


def check_city_case(path: Path, text: str) -> List[Finding]:
    findings: List[Finding] = []
    if re.search(r"\bNew york\b", text):
        findings.append(Finding(path, "city-case", "Found 'New york' (expected 'New York')"))
    if re.search(r"\bnew york\b", text):
        findings.append(Finding(path, "city-case", "Found 'new york' (expected 'New York')"))
    return findings


def check_pending_in_seo(path: Path, text: str) -> List[Finding]:
    findings: List[Finding] = []
    head_match = re.search(r"<head\b.*?</head>", text, re.S | re.I)
    if not head_match:
        return findings
    head = head_match.group(0)
    for pattern in SEO_PENDING_PATTERNS:
        if pattern.lower() in head.lower():
            findings.append(Finding(path, "seo-pending", f"Pending-upload text found in <head>: {pattern}"))
            break
    return findings


def check_nav_duplicates(path: Path, text: str) -> List[Finding]:
    findings: List[Finding] = []
    parser = NavParser()
    try:
        parser.feed(text)
    except Exception as exc:
        findings.append(Finding(path, "parse", f"Nav parse error: {exc}"))
        return findings

    for idx, nav_links in enumerate(parser.navs, start=1):
        seen_text = set()
        seen_href = set()
        for link in nav_links:
            text_key = normalize_text(link.get("text", ""))
            href_key = (link.get("href", "") or "").strip().lower()
            if text_key and text_key in seen_text:
                findings.append(
                    Finding(path, "nav-duplicate-text", f"Nav #{idx} duplicate label: {link.get('text','')}" )
                )
                break
            if href_key and href_key in seen_href:
                findings.append(
                    Finding(path, "nav-duplicate-href", f"Nav #{idx} duplicate href: {link.get('href','')}" )
                )
                break
            if text_key:
                seen_text.add(text_key)
            if href_key:
                seen_href.add(href_key)
    return findings


def check_submodular_status(path: Path, text: str, require_canonical: bool = False) -> List[Finding]:
    findings: List[Finding] = []
    lower_text = text.lower()
    for pattern in LEGACY_SUBMODULAR_STATUS_PATTERNS:
        if pattern in lower_text:
            findings.append(
                Finding(path, "submodular-status", f"Legacy project status found: {pattern!r}")
            )

    if not require_canonical or path.name not in SUBMODULAR_STATUS_PAGES:
        return findings

    for required in (SUBMODULAR_PUBLISHED_SCOPE, SUBMODULAR_POST_PUBLICATION_SCOPE):
        if required not in text:
            findings.append(
                Finding(path, "submodular-status", "Canonical AFP/repository scope statement is missing")
            )
            break
    return findings


def check_academic_identity(path: Path, text: str, root: Path) -> List[Finding]:
    findings: List[Finding] = []
    is_academic_root = path.parent == root and path.name in ACADEMIC_ROOT_PAGES
    is_note = path.parent == root / "notes"
    is_academic_post = path.parent == root / "post" and path.name != "metalcore-piano-lab.html"
    is_formal_academic = is_academic_root or is_note or is_academic_post
    is_home = path.parent == root and path.name == "index.html"

    if is_formal_academic or is_home:
        for pattern in LEGACY_LOCATION_PATTERNS:
            if pattern.lower() in text.lower():
                findings.append(Finding(path, "academic-location", f"Ambiguous location wording found: {pattern!r}"))

    if not is_formal_academic:
        return findings

    for pattern in LEGACY_ACADEMIC_IDENTITY_PATTERNS:
        if pattern.lower() in text.lower():
            findings.append(Finding(path, "academic-identity", f"Legacy academic identity found: {pattern!r}"))

    if re.search(r'<p class="article-meta">\s*HazezZ\b', text):
        findings.append(Finding(path, "academic-identity", "Academic article is credited to HazezZ"))

    if "Feier Lyu" not in text:
        findings.append(Finding(path, "academic-identity", "Primary academic identity 'Feier Lyu' is missing"))
    return findings


def check_files(root: Path) -> List[Finding]:
    findings: List[Finding] = []
    for path in sorted(root.rglob("*.html")):
        # Skip vendored/generated hidden dirs if ever added.
        if "node_modules" in path.parts or any(part.startswith(".") for part in path.parts):
            continue
        text = read_text(path)
        findings.extend(check_footer_years(path, text))
        findings.extend(check_city_case(path, text))
        findings.extend(check_pending_in_seo(path, text))
        findings.extend(check_nav_duplicates(path, text))
        findings.extend(check_submodular_status(path, text, require_canonical=path.parent == root))
        findings.extend(check_academic_identity(path, text, root))
    generated_text_paths = list((root / "assets").rglob("*.json")) + [root / "feed.xml"]
    for path in sorted(p for p in generated_text_paths if p.is_file()):
        findings.extend(check_submodular_status(path, read_text(path)))
    runtime_paths = [root / "protect-media.js", root / "assets/js/structured-data.js"]
    for path in runtime_paths:
        if not path.is_file():
            continue
        text = read_text(path)
        for pattern in RUNTIME_ACADEMIC_LEGACY_PATTERNS:
            if pattern in text:
                findings.append(Finding(path, "academic-runtime", f"Legacy runtime identity/status found: {pattern!r}"))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Run lightweight consistency checks for Chronohaze HTML pages")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()

    root = args.root.resolve()
    findings = check_files(root)
    if not findings:
        print("OK: no consistency findings")
        return 0

    for f in findings:
        print(f"{f.path.relative_to(root)}: [{f.kind}] {f.detail}")
    print(f"\nTotal findings: {len(findings)}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
