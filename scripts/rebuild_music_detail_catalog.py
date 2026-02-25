#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import re
from datetime import date
from pathlib import Path
from typing import Any, Dict, List


H1_RE = re.compile(r"<h1>(.*?)</h1>", re.S)
META_RE = re.compile(r'<p\s+class="music-detail-meta">(.*?)</p>', re.S)
AUDIO_RE = re.compile(r"<audio\b([^>]*)>", re.S)
SECTION_RE = re.compile(r"<h2>(.*?)</h2>\s*<p(?:\s+[^>]*)?>(.*?)</p>", re.S)
ATTR_RE = re.compile(r'([:\w-]+)="([^"]*)"')
TAG_RE = re.compile(r"<[^>]+>")
PENDING_RE = re.compile(r"\s*[（(]\s*(?:音频待上传|audio pending upload)\s*[）)]\s*$", re.I)

ZERO_WIDTH = {
    "\u200b",
    "\ufeff",
    "\u2060",
}

CREDIT_LABEL_HINTS = (
    "作词",
    "作曲",
    "编曲",
    "混音",
    "录制",
    "录音",
    "录制",
    "录製",
    "演唱",
    "吉他",
    "贝斯",
    "钢琴",
    "鼓",
    "弦乐",
    "人声",
    "调教",
    "solo",
    "vocal",
    "mix",
    "arrang",
    "compose",
    "lyric",
    "guitar",
    "bass",
    "piano",
    "feat",
)

NON_CREDIT_LABEL_EXACT = {
    "album",
    "creation period",
    "创作时间",
}

# Cross-language/name aliases used for search enrichment and drift-resistant metadata.
CREDIT_NAME_ALIASES = {
    "起子": ["Johnny Zhou"],
    "Johnny Zhou": ["起子"],
    "凛野": ["Rinya"],
    "Rinya": ["凛野"],
    "文心": ["Wenxin"],
    "Wenxin": ["文心"],
    "斐然": ["Franklimn Zhang"],
    "Franklimn Zhang": ["斐然"],
    "Haze": ["HazezZ"],
    "HazezZ": ["Haze"],
}


def clean_html_text(fragment: str, preserve_breaks: bool = False) -> str:
    text = fragment or ""
    if preserve_breaks:
        text = text.replace("<br />", "\n").replace("<br/>", "\n").replace("<br>", "\n")
    else:
        text = text.replace("<br />", " ").replace("<br/>", " ").replace("<br>", " ")
    text = TAG_RE.sub("", text)
    text = html.unescape(text)
    text = "".join(ch for ch in text if ch not in ZERO_WIDTH)
    if preserve_breaks:
        lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.splitlines()]
        return "\n".join(lines).strip()
    return re.sub(r"\s+", " ", text).strip()


def split_nonempty_lines(text: str) -> List[str]:
    out: List[str] = []
    for raw in (text or "").splitlines():
        line = re.sub(r"\s+", " ", raw).strip()
        if line:
            out.append(line)
    return out


def split_paragraph_blocks(text: str) -> List[str]:
    raw = str(text or "").strip()
    if not raw:
        return []
    blocks = re.split(r"(?:\r?\n){2,}", raw)
    out: List[str] = []
    for block in blocks:
        normalized_lines = [re.sub(r"\s+", " ", ln).strip() for ln in block.splitlines()]
        normalized = "\n".join([ln for ln in normalized_lines if ln]).strip()
        if normalized:
            out.append(normalized)
    return out


def strip_pending_suffix(title: str) -> str:
    return PENDING_RE.sub("", str(title or "")).strip()


def infer_status(title_raw: str, audio_items: List[Dict[str, str]]) -> str:
    if PENDING_RE.search(title_raw or ""):
        return "audio_pending"
    if not any((a.get("src") or "").strip() for a in audio_items):
        return "draft"
    return "available"


def is_credit_line(line: str) -> bool:
    text = str(line or "").strip()
    if not text:
        return False
    if "：" in text:
        label = text.split("：", 1)[0].strip()
    elif ":" in text:
        label = text.split(":", 1)[0].strip()
    else:
        return False

    if not label:
        return False

    label_l = label.lower()
    if label_l in NON_CREDIT_LABEL_EXACT:
        return False

    return any(hint in label_l for hint in CREDIT_LABEL_HINTS) or any(hint in label for hint in CREDIT_LABEL_HINTS)


