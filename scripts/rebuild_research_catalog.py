#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List
from zoneinfo import ZoneInfo


TAG_RE = re.compile(r"<[^>]+>")
OUTPUT_STATUS_SPLIT_RE = re.compile(r"(?:\s*[·•|]\s*|\s*:\s+|\s+/\s+|\s+-\s+)", re.S)


def clean(fragment: str) -> str:
    text = fragment or ""
    text = text.replace("<br>", " ").replace("<br/>", " ").replace("<br />", " ")
    text = TAG_RE.sub("", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def classify_output_type(item: Dict[str, Any]) -> str:
    explicit = str(item.get("type") or "").strip().lower()
    if explicit:
        return explicit
    title = str(item.get("title") or "").lower()
    kicker = str(item.get("kicker") or "").lower()
    status = str(item.get("status") or "").lower()
    if "repo" in title or "github" in title or "prototype" in kicker:
        return "repo"
    if "note" in kicker or "archive" in title:
        return "notes"
    if "draft" in status or "in prep" in status:
        return "in_prep"
    return "other"


def canonicalize_output_status(status_text: str) -> Dict[str, str]:
    raw = str(status_text or "").strip()
    if not raw:
        return {
            "key": "active",
            "label": "Active",
            "detail": "",
            "display": "Active",
        }

    parts = [p.strip() for p in OUTPUT_STATUS_SPLIT_RE.split(raw, maxsplit=1) if p.strip()]
    head = parts[0].lower() if parts else raw.lower()
    tail = parts[1].strip() if len(parts) > 1 else ""

    if head in {"awaiting review", "under review", "submitted"}:
        key = "under_review"
        label = "Awaiting review"
    elif head in {"wip", "in prep", "in-prep", "pending"}:
        key = "in_prep"
        label = "In prep"
    elif "draft" in head:
        key = "draft"
        label = "Draft"
    else:
        key = "active"
        label = "Active"

    display = label + (f" · {tail}" if tail else "")
    return {
        "key": key,
        "label": label,
        "detail": tail,
        "display": display,
    }


def canonicalize_project_status(status_text: str, fallback_detail: str = "") -> Dict[str, str]:
    raw = str(status_text or "").strip()
    detail_fallback = str(fallback_detail or "").strip()
    if not raw:
        return {
            "key": "",
            "label": "",
            "detail": detail_fallback,
            "display": detail_fallback,
        }

    parts = [p.strip() for p in OUTPUT_STATUS_SPLIT_RE.split(raw, maxsplit=1) if p.strip()]
    head = parts[0].lower() if parts else raw.lower()
    tail = parts[1].strip() if len(parts) > 1 else detail_fallback

    if head in {"awaiting review", "under review", "submitted"}:
        key = "under_review"
        label = "Awaiting review"
    elif head in {"wip", "work in progress"}:
        key = "wip"
        label = "WIP"
    elif head in {"in prep", "in-prep", "in preparation", "pending"}:
        key = "in_prep"
        label = "In prep"
    else:
        key = "active"
        label = "Active"

    display = label + (f" · {tail}" if tail else "")
    return {
        "key": key,
        "label": label,
        "detail": tail,
        "display": display,
    }


def build_research_last_updated_meta() -> Dict[str, str]:
    tz_name = "America/New_York"
    now_et = datetime.now(ZoneInfo(tz_name))
    display = now_et.strftime("%Y-%m-%d · %I:%M %p ET")
    return {
        "label": "Last updated",
        "value": display,
        "datetime": now_et.isoformat(timespec="seconds"),
        "timezone": tz_name,
        "date_only": now_et.date().isoformat(),
        "display_format": "YYYY-MM-DD · hh:mm A ET",
    }


def marker_block(text: str, marker: str) -> str:
    start = f"<!-- GENERATED:{marker}:start -->"
    end = f"<!-- GENERATED:{marker}:end -->"
    si = text.find(start)
    ei = text.find(end)
    if si < 0 or ei < 0 or ei < si:
        return ""
    return text[si + len(start) : ei]


def preferred_lang_block(text: str, lang: str = "zh") -> str:
    marker = f'data-lang-block="{lang}"'
    start = text.find(marker)
    if start < 0:
        return text
    block_start = text.rfind("<div", 0, start)
    if block_start < 0:
        block_start = start
    next_lang = text.find('data-lang-block="', start + len(marker))
    if next_lang < 0:
        return text[block_start:]
    next_block = text.rfind("<div", 0, next_lang)
    return text[block_start:next_block if next_block > block_start else next_lang]


def parse_links(html_text: str, selector_class: str) -> List[Dict[str, Any]]:
    pattern = re.compile(
        rf'<a\s+class="{re.escape(selector_class)}"([^>]*)href="([^"]+)"([^>]*)>(.*?)</a>',
        re.S,
    )
    out: List[Dict[str, Any]] = []
    for m in pattern.finditer(html_text):
        attrs = " ".join([(m.group(1) or ""), (m.group(3) or "")])
        is_external = "target=\"_blank\"" in attrs or "rel=\"noopener" in attrs
        body = m.group(4) or ""
        if selector_class == "research-fast-link":
            kicker_m = re.search(r'<span\s+class="research-fast-link-kicker">(.*?)</span>', body, re.S)
            title_m = re.search(r"<strong>(.*?)</strong>", body, re.S)
            desc_m = re.search(r"<span>(.*?)</span>(?!.*<span>)", body, re.S)
            out.append(
                {
                    "href": (m.group(2) or "").strip(),
                    "external": bool(is_external),
                    "kicker": clean(kicker_m.group(1) if kicker_m else ""),
                    "title": clean(title_m.group(1) if title_m else ""),
                    "description": clean(desc_m.group(1) if desc_m else ""),
                }
            )
        else:
            out.append(
                {
                    "href": (m.group(2) or "").strip(),
                    "external": bool(is_external),
                    "label": clean(body),
                }
            )
    return out


def parse_research_page(text: str) -> Dict[str, Any]:
    search_excerpt_en = ""
    payload: Dict[str, Any] = {
        "hero": {},
        "meta": {},
        "interests": {},
        "projects_section": {},
        "projects": [],
        "outputs_section": {},
        "outputs": [],
        "now_section": {},
        "now_items": [],
        "links_section": {},
        "links": [],
        "search": {},
    }

    hero_block_m = re.search(r'<section class="research-hero">(.*?)</section>', text, re.S)
    if hero_block_m:
        hero_block = hero_block_m.group(1)
        hero_en_block = preferred_lang_block(hero_block, "en")
        eyebrow_m = re.search(r'<p class="research-eyebrow">(.*?)</p>', hero_block, re.S)
        h1_m = re.search(r"<h1>(.*?)</h1>", hero_block, re.S)
        subtitle_m = re.search(r'<p class="research-subtitle">(.*?)</p>', hero_block, re.S)
        positioning_m = re.search(
            r'<p class="[^"]*\bresearch-thesis-line\b[^"]*">(.*?)</p>',
            hero_block,
            re.S,
        ) or re.search(
            r'<p class="[^"]*\bresearch-positioning\b[^"]*">(.*?)</p>',
            hero_block,
            re.S,
        )
        positioning_en_m = re.search(
            r'<p class="[^"]*\bresearch-thesis-line\b[^"]*">(.*?)</p>',
            hero_en_block,
            re.S,
        ) or re.search(
            r'<p class="[^"]*\bresearch-positioning\b[^"]*">(.*?)</p>',
            hero_en_block,
            re.S,
        )
        search_excerpt_en = clean(positioning_en_m.group(1) if positioning_en_m else "")
        chips = [
            clean(x)
            for x in re.findall(r'<span class="research-chip">(.*?)</span>', hero_block, re.S)
            if clean(x)
        ]
        panel_title_m = re.search(r'<aside class="research-hero-panel".*?<h2>(.*?)</h2>', hero_block, re.S)
        interests = [
            clean(x)
            for x in re.findall(r"<li>(.*?)</li>", hero_block, re.S)
            if clean(x)
        ]
        payload["hero"] = {
            "eyebrow": clean(eyebrow_m.group(1) if eyebrow_m else ""),
            "name": clean(h1_m.group(1) if h1_m else ""),
            "subtitle": clean(subtitle_m.group(1) if subtitle_m else ""),
            "positioning": clean(positioning_m.group(1) if positioning_m else ""),
            "chips": chips,
        }
        meta_items: List[Dict[str, str]] = []
        for pill_m in re.finditer(
            r'<(?P<tag>div|span) class="research-meta-pill">(.*?)</(?P=tag)>',
            hero_block,
            re.S,
        ):
            pill_body = pill_m.group(2) or ""
            label_m = re.search(r'<span class="research-meta-label">(.*?)</span>', pill_body, re.S)
            time_m = re.search(r'<time[^>]*datetime="([^"]*)"[^>]*>(.*?)</time>', pill_body, re.S)
            span_values = [clean(x) for x in re.findall(r'<span[^>]*>(.*?)</span>', pill_body, re.S) if clean(x)]
            value = ""
            if time_m:
                value = clean(time_m.group(2))
            elif len(span_values) >= 2:
                value = span_values[-1]
            meta_items.append(
                {
                    "label": clean(label_m.group(1) if label_m else ""),
                    "value": value,
                    "datetime": (time_m.group(1).strip() if time_m else ""),
                }
            )
        payload["meta"] = {"items": [item for item in meta_items if item.get("label") or item.get("value")]}
        payload["interests"] = {
            "title": clean(panel_title_m.group(1) if panel_title_m else ""),
            "items": interests,
        }

    project_section_m = re.search(
        r'<section[^>]*class="section research-projects-section"[^>]*>(.*?)</section>',
        text,
        re.S,
    )
    if project_section_m:
        block = project_section_m.group(1)
        head_m = re.search(r'<div class="container research-section-head">(.*?)</div>', block, re.S)
        if head_m:
            payload["projects_section"] = {
                "title": clean(re.search(r"<h2>(.*?)</h2>", head_m.group(1), re.S).group(1))
                if re.search(r"<h2>(.*?)</h2>", head_m.group(1), re.S)
                else "",
                "lead": clean(re.search(r"<p>(.*?)</p>", head_m.group(1), re.S).group(1))
                if re.search(r"<p>(.*?)</p>", head_m.group(1), re.S)
                else "",
            }

        projects_source = marker_block(text, "research-projects")
        if not projects_source:
            grid_m = re.search(
                r'<div class="[^"]*\bresearch-project-grid\b[^"]*">(.*)$',
                block,
                re.S,
            )
            projects_source = grid_m.group(1) if grid_m else block
        projects_block = preferred_lang_block(projects_source)
        card_pattern = re.compile(
            r'<article class="[^"]*\bresearch-project-card\b[^"]*">(.*?)</article>',
            re.S,
        )
        for card in card_pattern.finditer(projects_block):
            body = card.group(1) or ""
            kind_m = re.search(r'<p class="research-project-kind">(.*?)</p>', body, re.S)
            title_m = re.search(r"<h3>(.*?)</h3>", body, re.S)
            field_map: Dict[str, str] = {}
            unlabeled_paragraphs: List[str] = []
            for p_m in re.finditer(r"<p[^>]*>(.*?)</p>", body, re.S):
                p_body = p_m.group(1) or ""
                p_full = p_m.group(0) or ""
                if "research-project-kind" in p_full:
                    continue
                if "research-project-line--status" in p_full:
                    badge_m = re.search(
                        r'class="[^"]*research-project-status-badge[^"]*">(.*?)</span>',
                        p_body,
                        re.S,
                    )
                    detail_m = re.search(
                        r'class="[^"]*research-project-status-detail[^"]*">(.*?)</span>',
                        p_body,
                        re.S,
                    )
                    badge_text = clean(badge_m.group(1) if badge_m else "")
                    detail_text = clean(detail_m.group(1) if detail_m else "")
                    if badge_text or detail_text:
                        status_raw = badge_text
                        if detail_text:
                            status_raw = f"{status_raw} · {detail_text}" if status_raw else detail_text
                        field_map["status"] = status_raw
                    continue
                label_m = re.match(r"\s*<strong>([^<:]+):</strong>\s*(.*)$", p_body, re.S)
                if not label_m:
                    paragraph_text = clean(p_body)
                    if paragraph_text:
                        unlabeled_paragraphs.append(paragraph_text)
                    continue
                label = clean(label_m.group(1)).lower().replace(" ", "_")
                label_aliases = {
                    "question": "problem",
                    "why_it_matters": "method",
                    "current_stage": "current_status",
                    "next_question": "contribution",
                }
                label = label_aliases.get(label, label)
                field_map[label] = clean(label_m.group(2))
            # Newer research cards use concise prose rather than explicit field labels.
            # Preserve those paragraphs in the canonical catalog and search index.
            for key, paragraph_text in zip(
                ("problem", "current_status", "contribution"),
                unlabeled_paragraphs,
            ):
                field_map.setdefault(key, paragraph_text)
            links_row_m = re.search(r'<div class="research-link-row">(.*?)</div>', body, re.S)
            links = parse_links(links_row_m.group(1), "research-link-row") if links_row_m else []
            if links_row_m:
                # parse_links expects anchor class names; here anchors are plain <a>, so parse directly.
                links = []
                for a_m in re.finditer(r'<a\s+([^>]*)href="([^"]+)"([^>]*)>(.*?)</a>', links_row_m.group(1), re.S):
                    attrs = " ".join([(a_m.group(1) or ""), (a_m.group(3) or "")])
                    links.append(
                        {
                            "href": (a_m.group(2) or "").strip(),
                            "label": clean(a_m.group(4) or ""),
                            "external": ('target="_blank"' in attrs or "rel=\"noopener" in attrs),
                        }
                    )
            payload["projects"].append(
                {
                    "kind": clean(kind_m.group(1) if kind_m else ""),
                    "title": clean(title_m.group(1) if title_m else ""),
                    "problem": field_map.get("problem", ""),
                    "method": field_map.get("method", ""),
                    "status": field_map.get("status", ""),
                    "current_status": field_map.get("current_status", ""),
                    "contribution": field_map.get("contribution", ""),
                    "links": links,
                }
            )

    outputs_section_m = re.search(
        r'<section[^>]*class="section research-outputs-section"[^>]*>(.*?)</section>',
        text,
        re.S,
    )
    if outputs_section_m:
        block = outputs_section_m.group(1)
        head_m = re.search(r'<div class="container research-section-head">(.*?)</div>', block, re.S)
        if head_m:
            head_text = preferred_lang_block(head_m.group(1), "zh")
            payload["outputs_section"] = {
                "title": clean(re.search(r"<h2>(.*?)</h2>", head_text, re.S).group(1))
                if re.search(r"<h2>(.*?)</h2>", head_text, re.S)
                else "",
                "lead": clean(re.search(r"<p>(.*?)</p>", head_text, re.S).group(1))
                if re.search(r"<p>(.*?)</p>", head_text, re.S)
                else "",
            }

        outputs_block = marker_block(text, "research-outputs") or block
        for a_m in re.finditer(r'<a\s+class="research-output-card"([^>]*)href="([^"]+)"([^>]*)>(.*?)</a>', outputs_block, re.S):
            attrs = " ".join([(a_m.group(1) or ""), (a_m.group(3) or "")])
            body = a_m.group(4) or ""
            body_pref = preferred_lang_block(body, "zh")
            type_m = re.search(r'data-output-type="([^"]+)"', attrs)
            payload["outputs"].append(
                {
                    "href": (a_m.group(2) or "").strip(),
                    "external": ('target="_blank"' in attrs or 'rel="noopener' in attrs),
                    "type": clean(type_m.group(1) if type_m else ""),
                    "kicker": clean(
                        re.search(r'<span class="research-output-kicker">(.*?)</span>', body, re.S).group(1)
                    )
                    if re.search(r'<span class="research-output-kicker">(.*?)</span>', body, re.S)
                    else "",
                    "title": clean(re.search(r"<strong>(.*?)</strong>", body_pref, re.S).group(1))
                    if re.search(r"<strong>(.*?)</strong>", body_pref, re.S)
                    else "",
                    "status": clean(
                        re.search(r'<span class="research-output-status">(.*?)</span>', body, re.S).group(1)
                    )
                    if re.search(r'<span class="research-output-status">(.*?)</span>', body, re.S)
                    else "",
                    "description": clean(re.search(r"<p>(.*?)</p>", body_pref, re.S).group(1))
                    if re.search(r"<p>(.*?)</p>", body_pref, re.S)
                    else "",
                }
            )

    now_section_m = re.search(
        r'<section[^>]*class="section research-now-section"[^>]*>(.*?)</section>',
        text,
        re.S,
    )
    if now_section_m:
        block = now_section_m.group(1)
        head_m = re.search(r'<div class="container research-section-head">(.*?)</div>', block, re.S)
        if head_m:
            head_text = preferred_lang_block(head_m.group(1), "zh")
            payload["now_section"] = {
                "title": clean(re.search(r"<h2>(.*?)</h2>", head_text, re.S).group(1))
                if re.search(r"<h2>(.*?)</h2>", head_text, re.S)
                else "",
                "lead": clean(re.search(r"<p>(.*?)</p>", head_text, re.S).group(1))
                if re.search(r"<p>(.*?)</p>", head_text, re.S)
                else "",
            }
        now_block = marker_block(text, "research-now") or block
        zh_list_m = re.search(
            r'<div[^>]*data-lang-block="zh"[^>]*>\s*<ul class="research-now-list">(.*?)</ul>\s*</div>',
            now_block,
            re.S,
        )
        list_block = zh_list_m.group(1) if zh_list_m else now_block
        payload["now_items"] = [clean(x) for x in re.findall(r"<li>(.*?)</li>", list_block, re.S) if clean(x)]

    links_section_m = re.search(
        r'<section[^>]*class="section research-fast-links-section"[^>]*>(.*?)</section>',
        text,
        re.S,
    )
    if links_section_m:
        block = links_section_m.group(1)
        head_m = re.search(r'<div class="container research-section-head">(.*?)</div>', block, re.S)
        if head_m:
            payload["links_section"] = {
                "title": clean(re.search(r"<h2>(.*?)</h2>", head_m.group(1), re.S).group(1))
                if re.search(r"<h2>(.*?)</h2>", head_m.group(1), re.S)
                else "",
                "lead": clean(re.search(r"<p>(.*?)</p>", head_m.group(1), re.S).group(1))
                if re.search(r"<p>(.*?)</p>", head_m.group(1), re.S)
                else "",
            }
        links_block = marker_block(text, "research-links")
        if links_block:
            payload["links"] = parse_links(links_block, "research-fast-link")
        else:
            grid_m = re.search(r'<div class="container research-fast-links-grid">(.*?)</div>', block, re.S)
            if grid_m:
                payload["links"] = parse_links(grid_m.group(1), "research-fast-link")

    title_m = re.search(r"<title>(.*?)</title>", text, re.S)
    desc_m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', text, re.S)
    search_excerpt = ""
    if isinstance(payload.get("hero"), dict):
        search_excerpt = str(
            payload["hero"].get("subtitle", "")
            or payload["hero"].get("positioning", "")
            or ""
        ).strip()
    if isinstance(payload.get("projects_section"), dict):
        lead = str(payload["projects_section"].get("lead", "") or "").strip()
        if lead:
            search_excerpt = lead
    content_parts = []
    for segment in (
        payload.get("hero", {}),
        payload.get("meta", {}),
        payload.get("interests", {}),
        payload.get("projects_section", {}),
        payload.get("outputs_section", {}),
        payload.get("now_section", {}),
        payload.get("links_section", {}),
    ):
        if isinstance(segment, dict):
            content_parts.extend(str(v) for v in segment.values() if not isinstance(v, list))
            for v in segment.values():
                if isinstance(v, list):
                    content_parts.extend(str(x) for x in v)
    for project in payload.get("projects", []):
        if not isinstance(project, dict):
            continue
        content_parts.extend(
            str(project.get(k, "")) for k in ("kind", "title", "problem", "method", "current_status", "contribution")
        )
        for link in project.get("links", []):
            if isinstance(link, dict):
                content_parts.append(str(link.get("label", "")))
    for output in payload.get("outputs", []):
        if isinstance(output, dict):
            content_parts.extend(
                str(output.get(k, "")) for k in ("kicker", "title", "status", "description")
            )
    for item in payload.get("now_items", []):
        content_parts.append(str(item))
    today = date.today().isoformat()
    last_updated_meta = build_research_last_updated_meta()
    sort_from_date = str(last_updated_meta.get("date_only") or today)
    try:
        today_sort = int(sort_from_date.replace("-", ""))
    except ValueError:
        today_sort = int(today.replace("-", ""))

    # Build-time source of truth for "Last updated" (avoid hand-edited timestamps in HTML).
    meta_items = list((payload.get("meta") or {}).get("items") or [])
    has_last_updated = False
    for item in meta_items:
        if str(item.get("label") or "").strip().lower() == "last updated":
            item.update(last_updated_meta)
            has_last_updated = True
            break
    if not has_last_updated:
        meta_items.insert(0, dict(last_updated_meta))
    if not payload.get("meta"):
        payload["meta"] = {}
    payload["meta"]["items"] = meta_items

    outputs = [o for o in payload.get("outputs", []) if isinstance(o, dict)]
    for item in outputs:
        item["type"] = classify_output_type(item)
        status_meta = canonicalize_output_status(str(item.get("status") or ""))
        item["status_key"] = status_meta["key"]
        item["status_label"] = status_meta["label"]
        item["status_detail"] = status_meta["detail"]
        item["status_display"] = status_meta["display"]
    type_order = [
        ("repo", "Repos", "Codebases and prototype implementations"),
        ("notes", "Notes and Work", "Notes, repositories, and project pages that carry the evidence."),
        ("in_prep", "In prep", "Shareable drafts and materials being refined"),
        ("other", "Other", "Supporting links"),
    ]
    grouped: List[Dict[str, Any]] = []
    for key, title, lead in type_order:
        group_items = [item for item in outputs if item.get("type") == key]
        if not group_items:
            continue
        grouped.append({"key": key, "title": title, "lead": lead, "items": group_items})
    payload["outputs"] = outputs

    projects = [p for p in payload.get("projects", []) if isinstance(p, dict)]
    for item in projects:
        status_meta = canonicalize_project_status(
            str(item.get("status") or ""),
            fallback_detail=str(item.get("current_status") or ""),
        )
        item["status_key"] = status_meta["key"]
        item["status_label"] = status_meta["label"]
        item["status_detail"] = status_meta["detail"]
        item["status_display"] = status_meta["display"]
    payload["projects"] = projects
    payload["output_groups"] = grouped

    repo_count = sum(1 for item in outputs if item.get("type") == "repo")
    notes_count = sum(1 for item in outputs if item.get("type") == "notes")
    prep_count = sum(1 for item in outputs if item.get("type") == "in_prep")
    for item in meta_items:
        if str(item.get("label") or "").strip().lower() == "outputs":
            item["value"] = f"{repo_count} repos · {notes_count} notes · {prep_count} in prep"
            item["datetime"] = ""

    payload["search"] = {
        "title": "Research Statement | Feier Lyu (Fay Lyu)",
        "title_en": "Research Statement | Feier Lyu (Fay Lyu)",
        "url": "research.html",
        "section": "Site",
        "date": "",
        "excerpt": search_excerpt or "Research landing page",
        "excerpt_en": search_excerpt_en or clean(desc_m.group(1) if desc_m else ""),
        "tags": ["research", "optimization", "formal-methods"],
        "sort": today_sort,
        "scope": "site",
        "content": clean(" ".join(content_parts)),
        "meta_title": clean(title_m.group(1) if title_m else ""),
        "meta_description": clean(desc_m.group(1) if desc_m else ""),
    }
    return payload


def main() -> int:
    ap = argparse.ArgumentParser(description="Build canonical research metadata from research.html")
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = ap.parse_args()
    root = args.root.resolve()
    src = root / "research.html"
    out = root / "assets" / "data" / "research-catalog.json"
    text = src.read_text(encoding="utf-8")
    payload = parse_research_page(text)
    payload["generated_at"] = date.today().isoformat()
    payload["source"] = "research.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} (projects={len(payload.get('projects', []))}, links={len(payload.get('links', []))})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
