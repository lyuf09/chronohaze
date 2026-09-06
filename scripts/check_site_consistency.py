#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
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
    "projects.html",
    "research.html",
}
SUBMODULAR_PUBLISHED_SCOPE = (
    "Published in AFP on May 26, 2026: a formalization of the classical greedy algorithm "
    "and a verified stateful lazy-greedy variant for cardinality-constrained "
    "monotone submodular maximization."
)
SUBMODULAR_POST_PUBLICATION_SCOPE = (
    "Post-publication extension: the current repository additionally develops a "
    "stochastic-greedy line, including the sampling model, approximation proof, "
    "and oracle-cost bounds."
)
SUBMODULAR_PROJECTS_STATUS_MARKERS = (
    "Published in the Archive of Formal Proofs on May 26, 2026.",
    "verified stateful lazy-greedy variant",
    "post-publication stochastic-greedy extension",
    "the sampling model, approximation proof, and oracle-cost bounds",
)
SUBMODULAR_ACADEMIC_STATUS_MARKERS = (
    "Published May 26, 2026",
    "full Isabelle/HOL development under the supervision of Wenda Li",
)
SUBMODULAR_CV_STATUS_MARKERS = (
    "Feier Lyu. “Greedy Algorithms for Cardinality-Constrained Submodular Maximization.”",
    "Formalizes deterministic greedy and a verified stateful lazy-greedy implementation",
    "full Isabelle/HOL development under the supervision of Wenda Li",
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
PGD_NOTE = "projected-gradient-descent-isabelle-hol.html"
PGD_REQUIRED_FRAMING = (
    "Projected gradient descent is one of the basic algorithmic templates for constrained smooth optimization.",
    "the projection inequality",
    "the projected-gradient mapping",
    "linear convergence under strong convexity",
    "reusable telescoping structures",
)
LEGACY_PGD_INTRO_PATTERNS = (
    "考完闲得慌",
    "strange open interval after exams",
    "AFP side is temporarily blocked by a technical issue",
    "AFP 那边暂时卡在一个技术问题上",
)
LEGACY_HOME_SECTION_TITLES = (
    "三个硬证据",
    "Three points of evidence",
)
LEGACY_TECHNICAL_NOTES_VISUAL_PATTERNS = (
    "medium.com/@syedalihamza23",
)
LEGACY_REDIRECT_PAGES = {
    "blank.html",
    "blank-1.html",
    "portfolio-1.html",
    "yin-le.html",
    "research-summary.html",
}
SEO_LASTMOD_MINIMUMS = {
    "https://lyuf09.github.io/chronohaze/": "2026-08-01",
    "https://lyuf09.github.io/chronohaze/academic.html": "2026-08-01",
    "https://lyuf09.github.io/chronohaze/research.html": "2026-08-01",
    "https://lyuf09.github.io/chronohaze/projects.html": "2026-08-01",
    "https://lyuf09.github.io/chronohaze/math.html": "2026-08-01",
    "https://lyuf09.github.io/chronohaze/notes/network_localization_structural_certificates.html": "2026-08-23",
    "https://lyuf09.github.io/chronohaze/post/projected-gradient-descent-isabelle-hol.html": "2026-08-01",
    "https://lyuf09.github.io/chronohaze/photography.html": "2026-08-01",
}
PUBLIC_NOTE_PATHS = {
    "notes/ttgda_second_order_tracking_note",
}
LEGACY_PUBLIC_COPY_PATTERNS = (
    "辗转不同国家无固定号码",
    "No fixed phone number while moving across countries",
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

    if path.name == "projects.html":
        required_statements = SUBMODULAR_PROJECTS_STATUS_MARKERS
    elif path.name == "academic.html":
        required_statements = SUBMODULAR_ACADEMIC_STATUS_MARKERS
    elif path.name == "cv.html":
        required_statements = SUBMODULAR_CV_STATUS_MARKERS
    else:
        required_statements = (SUBMODULAR_PUBLISHED_SCOPE, SUBMODULAR_POST_PUBLICATION_SCOPE)
    for required in required_statements:
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


def check_pgd_framing(path: Path, text: str) -> List[Finding]:
    if path.name != PGD_NOTE or path.parent.name != "post":
        return []

    findings: List[Finding] = []
    lower_text = text.lower()
    for pattern in LEGACY_PGD_INTRO_PATTERNS:
        if pattern.lower() in lower_text:
            findings.append(Finding(path, "pgd-framing", f"Legacy development-log framing found: {pattern!r}"))
    for required in PGD_REQUIRED_FRAMING:
        if required.lower() not in lower_text:
            findings.append(Finding(path, "pgd-framing", f"Required mathematical framing is missing: {required!r}"))
    return findings


def check_home_section_titles(path: Path, text: str, root: Path) -> List[Finding]:
    if path.parent != root or path.name != "index.html":
        return []
    return [
        Finding(path, "home-section-title", f"Legacy homepage section title found: {pattern!r}")
        for pattern in LEGACY_HOME_SECTION_TITLES
        if pattern.lower() in text.lower()
    ]


def check_technical_notes_visual(path: Path, text: str, root: Path) -> List[Finding]:
    if path.parent != root or path.name != "math.html":
        return []
    return [
        Finding(path, "technical-notes-visual", f"External fractal visual reference found: {pattern!r}")
        for pattern in LEGACY_TECHNICAL_NOTES_VISUAL_PATTERNS
        if pattern.lower() in text.lower()
    ]


def check_hreflang_duplicates(path: Path, text: str) -> List[Finding]:
    values = re.findall(
        r'<link\b[^>]*\brel=["\']alternate["\'][^>]*\bhreflang=["\']([^"\']+)',
        text,
        flags=re.I,
    )
    if len(values) == len(set(values)):
        return []
    return [Finding(path, "hreflang", f"Duplicate hreflang alternates found: {values}")]


def check_legacy_redirect_noindex(path: Path, text: str, root: Path) -> List[Finding]:
    if path.parent != root or path.name not in LEGACY_REDIRECT_PAGES:
        return []
    if re.search(r'<meta\b[^>]*name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', text, re.I):
        return []
    return [Finding(path, "legacy-indexing", "Legacy or redirect page is missing a noindex directive")]


def check_legacy_public_copy(path: Path, text: str) -> List[Finding]:
    return [
        Finding(path, "public-copy", f"Legacy public wording found: {pattern!r}")
        for pattern in LEGACY_PUBLIC_COPY_PATTERNS
        if pattern.lower() in text.lower()
    ]


def check_analytics_privacy(path: Path, text: str, root: Path) -> List[Finding]:
    findings: List[Finding] = []
    if "<footer" in text.lower():
        control_count = len(
            re.findall(r'<p\s+class=["\']analytics-control["\'][^>]*data-analytics-control', text, re.I)
        )
        if control_count != 1:
            findings.append(
                Finding(path, "analytics-control", f"Expected one footer Analytics control, found {control_count}")
            )
        if text.count('id="chronohaze-analytics-runtime"') != 1:
            findings.append(Finding(path, "analytics-runtime", "Analytics preference runtime is missing or duplicated"))
        for marker in (
            "ga-disable-",
            "chronohazeAnalyticsInitialEnabled",
            "analytics-control.min.css",
            "analytics-control.min.js",
        ):
            if marker not in text:
                findings.append(Finding(path, "analytics-runtime", f"Required privacy marker is missing: {marker}"))
    if "Google tag (gtag.js), deferred until idle" in text:
        findings.append(Finding(path, "analytics-runtime", "Legacy Analytics loader remains in the page"))
    if path.parent == root and path.name == "policy.html":
        for disclosure in (
            "Analytics is enabled by default",
            "Google Analytics may set first-party cookies",
            "chronohaze-analytics",
            "Google Signals and advertising-personalization signals are disabled",
        ):
            if disclosure not in text:
                findings.append(Finding(path, "privacy-disclosure", f"Required disclosure is missing: {disclosure}"))
    return findings


def check_seo_artifacts(root: Path) -> List[Finding]:
    findings: List[Finding] = []
    robots_path = root / "robots.txt"
    if not robots_path.is_file():
        findings.append(Finding(robots_path, "robots", "robots.txt is missing"))
    else:
        robots = read_text(robots_path)
        if re.search(r"Disallow:\s*/\*?\.pdf", robots, re.I):
            findings.append(Finding(robots_path, "robots", "Public technical-note PDFs are globally disallowed"))

    sitemap_path = root / "sitemap.xml"
    if not sitemap_path.is_file():
        findings.append(Finding(sitemap_path, "sitemap", "sitemap.xml is missing"))
    else:
        try:
            tree = ET.parse(sitemap_path)
            ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            entries = {
                node.findtext("s:loc", default="", namespaces=ns): node.findtext(
                    "s:lastmod", default="", namespaces=ns
                )
                for node in tree.getroot().findall("s:url", ns)
            }
            for loc, minimum in SEO_LASTMOD_MINIMUMS.items():
                if entries.get(loc, "") < minimum:
                    findings.append(
                        Finding(sitemap_path, "sitemap", f"{loc} lastmod is older than {minimum}")
                    )
            for stem in PUBLIC_NOTE_PATHS:
                for suffix in (".html", ".pdf"):
                    loc = f"https://lyuf09.github.io/chronohaze/{stem}{suffix}"
                    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", entries.get(loc, "")):
                        findings.append(
                            Finding(sitemap_path, "sitemap", f"Public note is missing a valid lastmod: {loc}")
                        )
        except ET.ParseError as exc:
            findings.append(Finding(sitemap_path, "sitemap", f"Invalid sitemap XML: {exc}"))

    feed_path = root / "feed.xml"
    if not feed_path.is_file():
        findings.append(Finding(feed_path, "rss", "feed.xml is missing"))
    else:
        try:
            channel = ET.parse(feed_path).getroot().find("channel")
            if channel is None:
                findings.append(Finding(feed_path, "rss", "RSS channel is missing"))
            else:
                build_date = channel.findtext("lastBuildDate", default="")
                try:
                    parsed_build_date = parsedate_to_datetime(build_date)
                    if parsed_build_date.tzinfo is None:
                        parsed_build_date = parsed_build_date.replace(tzinfo=timezone.utc)
                    if parsed_build_date < datetime(2026, 8, 1, tzinfo=timezone.utc):
                        findings.append(Finding(feed_path, "rss", "RSS lastBuildDate predates the August 2026 update"))
                except (TypeError, ValueError, OverflowError):
                    findings.append(Finding(feed_path, "rss", "RSS lastBuildDate is invalid"))
                links = {item.findtext("link", default="") for item in channel.findall("item")}
                for stem in PUBLIC_NOTE_PATHS:
                    loc = f"https://lyuf09.github.io/chronohaze/{stem}.html"
                    if loc not in links:
                        findings.append(Finding(feed_path, "rss", f"Public note is missing from RSS: {loc}"))
        except ET.ParseError as exc:
            findings.append(Finding(feed_path, "rss", f"Invalid RSS XML: {exc}"))
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
        findings.extend(check_pgd_framing(path, text))
        findings.extend(check_home_section_titles(path, text, root))
        findings.extend(check_technical_notes_visual(path, text, root))
        findings.extend(check_hreflang_duplicates(path, text))
        findings.extend(check_legacy_redirect_noindex(path, text, root))
        findings.extend(check_legacy_public_copy(path, text))
        findings.extend(check_analytics_privacy(path, text, root))
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
    analytics_runtime = root / "assets/js/analytics-control.js"
    if not analytics_runtime.is_file():
        findings.append(Finding(analytics_runtime, "analytics-runtime", "Analytics control source is missing"))
    else:
        analytics_text = read_text(analytics_runtime)
        for marker in (
            'allow_google_signals: false',
            'allow_ad_personalization_signals: false',
            'preferenceKey = "chronohaze-analytics"',
            'analytics_storage: analyticsEnabled ? "granted" : "denied"',
        ):
            if marker not in analytics_text:
                findings.append(
                    Finding(analytics_runtime, "analytics-runtime", f"Required privacy marker is missing: {marker}")
                )
    findings.extend(check_seo_artifacts(root))
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