def build_credit_alias_tokens(lines: List[str]) -> List[str]:
    seen = set()
    tokens: List[str] = []
    joined = "\n".join(lines)
    for key, aliases in CREDIT_NAME_ALIASES.items():
        if key not in joined:
            continue
        for alias in aliases:
            alias_text = str(alias or "").strip()
            if not alias_text or alias_text in seen:
                continue
            seen.add(alias_text)
            tokens.append(alias_text)
    return tokens


def classify_section_kind(heading: str) -> str:
    title = str(heading or "").strip()
    title_l = title.lower()
    if not title:
        return "section"
    if "歌词" in title or "lyric" in title_l:
        return "lyrics"
    if "作品介绍" in title or "description" in title_l:
        return "description"
    if "音乐上的想法" in title or "musical note" in title_l or "notes" == title_l:
        return "notes"
    return "section"


def build_description_excerpt(text: str, max_chars: int = 220) -> str:
    normalized = re.sub(r"\s+", " ", str(text or "")).strip()
    if not normalized:
        return ""
    if len(normalized) <= max_chars:
        return normalized
    cutoff = normalized[:max_chars].rstrip()
    return cutoff + "…"


def parse_audio_items(html_text: str) -> List[Dict[str, str]]:
    items: List[Dict[str, str]] = []
    for audio_m in AUDIO_RE.finditer(html_text):
        attrs = {k: v for k, v in ATTR_RE.findall(audio_m.group(1) or "")}
        src = (attrs.get("src") or "").strip()
        title = (attrs.get("data-track-title") or "").strip()
        items.append(
            {
                "src": src,
                "title": title,
            }
        )
    return items


def parse_content_sections(html_text: str) -> List[Dict[str, Any]]:
    sections: List[Dict[str, Any]] = []
    for match in SECTION_RE.finditer(html_text):
        heading = clean_html_text(match.group(1), preserve_breaks=False)
        body_text = clean_html_text(match.group(2), preserve_breaks=True)
        kind = classify_section_kind(heading)
        line_items = split_nonempty_lines(body_text)
        paragraph_blocks = split_paragraph_blocks(body_text)
        sections.append(
            {
                "heading": heading,
                "kind": kind,
                "text": body_text,
                "lines": line_items,
                "paragraphs": paragraph_blocks,
                "line_count": len(line_items),
                "paragraph_count": len(paragraph_blocks),
            }
        )
    return sections


