#!/usr/bin/env python3
from __future__ import annotations

import argparse, html, json, re
from datetime import date
from pathlib import Path
from typing import Dict, List

TAG_RE = re.compile(r'<[^>]+>')
ATTR_RE = re.compile(r'([:\w-]+)="([^"]*)"')
FEATURE_CARD_RE = re.compile(r'<article\s+class="photo-feature-card">(?P<body>.*?)</article>', re.S)
ARCHIVE_CARD_RE = re.compile(r'<article\s+class="photo-card(?P<class_extra>[^"]*)">(?P<body>.*?)</article>', re.S)


def clean(fragment: str) -> str:
    txt = fragment.replace('<br />', ' ').replace('<br/>', ' ').replace('<br>', ' ')
    txt = TAG_RE.sub('', txt)
    txt = html.unescape(txt)
    # Collapse ASCII whitespace while preserving ideographic/full-width spaces (U+3000),
    # which are used intentionally in some bilingual captions.
    txt = re.sub(r"[ \t\r\n\f\v]+", " ", txt)
    return txt.strip()


def parse_attrs(tag_fragment: str) -> Dict[str, str]:
    return {k: v for k, v in ATTR_RE.findall(tag_fragment or '')}


def parse_featured(text: str) -> List[Dict[str, object]]:
    items: List[Dict[str, object]] = []
    for idx, m in enumerate(FEATURE_CARD_RE.finditer(text), start=1):
        body = m.group('body') or ''
        a_m = re.search(r'<a\s+class="photo-feature-link"([^>]*)href="([^"]+)"([^>]*)>', body, re.S)
        if not a_m:
            continue
        a_attrs = parse_attrs((a_m.group(1) or '') + ' ' + (a_m.group(3) or ''))
        href = a_m.group(2).strip()
        img_m = re.search(r'<img\s+([^>]*?)src="([^"]+)"([^>]*)>', body, re.S)
        img_src = img_m.group(2).strip() if img_m else ''
        img_attrs = parse_attrs((img_m.group(1) if img_m else '') + ' ' + (img_m.group(3) if img_m else ''))
        theme_m = re.search(r'<p\s+class="photo-feature-theme"([^>]*)>(.*?)</p>', body, re.S)
        loc_m = re.search(r'<p\s+class="photo-feature-location"([^>]*)>(.*?)</p>', body, re.S)
        concept_m = re.search(r'<p\s+class="photo-feature-concept"([^>]*)>(.*?)</p>', body, re.S)

        def extract_text_and_en(match):
            if not match:
                return ('', '')
            attrs = parse_attrs(match.group(1) or '')
            return (clean(match.group(2)), attrs.get('data-copy-en','').strip())

        theme_zh, theme_en = extract_text_and_en(theme_m)
        loc_zh, loc_en = extract_text_and_en(loc_m)
        concept_zh, concept_en = extract_text_and_en(concept_m)
        title = img_attrs.get('alt', '').strip() or theme_zh
        items.append({
            'order': idx,
            'url': href,
            'cover': img_src,
            'title': title,
            'theme': {'zh': theme_zh, 'en': theme_en or theme_zh},
            'location': {'zh': loc_zh, 'en': loc_en or loc_zh},
            'concept': {'zh': concept_zh, 'en': concept_en or concept_zh},
            'tags': ['photo', 'featured'],
        })
    return items


def parse_archive(text: str, featured_urls: set[str]) -> List[Dict[str, object]]:
    items: List[Dict[str, object]] = []
    for idx, m in enumerate(ARCHIVE_CARD_RE.finditer(text), start=1):
        body = m.group('body') or ''
        class_extra = (m.group('class_extra') or '')
        a_m = re.search(r'<a\s+class="photo-card-link"([^>]*)href="([^"]+)"([^>]*)>', body, re.S)
        if not a_m:
            continue
        href = a_m.group(2).strip()
        img_m = re.search(r'<img\s+([^>]*?)src="([^"]+)"([^>]*)>', body, re.S)
        img_src = img_m.group(2).strip() if img_m else ''
        img_attrs = parse_attrs((img_m.group(1) if img_m else '') + ' ' + (img_m.group(3) if img_m else ''))
        date_m = re.search(r'<p\s+class="photo-date">(.*?)</p>', body, re.S)
        sub_m = re.search(r'<p\s+class="photo-subtitle">(.*?)</p>', body, re.S)
        date_text = clean(date_m.group(1) if date_m else '')
        subtitle = clean(sub_m.group(1) if sub_m else '')
        if subtitle.strip().lower() == 'read more':
            subtitle = '阅读全文'
        is_film = 'photo-card-film' in class_extra or href.endswith('/blue.html')
        tags = ['photo']
        if href in featured_urls:
            tags.append('featured')
        if is_film:
            tags.append('video')
        items.append({
            'order': idx,
            'url': href,
            'title': date_text or 'Blue',
            'date': date_text if not is_film else '',
            'subtitle': subtitle,
            'cover': img_src,
            'is_film': is_film,
            'alt': img_attrs.get('alt', '').strip(),
            'tags': tags,
        })
    return items


def build_combined_items(featured: List[Dict[str, object]], archive: List[Dict[str, object]]) -> List[Dict[str, object]]:
    featured_by_url = {
        str(item.get("url", "")).strip(): item
        for item in featured
        if isinstance(item, dict) and item.get("url")
    }
    items: List[Dict[str, object]] = []
    for item in archive:
        if not isinstance(item, dict):
            continue
        url = str(item.get("url", "")).strip()
        if not url:
            continue
        tags = [str(tag).strip().lower() for tag in item.get("tags", []) if str(tag).strip()]
        if url in featured_by_url and "featured" not in tags:
            tags.append("featured")
        featured_meta = featured_by_url.get(url, {})
        excerpt = str(item.get("subtitle", "") or "").strip()
        if not excerpt and isinstance(featured_meta, dict):
            location = featured_meta.get("location")
            if isinstance(location, dict):
                excerpt = str(location.get("zh", "") or "").strip()
        title = str(item.get("title", "") or "").strip()
        if isinstance(featured_meta, dict):
            theme = featured_meta.get("theme")
            if isinstance(theme, dict):
                title = str(theme.get("zh", "") or title).strip() or title
        items.append(
            {
                "order": int(item.get("order", 0) or 0),
                "url": url,
                "title": title,
                "date": str(item.get("date", "") or "").strip(),
                "excerpt": excerpt,
                "cover": str(item.get("cover", "") or "").strip(),
                "tags": tags or ["photo"],
                "is_film": bool(item.get("is_film")),
            }
        )
    return items


def main() -> int:
    ap = argparse.ArgumentParser(description='Build canonical photo catalog metadata from portfolio-1.html')
    ap.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = ap.parse_args()
    root = args.root.resolve()
    src = root / 'portfolio-1.html'
    out = root / 'assets' / 'data' / 'photo-catalog.json'
    text = src.read_text(encoding='utf-8')
    featured = parse_featured(text)
    archive = parse_archive(text, {str(x['url']) for x in featured})
    items = build_combined_items(featured, archive)
    payload = {
        'generated_at': date.today().isoformat(),
        'source': 'portfolio-1.html',
        'featured': featured,
        'archive': archive,
        'items': items,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {out} (featured={len(featured)}, archive={len(archive)}, items={len(items)})')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
