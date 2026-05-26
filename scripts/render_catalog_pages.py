#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


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


def variant_path(path: str, width: int, ext: str) -> str:
    p = Path(path)
    return str(p.with_name(f"{p.stem}-{width}.{ext}")).replace("\\", "/")


def variant_srcset(path: str, ext: str, widths: Iterable[int] = (960, 1600)) -> str:
    return ", ".join(f"{variant_path(path, int(width), ext)} {int(width)}w" for width in widths)


def normalize_manifest_key(path: str) -> str:
    return str(path).replace("\\", "/").lstrip("./")


def get_image_dimensions(image_manifest: Dict[str, Any], path: str) -> Tuple[Optional[int], Optional[int]]:
    if not path:
        return (None, None)
    items = image_manifest.get("items") or {}
    entry = items.get(normalize_manifest_key(path))
    if not isinstance(entry, dict):
        return (None, None)
    original = entry.get("original") or {}
    width = original.get("width")
    height = original.get("height")
    if isinstance(width, int) and isinstance(height, int) and width > 0 and height > 0:
        return (width, height)
    return (None, None)


def render_responsive_picture(
    path: str,
    alt: str,
    *,
    sizes: str,
    width: Optional[int] = None,
    height: Optional[int] = None,
    loading: str = "lazy",
    eager: bool = False,
    img_class: str = "",
    fetchpriority: str = "",
) -> List[str]:
    fallback_src = variant_path(path, 960, "webp") if path.lower().endswith((".jpg", ".jpeg", ".png")) else path
    attrs: List[str] = [
        f'src="{esc(fallback_src)}"',
        f'alt="{esc(alt)}"',
        f'loading="{esc(loading)}"',
        'decoding="async"',
        f'sizes="{esc(sizes)}"',
    ]
    if img_class:
        attrs.append(f'class="{esc(img_class)}"')
    if isinstance(width, int) and width > 0:
        attrs.append(f'width="{width}"')
    if isinstance(height, int) and height > 0:
        attrs.append(f'height="{height}"')
    if eager:
        attrs.append('data-eager="true"')
    if fetchpriority:
        attrs.append(f'fetchpriority="{esc(fetchpriority)}"')

    return [
        '<picture class="responsive-picture" style="display:block;width:100%;">',
        f'  <source type="image/webp" srcset="{esc(variant_srcset(path, "webp"))}" sizes="{esc(sizes)}" />',
        f"  <img {' '.join(attrs)} />",
        "</picture>",
    ]


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


def replace_between_markers_if_present(text: str, marker: str, body: str) -> str:
    start = f"<!-- GENERATED:{marker}:start -->"
    end = f"<!-- GENERATED:{marker}:end -->"
    has_start = start in text
    has_end = end in text
    if not has_start and not has_end:
        return text
    return replace_between_markers(text, marker, body)


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


