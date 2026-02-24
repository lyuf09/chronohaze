#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def esc(value: Any) -> str:
    return html.escape(str(value or ""), quote=True)


def esc_text(value: Any) -> str:
    return html.escape(str(value or ""))


def attr_if(name: str, value: Any) -> str:
    text = str(value or "")
    return f' {name}="{esc(text)}"' if text else ""


def replace_between_markers(text: str, marker: str, body: str) -> str:
    start = f"<!-- GENERATED:{marker}:start -->"
    end = f"<!-- GENERATED:{marker}:end -->"
    si = text.find(start)
    ei = text.find(end)
    if si < 0 or ei < 0 or ei < si:
        raise ValueError(f"Marker not found or invalid: {marker}")
    insert_start = si + len(start)
    line_start = text.rfind("\n", 0, si)
    marker_indent = ""
    if line_start >= 0:
        marker_line_prefix = text[line_start + 1 : si]
        marker_indent = marker_line_prefix if marker_line_prefix.strip() == "" else ""
    return text[:insert_start] + "\n" + body.rstrip() + "\n" + marker_indent + text[ei:]


def indent(lines: Iterable[str], prefix: str) -> str:
    return "\n".join(prefix + line if line else prefix.rstrip() for line in lines)


def render_math_cards(items: List[Dict[str, Any]]) -> str:
    rows: List[str] = []
    for item in items:
        href = item.get("url") or item.get("readmore_url") or "#"
        rows.extend(
            [
                f'<article class="math-card" data-href="{esc(href)}" tabindex="0" role="link">',
                f'  <p class="math-date">{esc_text(item.get("date"))}</p>',
                f'  <h3 class="math-title"><a class="math-title-link" href="{esc(href)}">{esc_text(item.get("title"))}</a></h3>',
                f'  <p class="math-desc">{esc_text(item.get("excerpt"))}</p>',
                f'  <a class="math-more" href="{esc(item.get("readmore_url") or href)}">阅读全文</a>',
                "</article>",
            ]
        )
    return indent(rows, "          ")


def render_photo_featured(items: List[Dict[str, Any]]) -> str:
    rows: List[str] = []
    for item in items:
        theme = item.get("theme") or {}
        location = item.get("location") or {}
        concept = item.get("concept") or {}
        rows.extend(
            [
                '<article class="photo-feature-card">',
                f'  <a class="photo-feature-link" href="{esc(item.get("url"))}">',
                f'    <img src="{esc(item.get("cover"))}" alt="{esc(item.get("title"))}" loading="lazy" />',
                '    <div class="photo-feature-meta">',
                f'      <p class="photo-feature-theme"{attr_if("data-copy-zh", theme.get("zh"))}{attr_if("data-copy-en", theme.get("en"))}>{esc_text(theme.get("zh"))}</p>',
                f'      <p class="photo-feature-location"{attr_if("data-copy-zh", location.get("zh"))}{attr_if("data-copy-en", location.get("en"))}>{esc_text(location.get("zh"))}</p>',
                f'      <p class="photo-feature-concept"{attr_if("data-copy-zh", concept.get("zh"))}{attr_if("data-copy-en", concept.get("en"))}>{esc_text(concept.get("zh"))}</p>',
                "    </div>",
                "  </a>",
                "</article>",
            ]
        )
    return indent(rows, "          ")


def render_photo_archive(items: List[Dict[str, Any]]) -> str:
    rows: List[str] = []
    for item in items:
        classes = "photo-card photo-card-film" if item.get("is_film") else "photo-card"
        rows.append(f'<article class="{classes}">')
        rows.append(f'  <a class="photo-card-link" href="{esc(item.get("url"))}">')
        if item.get("is_film"):
            rows.append('    <div class="photo-film-thumb" aria-hidden="true">▶</div>')
        else:
            rows.append(
                f'    <img src="{esc(item.get("cover"))}" alt="{esc(item.get("alt") or item.get("title") or item.get("date"))}" loading="lazy" />'
            )
        rows.append('    <div class="photo-meta">')
        rows.append(f'      <p class="photo-date">{esc_text(item.get("date") or item.get("title"))}</p>')
        rows.append(f'      <p class="photo-subtitle">{esc_text(item.get("subtitle") or "Read More")}</p>')
        rows.append('    </div>')
        rows.append('  </a>')
        rows.append("</article>")
    return indent(rows, "          ")


def render_research_meta(items: List[Dict[str, Any]]) -> str:
    rows: List[str] = []
    for item in items:
        rows.append('<div class="research-meta-pill">')
        rows.append(f'  <span class="research-meta-label">{esc_text(item.get("label"))}</span>')
        if item.get("datetime"):
            rows.append(
                f'  <time class="research-last-updated" datetime="{esc(item.get("datetime"))}">{esc_text(item.get("value"))}</time>'
            )
        else:
            rows.append(f'  <span>{esc_text(item.get("value"))}</span>')
        rows.append("</div>")
    return indent(rows, "              ")


