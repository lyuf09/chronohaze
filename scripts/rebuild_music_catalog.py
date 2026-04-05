#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import re
from datetime import date
from pathlib import Path
from typing import Dict, List

ARTICLE_RE = re.compile(r"<article\s+class=\"track-row(?P<class_extra>[^\"]*)\"(?P<attrs>[^>]*)>(?P<body>.*?)</article>", re.S)
ATTR_RE = re.compile(r'([:\w-]+)="([^"]*)"')
TAG_TEXT_RE = re.compile(r"<[^>]+>")

MISSING_TAG_OVERRIDES = {
    "music/track-felix.html": ["single"],
    "music/track-negau.html": ["single"],
    "music/track-seaside-town.html": ["single"],
}


def clean_html_text(fragment: str) -> str:
    text = fragment.replace("<br />", " ").replace("<br/>", " ").replace("<br>", " ")
    text = TAG_TEXT_RE.sub("", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def split_tags(raw: str) -> List[str]:
    if not raw:
        return []
    tags = []
    seen = set()
    for token in raw.split(','):
        tag = token.strip().lower()
        if not tag or tag in seen:
            continue
        seen.add(tag)
        tags.append(tag)
    return tags


def infer_has_audio(title: str) -> bool:
    return not bool(re.search(r"音频待上传|audio pending upload", title or "", re.I))


def parse_rows(html_text: str) -> List[Dict[str, object]]:
    rows: List[Dict[str, object]] = []
    for idx, m in enumerate(ARTICLE_RE.finditer(html_text), start=1):
        attrs = {k: v for k, v in ATTR_RE.findall(m.group("attrs") or "")}
        body = m.group("body") or ""

        href = attrs.get("data-href", "").strip()
        if not href:
            continue

        date_match = re.search(r'<p\s+class="track-date">(.*?)</p>', body, re.S)
        title_match = re.search(r'<p\s+class="track-title">(.*?)</p>', body, re.S)
        artist_match = re.search(r'<p\s+class="track-artist">(.*?)</p>', body, re.S)

        date_text = clean_html_text(date_match.group(1) if date_match else "")
        title_text = clean_html_text(title_match.group(1) if title_match else "")
        artist_text = clean_html_text(artist_match.group(1) if artist_match else "")

        class_extra = (m.group("class_extra") or "")
        row_type = "album" if "track-row-album" in class_extra else "single"
        year = (attrs.get("data-music-year") or "").strip()

        tags = split_tags(attrs.get("data-tags", ""))
        if not tags:
            tags = MISSING_TAG_OVERRIDES.get(href, [])[:]
        if not tags:
            tags = ["album" if row_type == "album" else "single"]

        rows.append(
            {
                "order": idx,
                "url": href,
                "type": row_type,
                "year": year,
                "date": date_text,
                "title": title_text,
                "artist": artist_text,
                "tags": tags,
                "has_audio": infer_has_audio(title_text),
            }
        )
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Build canonical music catalog metadata from music.html")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()

    root = args.root.resolve()
    source = root / "music.html"
    if not source.exists():
        source = root / "yin-le.html"
    out = root / "assets" / "data" / "music-catalog.json"

    if not source.exists():
        raise SystemExit(f"Missing source file: {source}")

    rows = parse_rows(source.read_text(encoding="utf-8"))
    payload = {
        "generated_at": date.today().isoformat(),
        "source": source.name,
        "items": rows,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({len(rows)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
