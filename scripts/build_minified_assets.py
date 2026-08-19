#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path

VERSION = "20260819-studio-menu-reset1"
PHOTO_STYLE_VERSION = "20260819-photo-membrane2"
HOME_VERSION = "20260814-mobile-drawer-logo1"
PROTECT_VERSION = "20260819-studio-menu-reset1"
MUSIC_PROTECT_VERSION = "20260819-studio-menu-reset1"
MUSIC_STYLE_VERSION = "20260819-studio-menu-reset1"
CATALOG_VERSION = "20260801-bilingual-seo1"
STRUCTURED_DATA_VERSION = "20260801-bilingual-seo1"

SECURITY_META_MARKER = "chronohaze-security-policy"
SECURITY_META_SNIPPET = """  <meta id="chronohaze-security-policy" http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.google.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; media-src 'self'; frame-src 'none'; upgrade-insecure-requests" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />"""

GOOGLE_TAG_SNIPPET = """  <!-- Google tag (gtag.js), deferred until idle -->
  <script>
    (function () {
      var measurementId = "G-JWZY2TVYFZ";
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

      function shouldSkipAnalytics() {
        return navigator.doNotTrack === "1" || window.doNotTrack === "1";
      }

      function loadAnalytics() {
        if (loadAnalytics.loaded || shouldSkipAnalytics()) return;
        loadAnalytics.loaded = true;
        var script = document.createElement("script");
        script.async = true;
        script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
        document.head.appendChild(script);
        window.gtag("js", new Date());
        window.gtag("config", measurementId, { anonymize_ip: true });
      }

      function scheduleAnalytics() {
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(loadAnalytics, { timeout: 3500 });
        } else {
          window.setTimeout(loadAnalytics, 1800);
        }
      }

      if (document.readyState === "complete") {
        scheduleAnalytics();
      } else {
        window.addEventListener("load", scheduleAnalytics, { once: true });
      }
    })();
  </script>"""

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
      content: "CHRONOHAZE";
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

    html[lang^="zh"].chronohaze-critical-loading:not(.chronohaze-critical-loading-mobile)::after {
      content: "CHRONOHAZE\\A 页面加载中";
    }

    html[lang^="en"].chronohaze-critical-loading:not(.chronohaze-critical-loading-mobile)::after {
      content: "CHRONOHAZE\\A Loading";
    }

    html.chronohaze-critical-loading-mobile body {
      overflow: auto;
    }

    html.chronohaze-critical-loading-mobile body > :not(.chronohaze-loader) {
      visibility: visible !important;
    }

    html.chronohaze-critical-loading-mobile::before {
      background: linear-gradient(180deg, rgba(13, 17, 24, 0.18) 0%, rgba(19, 24, 33, 0.22) 100%);
      pointer-events: none;
    }

    html.chronohaze-critical-loading-mobile::after {
      content: "CHRONOHAZE";
      left: 16px;
      top: 16px;
      width: auto;
      max-width: calc(100vw - 32px);
      padding: 10px 12px;
      transform: none;
      white-space: normal;
      color: rgba(232, 234, 237, 0.78);
      font: 400 12px/1.3 "Cormorant Garamond", "Noto Serif SC", "Songti SC", "STSong", serif;
      letter-spacing: 0.18em;
      border: 1px solid rgba(154, 172, 204, 0.18);
      background: rgba(16, 20, 27, 0.34);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
      backdrop-filter: blur(2px);
    }
  </style>
  <script>
    (function () {
      var root = document.documentElement;
      var isMobile = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
      root.classList.add("chronohaze-critical-loading");
      if (isMobile) {
        root.classList.add("chronohaze-critical-loading-mobile");
      }
      window.__chronohazeReleaseCriticalLoader = function () {
        root.classList.remove("chronohaze-critical-loading");
        root.classList.remove("chronohaze-critical-loading-mobile");
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", window.__chronohazeReleaseCriticalLoader, { once: true });
      } else {
        window.requestAnimationFrame(window.__chronohazeReleaseCriticalLoader);
      }
      window.setTimeout(window.__chronohazeReleaseCriticalLoader, 500);
    })();
  </script>
