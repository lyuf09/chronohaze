#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape

SITE_URL = 'https://lyuf09.github.io/chronohaze'
FEED_URL = f'{SITE_URL}/feed.xml'

PINNED_NOTE_ITEMS = (
    {
        'url': 'notes/ttgda_second_order_tracking_note.html',
        'date': '2026-06-20',
        'title_en': 'TTGDA and Second-Order Tracking',
        'excerpt_en': (
            'A technical note on two-timescale GDA, hypergradient tracking, '
            'and second-order control in nonconvex minimax optimization.'
        ),
    },
)


def load_json(path: Path) -> dict:
    with path.open('r', encoding='utf-8') as fh:
        return json.load(fh)


def rfc2822_from_iso(date_text: str) -> str:
    dt = datetime.strptime(str(date_text).strip(), '%Y-%m-%d').replace(
        hour=12, minute=0, second=0, tzinfo=timezone.utc
    )
    return format_datetime(dt)


def main() -> int:
    parser = argparse.ArgumentParser(description='Build RSS feed for Chronohaze note-style updates.')
    parser.add_argument('--root', type=Path, required=True)
    args = parser.parse_args()

    root = args.root.resolve()
    catalog = load_json(root / 'assets' / 'data' / 'math-catalog.json')
    items = [
        item
        for item in catalog.get('items', [])
        if str(item.get('url', '')).startswith(('post/', 'notes/'))
    ]
    known_urls = {str(item.get('url', '')) for item in items}
    items.extend(item for item in PINNED_NOTE_ITEMS if item['url'] not in known_urls)
    items.sort(key=lambda item: str(item.get('date') or ''), reverse=True)

    last_build = rfc2822_from_iso(items[0]['date']) if items else format_datetime(datetime.now(timezone.utc))

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        '  <channel>',
        '    <title>Chronohaze Notes Feed</title>',
        f'    <link>{SITE_URL}/</link>',
        '    <description>Research notes and technical updates from Feier Lyu on optimization, Isabelle/HOL, and related mathematical work.</description>',
        '    <language>en</language>',
        f'    <lastBuildDate>{last_build}</lastBuildDate>',
        '    <generator>Chronohaze static feed builder</generator>',
        f'    <atom:link href="{FEED_URL}" rel="self" type="application/rss+xml" />',
        '',
    ]

    for item in items:
        rel_url = str(item.get('url') or '').lstrip('/')
        abs_url = f'{SITE_URL}/{rel_url}'
        title = str(item.get('title_en') or item.get('title') or 'Chronohaze update').strip()
        desc = str(item.get('excerpt_en') or item.get('excerpt') or '').strip()
        pub_date = rfc2822_from_iso(str(item.get('date') or '1970-01-01'))
        lines.extend([
            '    <item>',
            f'      <title>{escape(title)}</title>',
            f'      <link>{escape(abs_url)}</link>',
            f'      <guid>{escape(abs_url)}</guid>',
            f'      <pubDate>{pub_date}</pubDate>',
            f'      <description>{escape(desc)}</description>',
        ])
        if rel_url.startswith('notes/'):
            pdf_url = f'{SITE_URL}/{rel_url[:-5]}.pdf'
            lines.append(
                f'      <atom:link href="{escape(pdf_url)}" rel="related" type="application/pdf" />'
            )
        lines.extend(['    </item>', ''])

    lines.extend(['  </channel>', '</rss>', ''])
    (root / 'feed.xml').write_text('\n'.join(lines), encoding='utf-8')
    print(f'Wrote {root / "feed.xml"} ({len(items)} items)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
