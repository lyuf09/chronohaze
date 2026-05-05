#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path

VERSION = "20260505-film-grain-pass1"

CRITICAL_LOADER_MARKER = "chronohaze-critical-loader-style"
CRITICAL_LOADER_SNIPPET = """  <style id="chronohaze-critical-loader-style">
    html.chronohaze-critical-loading,
    html.chronohaze-critical-loading body {
      min-height: 100%;
      background: #10141b;
    }

    html.chronohaze-critical-loading body {
      margin: 0;
      overflow: hidden;
    }

    html.chronohaze-critical-loading body > :not(.chronohaze-loader) {
      visibility: hidden !important;
    }

    html.chronohaze-critical-loading::before {
      content: "";
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      background:
        linear-gradient(90deg, rgba(138, 160, 200, 0.09) 0 1px, transparent 1px 100%),
        linear-gradient(180deg, rgba(138, 160, 200, 0.07) 0 1px, transparent 1px 100%),
        linear-gradient(180deg, rgba(13, 17, 24, 0.992) 0%, rgba(19, 24, 33, 0.992) 55%, rgba(13, 17, 24, 0.996) 100%);
      background-size: 54px 54px, 54px 54px, 100% 100%;
    }

    html.chronohaze-critical-loading::after {
      content: "chronohaze.space\\A 页面加载中";
      position: fixed;
      left: 50%;
      top: 50%;
      z-index: 2147483001;
      width: min(500px, calc(100vw - 40px));
      padding: 30px 32px;
      transform: translate(-50%, -50%);
      white-space: pre-line;
      color: rgba(232, 234, 237, 0.9);
      font: 300 clamp(22px, 3.2vw, 34px)/1.48 "Cormorant Garamond", "Noto Serif SC", "Songti SC", "STSong", serif;
      letter-spacing: 0.055em;
      border: 1px solid rgba(154, 172, 204, 0.3);
      border-radius: 0;
      background: linear-gradient(180deg, rgba(20, 25, 34, 0.84) 0%, rgba(13, 17, 24, 0.82) 100%);
      box-shadow: 0 24px 58px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.045);
    }
  </style>
  <script>
    (function () {
      var root = document.documentElement;
      root.classList.add("chronohaze-critical-loading");
      window.__chronohazeReleaseCriticalLoader = function () {
        root.classList.remove("chronohaze-critical-loading");
      };
      window.setTimeout(window.__chronohazeReleaseCriticalLoader, 6500);
    })();
  </script>"""

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
        "academic.html",
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


def rewrite_html_refs(text: str, page_rel: Path) -> str:
    depth = max(len(page_rel.parts) - 1, 0)
    prefix = "../" * depth
    asset_base = r"(?:https://lyuf09\.github\.io/chronohaze/|/chronohaze/|(?:\.\./)*)"
    replacements = {
        rf"{asset_base}styles(?:\.min)?\.css\?v=[^\"']+": f"{prefix}styles.min.css?v={VERSION}",
        rf"{asset_base}home(?:\.min)?\.css\?v=[^\"']+": f"{prefix}home.min.css?v={VERSION}",
        rf"{asset_base}protect-media(?:\.min)?\.js\?v=[^\"']+": f"{prefix}protect-media.min.js?v={VERSION}",
        rf"{asset_base}assets/js/search-page(?:\.min)?\.js\?v=[^\"']+": f"{prefix}assets/js/search-page.min.js?v={VERSION}",
        rf"{asset_base}assets/js/catalog-pages(?:\.min)?\.js\?v=[^\"']+": f"{prefix}assets/js/catalog-pages.min.js?v={VERSION}",
        rf"{asset_base}assets/js/research-page(?:\.min)?\.js\?v=[^\"']+": f"{prefix}assets/js/research-page.min.js?v={VERSION}",
        rf"{asset_base}assets/js/structured-data(?:\.min)?\.js\?v=[^\"']+": f"{prefix}assets/js/structured-data.min.js?v={VERSION}",
        }
    out = text
    for pattern, repl in replacements.items():
        out = re.sub(pattern, repl, out)
    out = remove_static_avif_sources(out)
    return ensure_critical_loader(out)


def remove_static_avif_sources(text: str) -> str:
    return re.sub(
        r"^[ \t]*<source\b(?=[^>]*\btype=[\"']image/avif[\"'])[^>]*>\s*\n?",
        "",
        text,
        flags=re.M,
    )


def strip_existing_critical_loader(text: str) -> str:
    marker = f'<style id="{CRITICAL_LOADER_MARKER}">'
    start = text.find(marker)
    if start < 0:
        return text
    style_end = text.find("</style>", start)
    if style_end < 0:
        return text
    script_start = text.find("<script>", style_end)
    script_end = text.find("</script>", script_start if script_start >= 0 else style_end)
    if script_start < 0 or script_end < 0:
        return text
    line_start = text.rfind("\n", 0, start)
    remove_start = line_start + 1 if line_start >= 0 else start
    remove_end = script_end + len("</script>")
    if remove_end < len(text) and text[remove_end] == "\n":
        remove_end += 1
    return text[:remove_start] + text[remove_end:]


def ensure_critical_loader(text: str) -> str:
    text = strip_existing_critical_loader(text)
    viewport_re = re.compile(r"(^\s*<meta\s+name=[\"']viewport[\"'][^>]*>\s*$)", re.M)
    match = viewport_re.search(text)
    if match:
        return text[:match.end()] + "\n" + CRITICAL_LOADER_SNIPPET + text[match.end():]
    head_re = re.compile(r"(<head>\s*)", re.I)
    return head_re.sub(lambda match: match.group(1) + CRITICAL_LOADER_SNIPPET + "\n", text, count=1)


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
            path.write_text(rewrite_html_refs(path.read_text(encoding="utf-8"), Path(rel)), encoding="utf-8")

    for path in list((root / "music").glob("*.html")) + list((root / "photo").glob("*.html")) + list((root / "post").glob("*.html")):
        path.write_text(rewrite_html_refs(path.read_text(encoding="utf-8"), path.relative_to(root)), encoding="utf-8")

    print("Generated minified assets:")
    for item in generated:
        print(f"- {item}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