def render_research_projects(items: List[Dict[str, Any]]) -> str:
    rows: List[str] = []
    for item in items:
        rows.append('<article class="research-project-card">')
        if item.get("kind"):
            rows.append(f'  <p class="research-project-kind">{esc_text(item.get("kind"))}</p>')
        rows.append(f'  <h3>{esc_text(item.get("title"))}</h3>')
        rows.append(f'  <p><strong>Problem:</strong> {esc_text(item.get("problem"))}</p>')
        rows.append(f'  <p><strong>Method:</strong> {esc_text(item.get("method"))}</p>')
        if item.get("current_status"):
            rows.append(f'  <p><strong>Current status:</strong> {esc_text(item.get("current_status"))}</p>')
        rows.append(f'  <p><strong>Contribution:</strong> {esc_text(item.get("contribution"))}</p>')
        links = item.get("links") or []
        if links:
            rows.append('  <div class="research-link-row">')
            for link in links:
                attrs = ''
                if link.get("external"):
                    attrs = ' target="_blank" rel="noopener noreferrer"'
                rows.append(f'    <a href="{esc(link.get("href"))}"{attrs}>{esc_text(link.get("label"))}</a>')
            rows.append("  </div>")
        rows.append("</article>")
    return indent(rows, "          ")


def render_research_outputs(items: List[Dict[str, Any]]) -> str:
    rows: List[str] = []
    for item in items:
        attrs = ' target="_blank" rel="noopener noreferrer"' if item.get("external") else ""
        rows.extend(
            [
                f'<a class="research-output-card" href="{esc(item.get("href"))}"{attrs}>',
                f'  <span class="research-output-kicker">{esc_text(item.get("kicker"))}</span>',
                f'  <strong>{esc_text(item.get("title"))}</strong>',
                f'  <span class="research-output-status">{esc_text(item.get("status"))}</span>',
                f'  <p>{esc_text(item.get("description"))}</p>',
                "</a>",
            ]
        )
    return indent(rows, "          ")


def render_research_now(items: List[str]) -> str:
    return indent([f"<li>{esc_text(item)}</li>" for item in items], "            ")


def render_research_links(items: List[Dict[str, Any]]) -> str:
    rows: List[str] = []
    for item in items:
        attrs = ' target="_blank" rel="noopener noreferrer"' if item.get("external") else ""
        rows.extend(
            [
                f'<a class="research-fast-link" href="{esc(item.get("href"))}"{attrs}>',
                f'  <span class="research-fast-link-kicker">{esc_text(item.get("kicker"))}</span>',
                f'  <strong>{esc_text(item.get("title"))}</strong>',
                f'  <span>{esc_text(item.get("description"))}</span>',
                "</a>",
            ]
        )
    return indent(rows, "          ")


def main() -> int:
    ap = argparse.ArgumentParser(description="Render page list/card sections from generated catalog JSON files.")
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = ap.parse_args()
    root = args.root.resolve()

    math_catalog = load_json(root / "assets" / "data" / "math-catalog.json")
    photo_catalog = load_json(root / "assets" / "data" / "photo-catalog.json")
    research_catalog = load_json(root / "assets" / "data" / "research-catalog.json")

    # math.html
    math_html_path = root / "math.html"
    math_html = math_html_path.read_text(encoding="utf-8")
    math_html = replace_between_markers(math_html, "math-list", render_math_cards(math_catalog.get("items") or []))
    math_html_path.write_text(math_html, encoding="utf-8")

    # portfolio-1.html
    photo_html_path = root / "portfolio-1.html"
    photo_html = photo_html_path.read_text(encoding="utf-8")
    photo_html = replace_between_markers(
        photo_html, "photo-featured", render_photo_featured(photo_catalog.get("featured") or [])
    )
    photo_html = replace_between_markers(
        photo_html, "photo-archive", render_photo_archive(photo_catalog.get("archive") or [])
    )
    photo_html_path.write_text(photo_html, encoding="utf-8")

    # research.html
    research_html_path = root / "research.html"
    research_html = research_html_path.read_text(encoding="utf-8")
    research_html = replace_between_markers(
        research_html, "research-meta", render_research_meta((research_catalog.get("meta") or {}).get("items") or [])
    )
    research_html = replace_between_markers(
        research_html, "research-projects", render_research_projects(research_catalog.get("projects") or [])
    )
    research_html = replace_between_markers(
        research_html, "research-outputs", render_research_outputs(research_catalog.get("outputs") or [])
    )
    research_html = replace_between_markers(
        research_html, "research-now", render_research_now(research_catalog.get("now_items") or [])
    )
    research_html = replace_between_markers(
        research_html, "research-links", render_research_links(research_catalog.get("links") or [])
    )
    research_html_path.write_text(research_html, encoding="utf-8")

    print("Rendered generated content blocks into:")
    print(f"- {math_html_path}")
    print(f"- {photo_html_path}")
    print(f"- {research_html_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