"""

CSS_FILES = [
    "styles.css",
    "home.css",
    "assets/css/olfactory.css",
    "assets/css/performance-archive.css",
]

JS_FILES = [
    "protect-media.js",
    "assets/js/catalog-pages.js",
    "assets/js/music-detail-transcript.js",
    "assets/js/orchid-production-notes.js",
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
        "olfactory.html",
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
    text = re.sub(
        r"/\*\s*@production-strip-start\b.*?\*/.*?/\*\s*@production-strip-end\s*\*/",
        "",
        text,
        flags=re.S,
    )
    lines = []
    previous_blank = False
    for raw_line in text.split("\n"):
        line = raw_line.rstrip()
        if line.lstrip().startswith("//"):
            continue
        if not line.strip():
            if not previous_blank:
                previous_blank = True
            continue
        previous_blank = False
        lines.append(line.lstrip())
    return "\n".join(lines).strip() + "\n"


def rewrite_asset_refs(text: str, page_rel: Path) -> str:
    depth = max(len(page_rel.parts) - 1, 0)
    prefix = "../" * depth
    is_music_index = page_rel.as_posix() == "music.html"
    is_photo_detail = bool(page_rel.parts) and page_rel.parts[0] == "photo"
    style_version = MUSIC_STYLE_VERSION if is_music_index else (PHOTO_STYLE_VERSION if is_photo_detail else VERSION)
    protect_version = MUSIC_PROTECT_VERSION if is_music_index else PROTECT_VERSION
    asset_base = r"(?:https://lyuf09\.github\.io/chronohaze/|/chronohaze/|(?:\.\./)*)"
    replacements = {
        rf"{asset_base}styles(?:\.min)?\.css\?v=[^\"']+": f"{prefix}styles.min.css?v={style_version}",
        rf"{asset_base}home(?:\.min)?\.css\?v=[^\"']+": f"{prefix}home.min.css?v={HOME_VERSION}",
        rf"{asset_base}protect-media(?:\.min)?\.js\?v=[^\"']+": f"{prefix}protect-media.min.js?v={protect_version}",
        rf"{asset_base}assets/js/search-page(?:\.min)?\.js\?v=[^\"']+": f"{prefix}assets/js/search-page.min.js?v={VERSION}",
        rf"{asset_base}assets/js/catalog-pages(?:\.min)?\.js\?v=[^\"']+": f"{prefix}assets/js/catalog-pages.min.js?v={CATALOG_VERSION}",
        rf"{asset_base}assets/js/research-page(?:\.min)?\.js\?v=[^\"']+": f"{prefix}assets/js/research-page.min.js?v={VERSION}",
        rf"{asset_base}assets/js/structured-data(?:\.min)?\.js\?v=[^\"']+": f"{prefix}assets/js/structured-data.min.js?v={STRUCTURED_DATA_VERSION}",
        }
    out = text
    for pattern, repl in replacements.items():
        out = re.sub(pattern, repl, out)
    return out


def rewrite_html_refs(text: str, page_rel: Path) -> str:
    out = rewrite_asset_refs(text, page_rel)
    out = remove_static_avif_sources(out)
    out = remove_third_party_font_hints(out)
    out = defer_google_tag(out)
    out = ensure_critical_loader(out)
    return ensure_security_meta(out)


def remove_static_avif_sources(text: str) -> str:
    return re.sub(
        r"^[ \t]*<source\b(?=[^>]*\btype=[\"']image/avif[\"'])[^>]*>\s*\n?",
        "",
        text,
        flags=re.M,
    )


def remove_third_party_font_hints(text: str) -> str:
    text = re.sub(r"^[^\n]*https://fonts\.(?:googleapis|gstatic)\.com[^\n]*\n?", "", text, flags=re.M)
    return text


def defer_google_tag(text: str) -> str:
    pattern = re.compile(
        r"\s*(?:<!-- Google tag \(gtag\.js\) -->\s*)?"
        r"<script\s+async\s+src=[\"']https://www\.googletagmanager\.com/gtag/js\?id=G-JWZY2TVYFZ[\"']></script>\s*"
        r"<script>\s*"
        r"window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];\s*"
        r"function gtag\(\)\s*\{\s*dataLayer\.push\(arguments\);\s*\}\s*"
        r"gtag\([\"']js[\"'],\s*new Date\(\)\);\s*"
        r"gtag\([\"']config[\"'],\s*[\"']G-JWZY2TVYFZ[\"']\);\s*"
        r"</script>",
        flags=re.S,
    )
    return pattern.sub("\n" + GOOGLE_TAG_SNIPPET, text)


def strip_existing_security_meta(text: str) -> str:
    text = re.sub(
        rf"^[ \t]*<meta\s+id=[\"']{SECURITY_META_MARKER}[\"'][^>]*>\s*\n?",
        "",
        text,
        flags=re.M,
    )
    text = re.sub(
        r"^[ \t]*<meta\s+name=[\"']referrer[\"']\s+content=[\"']strict-origin-when-cross-origin[\"']\s*/?>\s*\n?",
        "",
        text,
        flags=re.M,
    )
    return text


def ensure_security_meta(text: str) -> str:
    text = strip_existing_security_meta(text)
    viewport_re = re.compile(r"(^\s*<meta\s+name=[\"']viewport[\"'][^>]*>\s*$)", re.M)
    match = viewport_re.search(text)
    if match:
        return text[:match.end()] + "\n" + SECURITY_META_SNIPPET + text[match.end():]
    head_re = re.compile(r"(<head>\s*)", re.I)
    return head_re.sub(lambda match: match.group(1) + SECURITY_META_SNIPPET + "\n", text, count=1)


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
    while remove_end < len(text) and text[remove_end] in " \t\r\n":
        remove_end += 1
    return text[:remove_start] + text[remove_end:]


def ensure_critical_loader(text: str) -> str:
    text = strip_existing_critical_loader(text)
    viewport_re = re.compile(r"(^\s*<meta\s+name=[\"']viewport[\"'][^>]*>\s*$)", re.M)
    match = viewport_re.search(text)
    if match:
        tail = re.sub(r"^(?:[ \t]*\r?\n)+", "", text[match.end():])
        return text[:match.end()] + "\n" + CRITICAL_LOADER_SNIPPET + tail
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
    protect_text = re.sub(
        r'assets/js/structured-data(?:\.min)?\.js\?v=[^"]+',
        f"assets/js/structured-data.min.js?v={STRUCTURED_DATA_VERSION}",
        protect_text,
    )
    protect_path.write_text(protect_text, encoding="utf-8")

    for rel in HTML_FILES:
        path = root / rel
        if path.exists():
            path.write_text(rewrite_html_refs(path.read_text(encoding="utf-8"), Path(rel)), encoding="utf-8")

    nested_html = []
    for directory in ("music", "photo", "post"):
        nested_html.extend((root / directory).glob("*.html"))

    for path in nested_html:
        path.write_text(rewrite_html_refs(path.read_text(encoding="utf-8"), path.relative_to(root)), encoding="utf-8")

    # Standalone noindex reading notes do not load the shared runtime that
    # releases the critical loader, so only refresh their versioned assets.
    for path in (root / "notes").glob("*.html"):
        path.write_text(rewrite_asset_refs(path.read_text(encoding="utf-8"), path.relative_to(root)), encoding="utf-8")

    print("Generated minified assets:")
    for item in generated:
        print(f"- {item}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
