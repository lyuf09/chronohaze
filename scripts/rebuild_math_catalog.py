#!/usr/bin/env python3
from __future__ import annotations

import argparse, html, json, re
from datetime import date
from pathlib import Path
from typing import Dict, List

CARD_RE = re.compile(r'<article\s+class="math-card"(?P<attrs>[^>]*)>(?P<body>.*?)</article>', re.S)
ATTR_RE = re.compile(r'([:\w-]+)="([^"]*)"')
TAG_RE = re.compile(r'<[^>]+>')
DATE_FULL_ZH_RE = re.compile(r'^\s*(\d{4})年(\d{1,2})月(\d{1,2})日\s*$')
DATE_MONTH_ZH_RE = re.compile(r'^\s*(\d{4})年(\d{1,2})月\s*$')
DATE_MD_ZH_RE = re.compile(r'^\s*(\d{1,2})月(\d{1,2})日\s*$')
CARD_DATE_RE = re.compile(r'<p\s+class="math-date"(?P<attrs>[^>]*)>(?P<body>.*?)</p>', re.S)
CARD_TITLE_RE = re.compile(r'<a\s+class="math-title-link"(?P<attrs>[^>]*)>(?P<body>.*?)</a>', re.S)
CARD_DESC_RE = re.compile(r'<p\s+class="math-desc"(?P<attrs>[^>]*)>(?P<body>.*?)</p>', re.S)
CARD_TAG_RE = re.compile(r'<span\s+class="math-tag"[^>]*>(?P<body>.*?)</span>', re.S)

# Canonical date style for index cards: ISO-like labels
# (full date: YYYY-MM-DD, month-only: YYYY-MM)
MATH_DATE_OVERRIDES = {
    "post/metalcore-piano-lab.html": "2026-02-07",
    "post/spring-2026.html": "2026-01-29",
}


def clean(fragment: str) -> str:
    txt = fragment.replace('<br />', ' ').replace('<br/>', ' ').replace('<br>', ' ')
    txt = TAG_RE.sub('', txt)
    return re.sub(r'\s+', ' ', html.unescape(txt)).strip()


def attrs_dict(fragment: str) -> Dict[str, str]:
    return {k: v for k, v in ATTR_RE.findall(fragment or "")}


def split_meta(raw: str) -> List[str]:
    text = clean(raw)
    if not text:
        return []
    parts = [part.strip() for part in re.split(r'\s*·\s*', text) if part.strip()]
    return parts


def _zp(n: str) -> str:
    return f"{int(n):02d}"


def normalize_math_date(raw: str, href: str) -> str:
    value = (raw or "").strip()
    if not value:
        return ""
    if href in MATH_DATE_OVERRIDES:
        return MATH_DATE_OVERRIDES[href]
    m = DATE_FULL_ZH_RE.match(value)
    if m:
        y, mo, d = m.groups()
        return f"{y}-{_zp(mo)}-{_zp(d)}"
    m = DATE_MONTH_ZH_RE.match(value)
    if m:
        y, mo = m.groups()
        return f"{y}-{_zp(mo)}"
    # Leave unsupported formats unchanged; drift checks will still catch weirdness.
    m = DATE_MD_ZH_RE.match(value)
    if m:
        # Yearless dates should be avoided. Keep original if no explicit override was provided.
        return value
    return value


def parse_cards(text: str) -> List[Dict[str, object]]:
    items: List[Dict[str, object]] = []
    for idx, m in enumerate(CARD_RE.finditer(text), start=1):
        attrs = {k: v for k, v in ATTR_RE.findall(m.group('attrs') or '')}
        body = m.group('body') or ''
        href = (attrs.get('data-href') or '').strip()
        if not href:
            continue
        date_m = CARD_DATE_RE.search(body)
        title_m = CARD_TITLE_RE.search(body)
        desc_m = CARD_DESC_RE.search(body)
        more_m = re.search(r'<a\s+class="math-more"\s+href="([^"]+)"', body, re.S)
        date_attrs = attrs_dict(date_m.group('attrs') if date_m else '')
        title_attrs = attrs_dict(title_m.group('attrs') if title_m else '')
        desc_attrs = attrs_dict(desc_m.group('attrs') if desc_m else '')
        date_zh = date_attrs.get('data-copy-zh') or clean(date_m.group('body') if date_m else '')
        date_en = date_attrs.get('data-copy-en') or date_zh
        title_zh = title_attrs.get('data-copy-zh') or clean(title_m.group('body') if title_m else '')
        title_en = title_attrs.get('data-copy-en') or title_zh
        excerpt_zh = desc_attrs.get('data-copy-zh') or clean(desc_m.group('body') if desc_m else '')
        excerpt_en = desc_attrs.get('data-copy-en') or excerpt_zh
        meta_zh = split_meta(date_zh)
        meta_en = split_meta(date_en)
        line_tags = [clean(tag.group('body')) for tag in CARD_TAG_RE.finditer(body) if clean(tag.group('body'))]
        items.append({
            'order': idx,
            'url': href,
            'date': normalize_math_date(meta_zh[0] if meta_zh else '', href),
            'title': title_zh,
            'title_en': title_en,
            'excerpt': excerpt_zh,
            'excerpt_en': excerpt_en,
            'readmore_url': (more_m.group(1).strip() if more_m else href),
            'tags': ['math', 'article'],
            'line_tags': line_tags,
            'reading_time_zh': meta_zh[1] if len(meta_zh) > 1 else '',
            'reading_time_en': meta_en[1] if len(meta_en) > 1 else '',
        })
    return items


def main() -> int:
    ap = argparse.ArgumentParser(description='Build canonical math catalog metadata from math.html')
    ap.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = ap.parse_args()
    root = args.root.resolve()
    src = root / 'math.html'
    out = root / 'assets' / 'data' / 'math-catalog.json'
    text = src.read_text(encoding='utf-8')
    items = parse_cards(text)
    payload = {
        'generated_at': date.today().isoformat(),
        'source': 'math.html',
        'items': items,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {out} ({len(items)} items)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
