#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, List, Optional, Tuple


SKIP_DIRS = {".git", ".github", "_site", "node_modules", "__pycache__"}


@dataclass(frozen=True)
class ImgAltRecord:
    page: str
    line: int
    col: int
    alt_present: bool
    alt_value: str


class ImgAltParser(HTMLParser):
    def __init__(self, page: str) -> None:
        super().__init__(convert_charrefs=True)
        self.page = page
        self.records: List[ImgAltRecord] = []

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        if tag.lower() != "img":
            return
        attr_map = {k.lower(): (v if v is not None else "") for k, v in attrs}
        line, col = self.getpos()
        alt_present = "alt" in attr_map
        alt_value = attr_map.get("alt", "")
        self.records.append(
            ImgAltRecord(
                page=self.page,
                line=line,
                col=col,
                alt_present=alt_present,
                alt_value=alt_value,
            )
        )

    def handle_startendtag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        self.handle_starttag(tag, attrs)


def iter_html_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*.html"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        yield path


def collect(root: Path) -> List[ImgAltRecord]:
    rows: List[ImgAltRecord] = []
    for html_file in iter_html_files(root):
        rel = html_file.relative_to(root).as_posix()
        parser = ImgAltParser(rel)
        parser.feed(html_file.read_text(encoding="utf-8"))
        rows.extend(parser.records)
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(description="Check <img> alt coverage across the site.")
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--max-report", type=int, default=15, help="Max missing-alt entries to print")
    args = ap.parse_args()

    root = args.root.resolve()
    rows = collect(root)
    total = len(rows)
    present = sum(1 for r in rows if r.alt_present)
    missing = [r for r in rows if not r.alt_present]
    empty = [r for r in rows if r.alt_present and not r.alt_value.strip()]
    non_empty = [r for r in rows if r.alt_present and r.alt_value.strip()]

    if total == 0:
        print("WARNING: no <img> tags found")
        return 0

    coverage = (present / total) * 100.0
    meaningful = (len(non_empty) / total) * 100.0

    print(
        "ALT coverage: "
        f"total={total}, alt-present={present} ({coverage:.1f}%), "
        f"non-empty={len(non_empty)} ({meaningful:.1f}%), empty={len(empty)}, missing={len(missing)}"
    )

    if missing:
        print("ERROR: images missing alt attribute")
        for row in missing[: max(0, args.max_report)]:
            print(f"- {row.page}:{row.line}:{row.col}")
        if len(missing) > args.max_report:
            print(f"... and {len(missing) - args.max_report} more")
        return 1

    print("OK: all images include alt attributes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
