#!/usr/bin/env python3
"""Reject public-site text that can render as color emoji.

Ordinary typographic symbols remain allowed. The diagonal external-link arrow
must carry U+FE0E (text presentation) because mobile platforms otherwise tend
to substitute an emoji glyph.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


TEXT_SUFFIXES = {".css", ".html", ".js", ".json", ".md", ".xml"}
SKIP_DIRS = {".git", "node_modules", "playwright-report", "test-results", "tests"}

# Unicode characters whose default presentation is emoji, plus the broad
# supplementary pictographic blocks. U+FE0F is rejected independently below.
EMOJI_PRESENTATION_RE = re.compile(
    "["
    "\u231a-\u231b\u23e9-\u23ec\u23f0\u23f3"
    "\u25fd-\u25fe\u2614-\u2615\u2648-\u2653\u267f\u2693\u26a1"
    "\u26aa-\u26ab\u26bd-\u26be\u26c4-\u26c5\u26ce\u26d4\u26ea"
    "\u26f2-\u26f3\u26f5\u26fa\u26fd\u2705\u270a-\u270b\u2728"
    "\u274c\u274e\u2753-\u2755\u2757\u2795-\u2797\u27b0\u27bf"
    "\u2b1b-\u2b1c\u2b50\u2b55"
    "\U0001f000-\U0001faff"
    "]"
)
BARE_EXTERNAL_ARROW_RE = re.compile("↗(?!\ufe0e)")


def iter_public_text_files(root: Path):
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(root).parts):
            continue
        yield path


def main() -> int:
    parser = argparse.ArgumentParser(description="Check that public text cannot render as emoji")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    args = parser.parse_args()
    root = args.root.resolve()

    findings: list[str] = []
    for path in iter_public_text_files(root):
        text = path.read_text(encoding="utf-8")
        relative = path.relative_to(root)
        for line_number, line in enumerate(text.splitlines(), start=1):
            if "\ufe0f" in line:
                findings.append(f"{relative}:{line_number}: emoji presentation selector U+FE0F")
            match = EMOJI_PRESENTATION_RE.search(line)
            if match:
                findings.append(
                    f"{relative}:{line_number}: emoji-presentation character {match.group(0)!r}"
                )
            if BARE_EXTERNAL_ARROW_RE.search(line):
                findings.append(
                    f"{relative}:{line_number}: bare ↗ must be followed by U+FE0E text presentation"
                )

    if findings:
        print("ERROR: emoji-capable public text found")
        for finding in findings:
            print(f"- {finding}")
        return 1

    print("OK: public text uses no emoji presentation; external arrows are text-only")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
