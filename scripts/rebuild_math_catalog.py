#!/usr/bin/env python3
from __future__ import annotations

import argparse, html, json, re
from datetime import date
from pathlib import Path
from typing import Dict, List

CARD_RE = re.compile(r'<article\s+class="math-card"(?P<attrs>[^>]*)>(?P<body>.*?)</article>', re.S)
ATTR_RE = re.compile(r'([:\w-]+)="([^"]*)"')
TAG_RE = re.compile(r'<[^>]+>')


def clean(fragment: str) -> str:
    txt = fragment.replace('<br />', ' ').replace('<br/>', ' ').replace('<br>', ' ')
    txt = TAG_RE.sub('', txt)
    return re.sub(r'\s+', ' ', html.unescape(txt)).strip()


def parse_cards(text: str) -> List[Dict[str, object]]:
    items: List[Dict[str, object]] = []
    for idx, m in enumerate(CARD_RE.finditer(text), start=1):
        attrs = {k: v for k, v in ATTR_RE.findall(m.group('attrs') or '')}
        body = m.group('body') or ''
        href = (attrs.get('data-href') or '').strip()
        if not href:
            continue
        date_m = re.search(r'<p\s+class="math-date">(.*?)</p>', body, re.S)
        title_m = re.search(r'<h3\s+class="math-title">(.*?)</h3>', body, re.S)
        desc_m = re.search(r'<p\s+class="math-desc">(.*?)</p>', body, re.S)
        more_m = re.search(r'<a\s+class="math-more"\s+href="([^"]+)"', body, re.S)
        items.append({
            'order': idx,
            'url': href,
            'date': clean(date_m.group(1) if date_m else ''),
            'title': clean(title_m.group(1) if title_m else ''),
            'excerpt': clean(desc_m.group(1) if desc_m else ''),
            'readmore_url': (more_m.group(1).strip() if more_m else href),
            'tags': ['math', 'article'],
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
