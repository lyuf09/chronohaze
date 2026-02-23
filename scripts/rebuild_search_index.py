#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any, Dict, List


REQUIRED_ITEM_KEYS = {
    "title",
    "url",
    "section",
    "date",
    "excerpt",
    "tags",
    "sort",
    "scope",
    "content",
}


def load_music_catalog_map(root: Path) -> Dict[str, Dict[str, Any]]:
    catalog_path = root / "assets" / "data" / "music-catalog.json"
    if not catalog_path.is_file():
        return {}

    payload = load_json(catalog_path)
    if not isinstance(payload, dict):
        return {}

    items = payload.get("items")
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
    missing = REQUIRED_ITEM_KEYS.difference(item.keys())
    if missing:
        raise ValueError(
            f"{source.name} item[{index}] missing keys: {', '.join(sorted(missing))}"
        )


def merge_items(
    search_data_dir: Path, music_catalog_map: Dict[str, Dict[str, Any]] | None = None
) -> List[Dict[str, Any]]:
    collected: List[Dict[str, Any]] = []
    seen_urls = set()
    music_catalog_map = music_catalog_map or {}

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
            if path.name == "music.json":
                catalog_item = music_catalog_map.get(url)
                if catalog_item:
                    catalog_tags = catalog_item.get("tags")
                    if isinstance(catalog_tags, list):
                        item["tags"] = [str(tag) for tag in catalog_tags if str(tag).strip()]
                    catalog_date = str(catalog_item.get("date", "")).strip()
                    if catalog_date:
                        item["date"] = catalog_date
            if url in seen_urls:
                # Keep first occurrence to avoid unstable search duplicates.
                continue
            seen_urls.add(url)
            collected.append(item)

    # Keep same-sort ordering stable to avoid churn in search result presentation.
    collected.sort(key=lambda item: -as_int_sort(item.get("sort")))
    return collected


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

    music_catalog_map = load_music_catalog_map(root)
    items = merge_items(search_data_dir, music_catalog_map)
    payload = {
        "generated_at": date.today().isoformat(),
        "items": items,
    }

    out_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Rebuilt {out_path} with {len(items)} items from {search_data_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
