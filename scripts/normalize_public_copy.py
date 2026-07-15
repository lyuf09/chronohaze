#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


REPLACEMENTS = (
    ("辗转不同国家无固定号码 请联系邮箱：", "联系邮箱："),
    ("No fixed phone number while moving across countries. Contact via email: ", "Contact by email: "),
    ("No fixed phone number while moving across countries. Contact by email:", "Contact by email: "),
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize public-facing copy shared by static pages.")
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()

    root = args.root.resolve()
    public_artifacts = list(root.rglob("*.html"))
    public_artifacts.extend((root / "assets" / "search-data").glob("*.json"))
    public_artifacts.append(root / "assets" / "search-index.json")

    changed = 0
    for path in sorted(set(public_artifacts)):
        if not path.exists():
            continue
        if "node_modules" in path.parts or any(part.startswith(".") for part in path.parts):
            continue
        original = path.read_text(encoding="utf-8", errors="ignore")
        updated = original
        for old, new in REPLACEMENTS:
            updated = updated.replace(old, new)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed += 1

    print(f"Normalized shared public copy in {changed} public artifacts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
