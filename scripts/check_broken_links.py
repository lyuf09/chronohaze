#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
import socket
import time
from typing import Iterable, List, Optional, Set, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


SKIP_DIRS = {".git", ".github", "_site", "node_modules", "__pycache__"}
KEY_EXTERNAL_PAGES = {"index.html", "cv.html", "research.html", "research-summary.html", "search.html"}
IGNORE_SCHEMES = {"mailto", "tel", "javascript", "data", "blob"}


@dataclass(frozen=True)
class Ref:
    page: str
    tag: str
    attr: str
    url: str
    line: int
    col: int


class RefCollector(HTMLParser):
    def __init__(self, page: str):
        super().__init__(convert_charrefs=True)
        self.page = page
        self.refs: List[Ref] = []

    def _push(self, tag: str, attr: str, value: str) -> None:
        if not value:
            return
        line, col = self.getpos()
        self.refs.append(Ref(self.page, tag, attr, value.strip(), line, col))

    def _collect_srcset(self, tag: str, srcset: str) -> None:
        for candidate in (srcset or "").split(","):
            part = candidate.strip()
            if not part:
                continue
            url = part.split()[0]
            self._push(tag, "srcset", url)

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        attr_map = {k.lower(): (v or "") for k, v in attrs}
        if tag == "a":
            self._push(tag, "href", attr_map.get("href", ""))
        elif tag in {"img", "script", "audio", "video", "iframe"}:
            self._push(tag, "src", attr_map.get("src", ""))
        elif tag == "link":
            # Check all link hrefs (stylesheet/icon/canonical/preload etc.)
            self._push(tag, "href", attr_map.get("href", ""))
            self._collect_srcset(tag, attr_map.get("imagesrcset", ""))
        elif tag == "source":
            self._push(tag, "src", attr_map.get("src", ""))
            self._collect_srcset(tag, attr_map.get("srcset", ""))

    def handle_startendtag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        self.handle_starttag(tag, attrs)


def iter_html_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*.html"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        yield path


def parse_refs(root: Path) -> List[Ref]:
    refs: List[Ref] = []
    for path in iter_html_files(root):
        rel = path.relative_to(root).as_posix()
        parser = RefCollector(rel)
        parser.feed(path.read_text(encoding="utf-8"))
        refs.extend(parser.refs)
    return refs


def load_avif_generation_state(root: Path) -> bool:
    manifest_path = root / "assets" / "data" / "image-variants.json"
    if not manifest_path.exists():
        return False
    try:
        with manifest_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        return bool(data.get("avif_encoder_available"))
    except Exception:
        return False


def normalize_internal_target(root: Path, page: str, raw_url: str) -> Optional[Path]:
    split = urlsplit(raw_url)
    if split.scheme and split.scheme.lower() in {"http", "https"}:
        return None
    if split.scheme and split.scheme.lower() in IGNORE_SCHEMES:
        return None
    path = (split.path or "").strip()
    if not path:
        return None

    # Root-relative under GitHub Pages project path.
    if path.startswith("/chronohaze/"):
        candidate = root / path[len("/chronohaze/") :]
    elif path.startswith("/"):
        candidate = root / path[1:]
    else:
        candidate = (root / page).parent / path

    return candidate.resolve()


def internal_target_exists(root: Path, target: Path) -> bool:
    try:
        target.relative_to(root.resolve())
    except ValueError:
        return False

    if target.exists():
        return True
    if target.is_dir() and (target / "index.html").exists():
        return True
    # Support extensionless links like "research" -> research.html
    if target.suffix == "" and target.with_suffix(".html").exists():
        return True
    return False


def should_check_external(ref: Ref) -> bool:
    if ref.tag != "a" or ref.attr != "href":
        return False
    return ref.page in KEY_EXTERNAL_PAGES


def _is_transient_network_error(message: str) -> bool:
    msg = (message or "").lower()
    transient_needles = [
        "timed out",
        "timeout",
        "temporary failure",
        "temporary",
        "name or service not known",
        "nodename nor servname provided",
        "no address associated",
        "connection reset",
        "connection refused",
        "network is unreachable",
        "tlsv1 alert",
        "ssl:",
        "remote end closed connection",
    ]
    return any(needle in msg for needle in transient_needles)