def render_photo_featured(items: List[Dict[str, Any]], image_manifest: Dict[str, Any]) -> str:
    rows: List[str] = []
    grid_sizes = "(max-width: 640px) 92vw, (max-width: 980px) 46vw, 29vw"
    for item in items:
        theme = item.get("theme") or {}
        location = item.get("location") or {}
        concept = item.get("concept") or {}
        cover_path = str(item.get("cover") or "")
        cover_width, cover_height = get_image_dimensions(image_manifest, cover_path)
        rows.extend(
            [
                '<article class="photo-feature-card">',
                f'  <a class="photo-feature-link" href="{esc(item.get("url"))}">',
            ]
        )
        rows.extend(
            indent(
                render_responsive_picture(
                    cover_path,
                    str(item.get("title") or "Photography feature"),
                    sizes=grid_sizes,
                    width=cover_width,
                    height=cover_height,
                    loading="lazy",
                ),
                "    ",
            ).splitlines()
        )
        rows.extend(
            [
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


def render_photo_archive(items: List[Dict[str, Any]], image_manifest: Dict[str, Any]) -> str:
    rows: List[str] = []
    grid_sizes = "(max-width: 640px) 92vw, (max-width: 980px) 46vw, 29vw"
    for item in items:
        classes = "photo-card photo-card-film" if item.get("is_film") else "photo-card"
        cover_path = str(item.get("cover") or "")
        cover_width, cover_height = get_image_dimensions(image_manifest, cover_path)
        rows.append(f'<article class="{classes}">')
        rows.append(f'  <a class="photo-card-link" href="{esc(item.get("url"))}">')
        if item.get("is_film"):
            rows.append('    <div class="photo-film-thumb" aria-hidden="true"></div>')
        else:
            rows.extend(
                indent(
                    render_responsive_picture(
                        cover_path,
                        str(item.get("alt") or item.get("title") or item.get("date") or "Photography archive cover"),
                        sizes=grid_sizes,
                        width=cover_width,
                        height=cover_height,
                        loading="lazy",
                    ),
                    "    ",
                ).splitlines()
            )
        rows.append('    <div class="photo-meta">')
        title = str(item.get("title") or "").strip()
        date = str(item.get("date") or "").strip()
        if title:
            rows.append(f'      <p class="photo-title">{esc_text(title)}</p>')
        if date and date != title:
            rows.append(f'      <p class="photo-date">{esc_text(date)}</p>')
        subtitle = str(item.get("subtitle") or "").strip()
        if subtitle.lower() == "read more":
            subtitle = "阅读全文"
        rows.append(f'      <p class="photo-subtitle">{esc_text(subtitle or "阅读全文")}</p>')
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
            extra_attrs = ""
            tz = str(item.get("timezone") or "").strip()
            if tz:
                extra_attrs += f' data-timezone="{esc(tz)}" title="{esc(tz)}"'
            rows.append(
                f'  <time class="research-last-updated" datetime="{esc(item.get("datetime"))}"{extra_attrs}>{esc_text(item.get("value"))}</time>'
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
        rows.append(f'  <p class="research-project-line"><strong>Problem:</strong><span class="research-project-line-body">{esc_text(item.get("problem"))}</span></p>')
        rows.append(f'  <p class="research-project-line"><strong>Method:</strong><span class="research-project-line-body">{esc_text(item.get("method"))}</span></p>')
        rows.append(f'  <p class="research-project-line"><strong>Contribution:</strong><span class="research-project-line-body">{esc_text(item.get("contribution"))}</span></p>')
        status_label = str(item.get("status_label") or "").strip()
        status_key = str(item.get("status_key") or "").strip()
        status_detail = str(item.get("status_detail") or "").strip()
        if status_label or status_detail:
            badge_class = f" research-project-status-badge--{status_key.replace('_', '-')}" if status_key else ""
            rows.append('  <p class="research-project-line research-project-line--status">')
            rows.append('    <strong>Status:</strong>')
            rows.append('    <span class="research-project-status-wrap">')
            if status_label:
                rows.append(f'      <span class="research-project-status-badge{badge_class}">{esc_text(status_label)}</span>')
            if status_detail:
                rows.append(f'      <span class="research-project-status-detail">{esc_text(status_detail)}</span>')
            rows.append("    </span>")
            rows.append("  </p>")
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
        status_key = str(item.get("status_key") or "").strip()
        status_label = str(item.get("status_label") or item.get("status") or "").strip()
        status_detail = str(item.get("status_detail") or "").strip()
        badge_class = f" research-output-status-badge--{status_key.replace('_', '-')}" if status_key else ""
        rows.extend(
            [
                f'<a class="research-output-card"{attr_if("data-output-type", item.get("type"))}{attr_if("data-output-status", status_key)} href="{esc(item.get("href"))}"{attrs}>',
                f'  <span class="research-output-kicker">{esc_text(item.get("kicker"))}</span>',
                f'  <strong>{esc_text(item.get("title"))}</strong>',
                '  <span class="research-output-status">',
                f'    <span class="research-output-status-badge{badge_class}">{esc_text(status_label)}</span>',
                (f'    <span class="research-output-status-detail">{esc_text(status_detail)}</span>' if status_detail else ""),
                "  </span>",
                f'  <p>{esc_text(item.get("description"))}</p>',
                "</a>",
            ]
        )
    return "\n".join(rows)


def render_research_output_groups(groups: List[Dict[str, Any]]) -> str:
    rows: List[str] = []
    for group in groups:
        items = group.get("items") or []
        if not items:
            continue
        rows.append(f'<section class="research-output-group" data-output-group="{esc(group.get("key"))}">')
        rows.append('  <div class="research-output-group-head">')
        rows.append(f'    <h3>{esc_text(group.get("title"))}</h3>')
        if group.get("lead"):
            rows.append(f'    <p>{esc_text(group.get("lead"))}</p>')
        rows.append("  </div>")
        rows.append('  <div class="research-outputs-grid">')
        rows.append(indent(render_research_outputs(items).splitlines(), "    "))
        rows.append("  </div>")
        rows.append("</section>")
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


def render_research_summary_meta(payload: Dict[str, Any]) -> str:
    hero = payload.get("hero") or {}
    meta_items = (payload.get("meta") or {}).get("items") or []
    current_focus = ""
    last_updated = payload.get("generated_at") or ""
    last_updated_tz = ""
    for item in meta_items:
        label = str(item.get("label") or "").strip().lower()
        if label == "current focus":
            current_focus = str(item.get("value") or "").strip()
        if label == "last updated":
            last_updated = str(item.get("value") or last_updated or "").strip()
            last_updated_tz = str(item.get("timezone") or "").strip()
    rows = [
        '<div class="research-summary-meta-grid">',
        '  <div class="research-summary-meta-card">',
        '    <span class="research-summary-meta-label">Name</span>',
        f'    <strong>{esc_text(hero.get("name"))}</strong>',
        "  </div>",
        '  <div class="research-summary-meta-card">',
        '    <span class="research-summary-meta-label">Focus</span>',
        f'    <strong>{esc_text(current_focus)}</strong>',
        "  </div>",
        '  <div class="research-summary-meta-card">',
        '    <span class="research-summary-meta-label">Last updated</span>',
        (f'    <strong title="{esc(last_updated_tz)}">{esc_text(last_updated)}</strong>' if last_updated_tz else f'    <strong>{esc_text(last_updated)}</strong>'),
        "  </div>",
        "</div>",
    ]
    return indent(rows, "        ")


def render_research_summary_projects(items: List[Dict[str, Any]]) -> str:
    rows: List[str] = []
    for idx, item in enumerate(items[:3], start=1):
        rows.extend(
            [
                '<article class="research-summary-project">',
                f'  <p class="research-summary-kicker">Project {idx}</p>',
                f'  <h3>{esc_text(item.get("title"))}</h3>',
                f'  <p><strong>Problem:</strong> {esc_text(item.get("problem"))}</p>',
                f'  <p><strong>Method:</strong> {esc_text(item.get("method"))}</p>',
            ]
        )
        links = item.get("links") or []
        if links:
            rows.append('  <p class="research-summary-links">')
            label_links = []
            for link in links:
                if not link.get("href"):
                    continue
                label_links.append(f'<a href="{esc(link.get("href"))}">{esc_text(link.get("label") or link.get("href"))}</a>')
            rows.append("    " + " · ".join(label_links))
            rows.append("  </p>")
        rows.append("</article>")
    return indent(rows, "        ")


def render_research_summary_outputs(groups: List[Dict[str, Any]]) -> str:
    rows: List[str] = []
    for group in groups:
        key = str(group.get("key") or "")
        if key == "other":
            continue
        rows.append('<div class="research-summary-output-group">')
        rows.append(f'  <h3>{esc_text(group.get("title"))}</h3>')
        rows.append("  <ul>")
        for item in (group.get("items") or [])[:4]:
            status_label = esc_text(item.get("status_label") or item.get("status") or "")
            status_detail = esc_text(item.get("status_detail") or "")
            status_text = status_label + (f" · {status_detail}" if status_detail else "")
            rows.append(
                f'    <li><a href="{esc(item.get("href"))}">{esc_text(item.get("title"))}</a> <span>{status_text}</span></li>'
            )
        rows.append("  </ul>")
        rows.append("</div>")
    return indent(rows, "        ")


def main() -> int:
    ap = argparse.ArgumentParser(description="Render page list/card sections from generated catalog JSON files.")
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = ap.parse_args()
    root = args.root.resolve()

    math_catalog = load_json(root / "assets" / "data" / "math-catalog.json")
    photo_catalog = load_json(root / "assets" / "data" / "photo-catalog.json")
    research_catalog = load_json(root / "assets" / "data" / "research-catalog.json")
    image_manifest_path = root / "assets" / "data" / "image-variants.json"
    image_manifest: Dict[str, Any] = load_json(image_manifest_path) if image_manifest_path.exists() else {"items": {}}

    # math.html
    math_html_path = root / "math.html"
    math_html = math_html_path.read_text(encoding="utf-8")
    math_html = replace_between_markers_if_present(math_html, "math-list", render_math_cards(math_catalog.get("items") or []))
    math_html_path.write_text(math_html, encoding="utf-8")

    # photography.html is currently hand-authored with bilingual data-copy attributes.
    # Keep it intact when it is the active photo index; legacy portfolio-1 pages can still be rendered.
    photo_html_path = root / "photography.html"
    if not photo_html_path.exists():
        photo_html_path = root / "portfolio-1.html"
        photo_html = photo_html_path.read_text(encoding="utf-8")
        photo_html = replace_between_markers_if_present(
            photo_html, "photo-featured", render_photo_featured(photo_catalog.get("featured") or [], image_manifest)
        )
        photo_html = replace_between_markers_if_present(
            photo_html, "photo-archive", render_photo_archive(photo_catalog.get("archive") or [], image_manifest)
        )
        photo_html_path.write_text(photo_html, encoding="utf-8")

    # research.html
    research_html_path = root / "research.html"
    research_html = research_html_path.read_text(encoding="utf-8")
    research_html = replace_between_markers_if_present(
        research_html, "research-meta", render_research_meta((research_catalog.get("meta") or {}).get("items") or [])
    )
    research_html = replace_between_markers_if_present(
        research_html, "research-projects", render_research_projects(research_catalog.get("projects") or [])
    )
    research_html = replace_between_markers_if_present(
        research_html, "research-outputs", render_research_output_groups(research_catalog.get("output_groups") or [])
    )
    research_html = replace_between_markers_if_present(
        research_html, "research-now", render_research_now(research_catalog.get("now_items") or [])
    )
    research_html = replace_between_markers_if_present(
        research_html, "research-links", render_research_links(research_catalog.get("links") or [])
    )
    research_html_path.write_text(research_html, encoding="utf-8")

    # research-summary.html (print / PDF-ready one-page brief)
    # This page may be intentionally parked as an offline stub; in that case
    # the generated markers are removed and we should leave the file untouched.
    research_summary_path = root / "research-summary.html"
    if research_summary_path.exists():
        research_summary = research_summary_path.read_text(encoding="utf-8")
        research_summary = replace_between_markers_if_present(
            research_summary, "research-summary-meta", render_research_summary_meta(research_catalog)
        )
        research_summary = replace_between_markers_if_present(
            research_summary, "research-summary-projects", render_research_summary_projects(research_catalog.get("projects") or [])
        )
        research_summary = replace_between_markers_if_present(
            research_summary, "research-summary-outputs", render_research_summary_outputs(research_catalog.get("output_groups") or [])
        )
        research_summary_path.write_text(research_summary, encoding="utf-8")

    print("Rendered generated content blocks into:")
    print(f"- {math_html_path}")
    print(f"- {photo_html_path}")
    print(f"- {research_html_path}")
    if research_summary_path.exists():
        print(f"- {research_summary_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