def parse_detail_page(path: Path) -> Dict[str, Any]:
    html_text = path.read_text(encoding="utf-8")
    h1_m = H1_RE.search(html_text)
    meta_raw = META_RE.findall(html_text)
    metas = [clean_html_text(m, preserve_breaks=True) for m in meta_raw]
    audio_items = parse_audio_items(html_text)
    body_sections = parse_content_sections(html_text)

    title_raw = clean_html_text(h1_m.group(1), preserve_breaks=False) if h1_m else ""
    title_clean = strip_pending_suffix(title_raw)

    creation_period = ""
    if metas:
        first_lines = split_nonempty_lines(metas[0])
        if first_lines:
            # "创作时间：\n06/2025 - 10/2025" -> keep the actual period line(s)
            if len(first_lines) >= 2 and ("创作时间" in first_lines[0] or "Creation period" in first_lines[0]):
                creation_period = " ".join(first_lines[1:]).strip()
            else:
                creation_period = " ".join(first_lines).strip()

    subtitle_lines: List[str] = []
    credit_lines: List[str] = []
    extra_meta_lines: List[str] = []

    for idx, meta in enumerate(metas[1:], start=2):
        lines = split_nonempty_lines(meta)
        if not lines:
            continue
        if idx == 2:
            for line in lines:
                if is_credit_line(line):
                    credit_lines.append(line)
                else:
                    subtitle_lines.append(line)
            continue
        # meta3+ often contains audio version labels or other annotations.
        for line in lines:
            if is_credit_line(line):
                credit_lines.append(line)
            else:
                extra_meta_lines.append(line)

    # If audio titles are missing in HTML, use extra meta labels (e.g., track-28).
    if audio_items:
        unlabeled_indexes = [i for i, item in enumerate(audio_items) if not (item.get("title") or "").strip()]
        if unlabeled_indexes and extra_meta_lines:
            labels = extra_meta_lines[: len(unlabeled_indexes)]
            for i, label in zip(unlabeled_indexes, labels):
                audio_items[i]["title"] = label

    audio_titles = [item.get("title", "").strip() for item in audio_items if (item.get("title") or "").strip()]
    credit_alias_tokens = build_credit_alias_tokens(credit_lines)
    status = infer_status(title_raw, audio_items)

    description_sections = [sec for sec in body_sections if sec.get("kind") == "description"]
    lyrics_sections = [sec for sec in body_sections if sec.get("kind") == "lyrics"]
    notes_sections = [sec for sec in body_sections if sec.get("kind") == "notes"]
    other_sections = [sec for sec in body_sections if sec.get("kind") == "section"]

    description_text = "\n\n".join(str(sec.get("text", "")).strip() for sec in description_sections if str(sec.get("text", "")).strip()).strip()
    lyrics_text = "\n\n".join(str(sec.get("text", "")).strip() for sec in lyrics_sections if str(sec.get("text", "")).strip()).strip()
    notes_text = "\n\n".join(str(sec.get("text", "")).strip() for sec in notes_sections if str(sec.get("text", "")).strip()).strip()
    other_section_text = "\n\n".join(str(sec.get("text", "")).strip() for sec in other_sections if str(sec.get("text", "")).strip()).strip()

    body_section_headings = [str(sec.get("heading", "")).strip() for sec in body_sections if str(sec.get("heading", "")).strip()]
    search_body_parts: List[str] = []
    for sec in body_sections:
        heading = str(sec.get("heading", "")).strip()
        text = str(sec.get("text", "")).strip()
        if heading:
            search_body_parts.append(heading)
        if text:
            search_body_parts.append(text)
    search_body_text = "\n\n".join(search_body_parts).strip()
    description_excerpt = build_description_excerpt(description_text or notes_text or other_section_text)

    return {
        "url": f"music/{path.name}",
        "file": path.name,
        "title_raw": title_raw,
        "title_clean": title_clean,
        "status": status,
        "creation_period": creation_period,
        "subtitle": " / ".join(subtitle_lines).strip(),
        "subtitle_lines": subtitle_lines,
        "credit_lines": credit_lines,
        "extra_meta_lines": extra_meta_lines,
        "credit_alias_tokens": credit_alias_tokens,
        "audio_count": len(audio_items),
        "audio_items": audio_items,
        "audio_titles": audio_titles,
        "body_sections": body_sections,
        "body_section_headings": body_section_headings,
        "body_section_count": len(body_sections),
        "description_sections": [sec.get("heading", "") for sec in description_sections],
        "description_text": description_text,
        "description_excerpt": description_excerpt,
        "lyrics_sections": [sec.get("heading", "") for sec in lyrics_sections],
        "lyrics_text": lyrics_text,
        "lyrics_line_count": sum(int(sec.get("line_count", 0) or 0) for sec in lyrics_sections),
        "notes_sections": [sec.get("heading", "") for sec in notes_sections],
        "notes_text": notes_text,
        "other_section_text": other_section_text,
        "search_body_text": search_body_text,
    }


def build_items(root: Path) -> List[Dict[str, Any]]:
    music_dir = root / "music"
    files = sorted(music_dir.glob("track-*.html"))
    items = [parse_detail_page(path) for path in files]
    items.sort(key=lambda item: str(item.get("url", "")))
    return items


def main() -> int:
    parser = argparse.ArgumentParser(description="Build canonical music detail-page metadata catalog from /music/track-*.html")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()

    root = args.root.resolve()
    out = root / "assets" / "data" / "music-detail-catalog.json"
    items = build_items(root)
    payload = {
        "generated_at": date.today().isoformat(),
        "source_glob": "music/track-*.html",
        "items": items,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({len(items)} items)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