def check_external_urls(
    urls: List[str], timeout: float = 8.0, retries: int = 2
) -> Tuple[List[str], List[str]]:
    hard_errors: List[str] = []
    soft_errors: List[str] = []
    for url in urls:
        status = None
        last_err = None
        last_status = None
        for attempt in range(retries + 1):
            status = None
            last_err = None
            for method in ("HEAD", "GET"):
                try:
                    req = Request(
                        url,
                        method=method,
                        headers={
                            "User-Agent": "chronohaze-link-check/1.0",
                            "Accept": "*/*",
                        },
                    )
                    with urlopen(req, timeout=timeout) as resp:  # noqa: S310
                        status = getattr(resp, "status", None) or resp.getcode()
                    break
                except HTTPError as exc:
                    status = exc.code
                    last_status = status
                    # Some sites block bots; treat as reachable for key-profile links.
                    domain = (urlsplit(url).hostname or "").lower()
                    if domain.endswith("linkedin.com") and status in {403, 429, 999}:
                        last_err = None
                        break
                    if domain.endswith("instagram.com") and status in {403, 429}:
                        last_err = None
                        break
                    if method == "HEAD" and status in {405, 501}:
                        continue
                    # 401/403 can still indicate reachable endpoints
                    if status in {401, 403}:
                        last_err = None
                        break
                    last_err = f"HTTP {status}"
                except URLError as exc:
                    reason = exc.reason
                    if isinstance(reason, socket.timeout):
                        reason = "timed out"
                    last_err = str(reason)
                    if method == "HEAD":
                        continue
                except Exception as exc:  # pragma: no cover - defensive
                    last_err = str(exc)
                    if method == "HEAD":
                        continue
            if not last_err:
                break
            if attempt < retries:
                time.sleep(0.5 * (attempt + 1))

        if not last_err:
            continue

        if last_status in {404, 410}:
            hard_errors.append(f"{url} ({last_err})")
            continue
        if last_status and 400 <= last_status < 500:
            # Other 4xx often indicate policy/rate-limit/bot blocking; keep non-blocking.
            soft_errors.append(f"{url} ({last_err})")
            continue
        if _is_transient_network_error(last_err) or (last_status and last_status >= 500):
            soft_errors.append(f"{url} ({last_err})")
            continue
        # Unknown failure mode: still report, but do not break deploys on flaky third-party endpoints.
        soft_errors.append(f"{url} ({last_err})")

    return hard_errors, soft_errors


def main() -> int:
    ap = argparse.ArgumentParser(description="Check internal links and key external links.")
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--check-external", action="store_true", help="Force external link checks")
    ap.add_argument("--skip-external", action="store_true", help="Skip external link checks")
    args = ap.parse_args()
    root = args.root.resolve()

    refs = parse_refs(root)
    avif_generated = load_avif_generation_state(root)
    internal_errors: List[str] = []
    key_external_urls: Set[str] = set()

    for ref in refs:
        split = urlsplit(ref.url)
        scheme = (split.scheme or "").lower()
        if scheme in {"http", "https"}:
            if should_check_external(ref):
                key_external_urls.add(ref.url)
            continue
        if scheme in IGNORE_SCHEMES:
            continue
        if ref.url.startswith("#"):
            continue

        target = normalize_internal_target(root, ref.page, ref.url)
        if target is None:
            continue
        if target.suffix.lower() == ".avif" and not avif_generated:
            # Local dev machines may intentionally skip AVIF generation; CI checks with avifenc enabled.
            continue
        if not internal_target_exists(root, target):
            internal_errors.append(
                f"{ref.page}:{ref.line}:{ref.col} {ref.tag}[{ref.attr}] -> {ref.url}"
            )

    if internal_errors:
        print("ERROR: broken internal links/resources found")
        for err in sorted(internal_errors):
            print(f"- {err}")
        return 1

    do_external = False
    if args.skip_external:
        do_external = False
    elif args.check_external:
        do_external = True
    else:
        do_external = str(os.environ.get("CI", "")).lower() in {"1", "true", "yes"}

    if not do_external:
        print(
            f"OK: internal links/resources pass ({len(refs)} refs parsed). "
            "External key-link checks skipped outside CI."
        )
        return 0

    hard_external_errors, soft_external_errors = check_external_urls(sorted(key_external_urls))
    if hard_external_errors:
        print("ERROR: key external links unreachable")
        for err in hard_external_errors:
            print(f"- {err}")
        return 1

    if soft_external_errors:
        print("WARN: some key external links were not verifiable in this run (non-blocking)")
        for err in soft_external_errors:
            print(f"- {err}")
        print(
            f"OK: internal links/resources pass; key external links checked with warnings "
            f"({len(key_external_urls)} URLs checked)"
        )
        return 0

    print(
        f"OK: internal links/resources pass; key external links reachable "
        f"({len(key_external_urls)} URLs checked)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
