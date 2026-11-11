#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


EMAIL_LOCAL = "feier530"
EMAIL_DOMAIN = "icloud.com"
RAW_EMAIL = f"{EMAIL_LOCAL}@{EMAIL_DOMAIN}"
OBFUSCATED_EMAIL = "moc.duolci@035reief"


def sanitize_string(value: str) -> str:
    if not value:
        return value
    text = value.replace(f"mailto:{RAW_EMAIL}", OBFUSCATED_EMAIL)
    text = text.replace(RAW_EMAIL, OBFUSCATED_EMAIL)
    text = text.replace("feier530 [at] icloud [dot] com", OBFUSCATED_EMAIL)
    return text


def sanitize_node(node: Any) -> Any:
    if isinstance(node, dict):
        return {k: sanitize_node(v) for k, v in node.items()}
    if isinstance(node, list):
        return [sanitize_node(v) for v in node]
    if isinstance(node, str):
        return sanitize_string(node)
    return node


def sanitize_json_file(path: Path) -> bool:
    data = json.loads(path.read_text(encoding="utf-8"))
    sanitized = sanitize_node(data)
    if sanitized == data:
        return False
    path.write_text(json.dumps(sanitized, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Sanitize public-facing contact strings in search artifacts")
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Chronohaze repo root",
    )
    args = parser.parse_args()
    root = args.root.resolve()

    targets = [root / "assets" / "search-index.json"]
    targets.extend(sorted((root / "assets" / "search-data").glob("*.json")))

    changed = 0
    scanned = 0
    for path in targets:
        if not path.is_file():
            continue
        scanned += 1
        if sanitize_json_file(path):
            changed += 1

    print(f"Sanitized public contact artifacts: changed {changed}/{scanned} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
