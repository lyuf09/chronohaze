#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path

VERSION = "20260405-min17"

CSS_FILES = [
    "styles.css",
    "home.css",
]

JS_FILES = [
    "protect-media.js",
    "assets/js/catalog-pages.js",
    "assets/js/music-detail-transcript.js",
    "assets/js/research-page.js",
    "assets/js/search-page.js",
    "assets/js/structured-data.js",
]

HTML_FILES = [
    p for p in [
        "404.html",
        "accessibility.html",
        "blank-1.html",
        "blank.html",
        "cv.html",
        "index.html",
        "math.html",
        "music.html",
        "photography.html",
        "policy.html",
        "portfolio-1.html",
        "projects.html",
        "research-summary.html",
        "research.html",
        "search.html",
        "yin-le.html",
    ]
]


def minified_path(rel: str) -> str:
    path = Path(rel)
    return str(path.with_name(path.stem + ".min" + path.suffix)).replace("\\", "/")


def remove_css_comments(text: str) -> str:
    out: list[str] = []
    i = 0
    n = len(text)
    in_single = False
    in_double = False
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if not in_single and not in_double and ch == "/" and nxt == "*":
            end = text.find("*/", i + 2)
            if end == -1:
                break
            i = end + 2
            continue
        if ch == "'" and not in_double and (i == 0 or text[i - 1] != "\\"):
            in_single = not in_single
        elif ch == '"' and not in_single and (i == 0 or text[i - 1] != "\\"):
            in_double = not in_double
        out.append(ch)
        i += 1
    return "".join(out)


def minify_css(text: str) -> str:
    text = remove_css_comments(text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s*([{}:;,>~])\s*", r"\1", text)
    text = re.sub(r";}", "}", text)
    return text.strip() + "\n"


def minify_js_conservative(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = []
    previous_blank = False
    for raw_line in text.split("\n"):
        line = raw_line.rstrip()
        if not line.strip():
            if not previous_blank:
                previous_blank = True
            continue
        previous_blank = False
        lines.append(line.lstrip())
    return "\n".join(lines).strip() + "\n"


def rewrite_html_refs(text: str) -> str:
    replacements = {
        r"(?P<prefix>(?:\.\./)?)(styles(?:\.min)?)\.css\?v=[^\"']+": rf"\g<prefix>styles.min.css?v={VERSION}",
        r"(?P<prefix>(?:\.\./)?)(home(?:\.min)?)\.css\?v=[^\"']+": rf"\g<prefix>home.min.css?v={VERSION}",
        r"(?P<prefix>(?:\.\./)?)(protect-media(?:\.min)?)\.js\?v=[^\"']+": rf"\g<prefix>protect-media.min.js?v={VERSION}",
        r"assets/js/search-page(?:\.min)?\.js\?v=[^\"']+": rf"assets/js/search-page.min.js?v={VERSION}",
        r"assets/js/catalog-pages(?:\.min)?\.js\?v=[^\"']+": rf"assets/js/catalog-pages.min.js?v={VERSION}",
        r"assets/js/research-page(?:\.min)?\.js\?v=[^\"']+": rf"assets/js/research-page.min.js?v={VERSION}",
        r"assets/js/structured-data(?:\.min)?\.js\?v=[^\"']+": rf"assets/js/structured-data.min.js?v={VERSION}",
        }
    out = text
    for pattern, repl in replacements.items():
        out = re.sub(pattern, repl, out)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate lightweight minified CSS/JS assets for Chronohaze")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()

    generated: list[str] = []
    for rel in CSS_FILES:
        src = root / rel
        dst = root / minified_path(rel)
        dst.write_text(minify_css(src.read_text(encoding="utf-8")), encoding="utf-8")
        generated.append(str(dst.relative_to(root)))

    for rel in JS_FILES:
        src = root / rel
        dst = root / minified_path(rel)
        dst.write_text(minify_js_conservative(src.read_text(encoding="utf-8")), encoding="utf-8")
        generated.append(str(dst.relative_to(root)))

    # Keep dynamic structured-data loader on the minified path too.
    protect_path = root / "protect-media.min.js"
    protect_text = protect_path.read_text(encoding="utf-8")
    protect_text = protect_text.replace(
        'assets/js/structured-data.js?v=20260322-schema2',
        f'assets/js/structured-data.min.js?v={VERSION}',
    )
    protect_path.write_text(protect_text, encoding="utf-8")

    for rel in HTML_FILES:
        path = root / rel
        if path.exists():
            path.write_text(rewrite_html_refs(path.read_text(encoding="utf-8")), encoding="utf-8")

    for path in list((root / "music").glob("*.html")) + list((root / "photo").glob("*.html")) + list((root / "post").glob("*.html")):
        path.write_text(rewrite_html_refs(path.read_text(encoding="utf-8")), encoding="utf-8")

    print("Generated minified assets:")
    for item in generated:
        print(f"- {item}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
