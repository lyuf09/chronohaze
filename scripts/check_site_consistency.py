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


def check_files(root: Path) -> List[Finding]:
    findings: List[Finding] = []
    for path in sorted(root.rglob("*.html")):
        # Skip vendored/generated hidden dirs if ever added.
        if any(part.startswith(".") for part in path.parts):
            continue
        text = read_text(path)
        findings.extend(check_footer_years(path, text))
        findings.extend(check_city_case(path, text))
        findings.extend(check_pending_in_seo(path, text))
        findings.extend(check_nav_duplicates(path, text))
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
