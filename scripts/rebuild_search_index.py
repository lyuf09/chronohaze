#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Tuple


REQUIRED_ITEM_KEYS = (
    "title",
    "url",
    "section",
    "date",
    "excerpt",
    "tags",
    "sort",
    "scope",
    "content",
)

HTML_CONTENT_REFRESH_URLS = {
    "academic.html",
    "cv.html",
    "index.html",
    "projects.html",
    "post/isabelle-submodular-greedy.html",
    "post/submodular-greedy-formalization-enters-afp.html",
    "post/theorem-to-framework-isabelle-submodular.html",
}


class MainContentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.main_depth = 0
        self.skip_depth = 0
        self.in_first_h1 = False
        self.found_h1 = False
        self.text_parts: List[str] = []
        self.h1_parts: List[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        tag = tag.lower()
        if tag == "main":
            self.main_depth = 1
            return
        if not self.main_depth:
            return
        self.main_depth += 1
        if tag in {"script", "style", "noscript", "template"}:
            self.skip_depth += 1
        if tag == "h1" and not self.found_h1:
            self.in_first_h1 = True

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if not self.main_depth:
            return
        if tag == "h1" and self.in_first_h1:
            self.in_first_h1 = False
            self.found_h1 = True
        if tag in {"script", "style", "noscript", "template"} and self.skip_depth:
            self.skip_depth -= 1
        if tag == "main":
            self.main_depth = 0
        else:
            self.main_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self.main_depth or self.skip_depth:
            return
        value = " ".join(data.split()).strip()
        if not value:
            return
        self.text_parts.append(value)
        if self.in_first_h1:
            self.h1_parts.append(value)

    def result(self) -> Tuple[str, str]:
        return " ".join(self.text_parts).strip(), " ".join(self.h1_parts).strip()


def _catalog_items_to_url_map(items: Any) -> Dict[str, Dict[str, Any]]:
    if not isinstance(items, list):
        return {}
    result: Dict[str, Dict[str, Any]] = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        url = str(item.get("url", "")).strip()
        if not url:
            continue
        result[url] = item
    return result


def load_music_catalog_map(root: Path) -> Dict[str, Dict[str, Any]]:
    catalog_path = root / "assets" / "data" / "music-catalog.json"
    if not catalog_path.is_file():
        return {}
    payload = load_json(catalog_path)
    if not isinstance(payload, dict):
        return {}
    return _catalog_items_to_url_map(payload.get("items"))


def load_music_detail_catalog_map(root: Path) -> Dict[str, Dict[str, Any]]:
    catalog_path = root / "assets" / "data" / "music-detail-catalog.json"
    if not catalog_path.is_file():
        return {}
    payload = load_json(catalog_path)
    if not isinstance(payload, dict):
        return {}
    return _catalog_items_to_url_map(payload.get("items"))


def load_math_catalog_map(root: Path) -> Dict[str, Dict[str, Any]]:
    catalog_path = root / "assets" / "data" / "math-catalog.json"
    if not catalog_path.is_file():
        return {}
    payload = load_json(catalog_path)
    if not isinstance(payload, dict):
        return {}
    return _catalog_items_to_url_map(payload.get("items"))


def load_photo_catalog_map(root: Path) -> Dict[str, Dict[str, Any]]:
    catalog_path = root / "assets" / "data" / "photo-catalog.json"
    if not catalog_path.is_file():
        return {}
    payload = load_json(catalog_path)
    if not isinstance(payload, dict):
        return {}
    if isinstance(payload.get("items"), list):
        return _catalog_items_to_url_map(payload.get("items"))

    # Backward-compatible fallback (featured + archive)
    featured_map = _catalog_items_to_url_map(payload.get("featured"))
    archive_map = _catalog_items_to_url_map(payload.get("archive"))
    merged: Dict[str, Dict[str, Any]] = {}
    for url, item in archive_map.items():
        tags = [str(tag) for tag in item.get("tags", [])] if isinstance(item.get("tags"), list) else []
        feat = featured_map.get(url)
        if feat and "featured" not in [t.lower() for t in tags]:
            tags.append("featured")
        merged[url] = dict(item, tags=tags or item.get("tags", []))
    return merged


def load_research_catalog(root: Path) -> Dict[str, Any]:
    catalog_path = root / "assets" / "data" / "research-catalog.json"
    if not catalog_path.is_file():
        return {}
    payload = load_json(catalog_path)
    return payload if isinstance(payload, dict) else {}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def as_int_sort(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip()
    if not text:
        return 0
    try:
        return int(text)
    except ValueError:
        digits = "".join(ch for ch in text if ch.isdigit())
        return int(digits) if digits else 0


def validate_item(item: Dict[str, Any], source: Path, index: int) -> None:
    missing = set(REQUIRED_ITEM_KEYS).difference(item.keys())
    if missing:
        raise ValueError(
            f"{source.name} item[{index}] missing keys: {', '.join(sorted(missing))}"
        )


def overlay_fields(item: Dict[str, Any], overlay: Dict[str, Any], keys: Tuple[str, ...]) -> None:
    for key in keys:
        if key not in overlay:
            continue
        value = overlay.get(key)
        if key == "tags" and isinstance(value, list):
            item[key] = [str(tag) for tag in value if str(tag).strip()]
        elif value is not None:
            item[key] = value


def _norm_for_contains(value: Any) -> str:
    return " ".join(str(value or "").split()).strip().lower()


def append_content_fragments(item: Dict[str, Any], fragments: List[str]) -> None:
    base = str(item.get("content", "") or "").strip()
    base_norm = _norm_for_contains(base)
    extras: List[str] = []
    seen_norm = set()
    for fragment in fragments:
        text = " ".join(str(fragment or "").split()).strip()
        if not text:
            continue
        norm = _norm_for_contains(text)
        if not norm or norm in seen_norm or (base_norm and norm in base_norm):
            continue
        seen_norm.add(norm)
        extras.append(text)
    if not extras:
        return
    item["content"] = (base + " " + " ".join(extras)).strip() if base else " ".join(extras)


def apply_music_detail_overlay(item: Dict[str, Any], detail_item: Dict[str, Any]) -> None:
    if not isinstance(detail_item, dict):
        return
    status = str(detail_item.get("status", "") or "").strip()
    subtitle = str(detail_item.get("subtitle", "") or "").strip()
    creation_period = str(detail_item.get("creation_period", "") or "").strip()
    credit_lines = [str(x).strip() for x in detail_item.get("credit_lines", []) if str(x).strip()] if isinstance(detail_item.get("credit_lines"), list) else []
    alias_tokens = [str(x).strip() for x in detail_item.get("credit_alias_tokens", []) if str(x).strip()] if isinstance(detail_item.get("credit_alias_tokens"), list) else []
    audio_titles = [str(x).strip() for x in detail_item.get("audio_titles", []) if str(x).strip()] if isinstance(detail_item.get("audio_titles"), list) else []
    title_clean = str(detail_item.get("title_clean", "") or "").strip()
    description_excerpt = str(detail_item.get("description_excerpt", "") or "").strip()
    search_body_text = str(detail_item.get("search_body_text", "") or "").strip()
    body_section_headings = [str(x).strip() for x in detail_item.get("body_section_headings", []) if str(x).strip()] if isinstance(detail_item.get("body_section_headings"), list) else []

    if status:
        item["status"] = status
    if subtitle:
        item["subtitle"] = subtitle

    # Enrich searchability with canonical detail metadata + cross-language credit aliases.
    append_content_fragments(
        item,
        [title_clean, creation_period, subtitle, description_excerpt] + credit_lines + alias_tokens + audio_titles + body_section_headings + [search_body_text],
    )

    excerpt = str(item.get("excerpt", "") or "").strip()
    artist = str(item.get("artist", "") or "").strip()
    excerpt_norm = _norm_for_contains(excerpt)
    artist_norm = _norm_for_contains(artist)
    placeholder_excerpt = (not excerpt_norm) or (artist_norm and excerpt_norm == artist_norm)

    # Prefer canonical description excerpt for music pages; fallback to subtitle.
    if description_excerpt:
        if placeholder_excerpt or not excerpt_norm:
            item["excerpt"] = description_excerpt
    elif subtitle and (placeholder_excerpt or not excerpt_norm):
        item["excerpt"] = subtitle


def apply_catalog_overlay(path_name: str, item: Dict[str, Any], catalogs: Dict[str, Any]) -> None:
    url = str(item.get("url", "")).strip()
    if not url:
        return

    if path_name == "music.json":
        catalog_item = (catalogs.get("music") or {}).get(url)
        if catalog_item:
            overlay_fields(item, catalog_item, ("tags", "date", "title", "artist"))
        detail_item = (catalogs.get("music_detail") or {}).get(url)
        if detail_item:
            apply_music_detail_overlay(item, detail_item)
        return

    if path_name == "math.json":
        catalog_item = (catalogs.get("math") or {}).get(url)
        if catalog_item:
            overlay_fields(item, catalog_item, ("tags", "date", "title", "excerpt"))
        elif url == "math.html":
            overlay_fields(item, {"tags": ["math", "technical notes"], "title": "学术笔记 / Technical Notes"}, ("tags", "title"))
        return

    if path_name == "photo.json":
        catalog_item = (catalogs.get("photo") or {}).get(url)
        if catalog_item:
            overlay_fields(item, catalog_item, ("tags", "date", "title", "excerpt"))
        return

    if path_name == "site.json" and url == "research.html":
        research_search = (catalogs.get("research") or {}).get("search")
        if isinstance(research_search, dict):
            overlay_fields(item, research_search, ("title", "date", "excerpt", "tags", "scope", "content"))


def synthesize_research_search_item(catalogs: Dict[str, Any]) -> Dict[str, Any] | None:
    payload = catalogs.get("research")
    if not isinstance(payload, dict):
        return None
    item = payload.get("search")
    if not isinstance(item, dict):
        return None
    synthetic = {k: item.get(k) for k in REQUIRED_ITEM_KEYS}
    if set(synthetic.keys()) != set(REQUIRED_ITEM_KEYS):
        return None
    return synthetic


def merge_items(search_data_dir: Path, catalogs: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
    collected: List[Dict[str, Any]] = []
    seen_urls = set()
    catalogs = catalogs or {}

    preferred_order = ["music.json", "math.json", "photo.json", "site.json", "cv.json"]
    discovered = {path.name: path for path in search_data_dir.glob("*.json")}
    ordered_paths: List[Path] = []
    for name in preferred_order:
        path = discovered.pop(name, None)
        if path is not None:
            ordered_paths.append(path)
    ordered_paths.extend(discovered[name] for name in sorted(discovered.keys()))

    for path in ordered_paths:
        data = load_json(path)
        if not isinstance(data, dict):
            raise ValueError(f"{path.name} root must be object")
        items = data.get("items")
        if not isinstance(items, list):
            raise ValueError(f"{path.name} items must be array")

        for idx, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValueError(f"{path.name} item[{idx}] must be object")
            validate_item(item, path, idx)
            url = str(item.get("url", "")).strip()
            if not url:
                continue
            apply_catalog_overlay(path.name, item, catalogs)
            if url in seen_urls:
                # Keep first occurrence to avoid unstable search duplicates.
                continue
            seen_urls.add(url)
            collected.append(item)

    research_item = synthesize_research_search_item(catalogs)
    if research_item:
        research_url = str(research_item.get("url", "")).strip()
        if research_url and research_url not in seen_urls:
            collected.append(research_item)
            seen_urls.add(research_url)

    # Keep same-sort ordering stable to avoid churn in search result presentation.
    collected.sort(key=lambda item: -as_int_sort(item.get("sort")))
    return collected


def refresh_search_data_metadata(search_data_dir: Path, generated_at: str) -> int:
    updated = 0
    for path in sorted(search_data_dir.glob("*.json")):
        data = load_json(path)
        if not isinstance(data, dict):
            raise ValueError(f"{path.name} root must be object")
        items = data.get("items")
        if not isinstance(items, list):
            raise ValueError(f"{path.name} items must be array")
        if str(data.get("generated_at", "")).strip() == generated_at:
            continue
        data["generated_at"] = generated_at
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        updated += 1
    return updated


def refresh_selected_html_search_content(
    root: Path,
    search_data_dir: Path,
    math_catalog: Dict[str, Dict[str, Any]],
) -> int:
    refreshed = 0
    for path in sorted(search_data_dir.glob("*.json")):
        data = load_json(path)
        if not isinstance(data, dict) or not isinstance(data.get("items"), list):
            continue
        changed = False
        for item in data["items"]:
            if not isinstance(item, dict):
                continue
            url = str(item.get("url", "")).strip()
            if url not in HTML_CONTENT_REFRESH_URLS:
                continue
            html_path = root / url
            if not html_path.is_file():
                continue
            parser = MainContentParser()
            parser.feed(html_path.read_text(encoding="utf-8", errors="ignore"))
            content, first_h1 = parser.result()
            if content and item.get("content") != content:
                item["content"] = content
                changed = True
            if url.startswith("post/") and first_h1 and item.get("title") != first_h1:
                item["title"] = first_h1
                changed = True
            catalog_item = math_catalog.get(url)
            if catalog_item:
                for key in ("title", "excerpt"):
                    value = str(catalog_item.get(key, "")).strip()
                    if value and item.get(key) != value:
                        item[key] = value
                        changed = True
        if not changed:
            continue
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        refreshed += 1
    return refreshed


INLINE_FALLBACK_RE = re.compile(
    r'(<script id="search-inline-fallback" type="application/json">\s*)(\{.*?\})(\s*</script>)',
    re.S,
)


def sync_search_inline_fallback(root: Path, payload: Dict[str, Any]) -> bool:
    search_html_path = root / "search.html"
    html_text = search_html_path.read_text(encoding="utf-8")
    match = INLINE_FALLBACK_RE.search(html_text)
    if not match:
        raise ValueError("search.html is missing #search-inline-fallback payload")
    rendered_payload = json.dumps(payload, ensure_ascii=False, indent=2)
    updated_html = (
        html_text[: match.start(2)]
        + rendered_payload
        + html_text[match.end(2) :]
    )
    if updated_html == html_text:
        return False
    search_html_path.write_text(updated_html, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rebuild combined search index from assets/search-data/*.json"
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Chronohaze repo root (defaults to script parent repo)",
    )
    args = parser.parse_args()

    root = args.root.resolve()
    search_data_dir = root / "assets" / "search-data"
    out_path = root / "assets" / "search-index.json"

    if not search_data_dir.is_dir():
        raise SystemExit(f"Missing search data directory: {search_data_dir}")

    generated_at = date.today().isoformat()
    catalogs = {
        "music": load_music_catalog_map(root),
        "music_detail": load_music_detail_catalog_map(root),
        "math": load_math_catalog_map(root),
        "photo": load_photo_catalog_map(root),
        "research": load_research_catalog(root),
    }
    refreshed_count = refresh_search_data_metadata(search_data_dir, generated_at)
    content_refreshed_count = refresh_selected_html_search_content(
        root,
        search_data_dir,
        catalogs["math"],
    )
    items = merge_items(search_data_dir, catalogs)
    payload = {
        "generated_at": generated_at,
        "items": items,
    }

    out_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    inline_updated = sync_search_inline_fallback(root, payload)
    print(
        f"Rebuilt {out_path} with {len(items)} items from {search_data_dir} "
        f"(metadata refreshed: {refreshed_count}, HTML content sources refreshed: {content_refreshed_count}, "
        f"inline fallback updated: {'yes' if inline_updated else 'no'})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
