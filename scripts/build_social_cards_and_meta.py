#!/usr/bin/env python3
from __future__ import annotations

import argparse
import colorsys
import hashlib
import json
import math
import re
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont


SITE_URL = "https://lyuf09.github.io/chronohaze"
FEED_URL = f"{SITE_URL}/feed.xml"
OG_WIDTH = 1200
OG_HEIGHT = 630
OG_SIZE = (OG_WIDTH, OG_HEIGHT)

MATH_OG_DIR = "assets/og/math"
MUSIC_OG_DIR = "assets/og/music"
SITE_OG_DIR = "assets/og/site"

FAVICON_VERSION = "4"

HREFLANG_MARKER_START = "<!-- GENERATED:hreflang:start -->"
HREFLANG_MARKER_END = "<!-- GENERATED:hreflang:end -->"

MATH_TEMPLATE_BG = (17, 22, 34)
MATH_PANEL_BG = (246, 248, 252, 236)
MATH_TEXT = (22, 27, 39)
MATH_MUTED = (97, 107, 128)

HEADLINE_FONT_CANDIDATES: List[Tuple[str, Optional[int]]] = [
    ("/System/Library/Fonts/PingFang.ttc", 0),
    ("/System/Library/Fonts/Supplemental/Songti.ttc", 0),
    ("/System/Library/Fonts/STHeiti Light.ttc", 0),
    ("/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc", 0),
    ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 0),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", None),
]
SANS_FONT_CANDIDATES: List[Tuple[str, Optional[int]]] = [
    ("/System/Library/Fonts/PingFang.ttc", 0),
    ("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", None),
    ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 0),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", None),
]
MONO_FONT_CANDIDATES: List[Tuple[str, Optional[int]]] = [
    ("/System/Library/Fonts/Supplemental/Menlo.ttc", 0),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", None),
]


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def load_font(candidates: Iterable[Tuple[str, Optional[int]]], size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for raw_path, index in candidates:
        p = Path(raw_path)
        if not p.exists():
            continue
        try:
            if index is None:
                return ImageFont.truetype(str(p), size=size)
            return ImageFont.truetype(str(p), size=size, index=index)
        except Exception:
            continue
    return ImageFont.load_default()


def rgb_from_hex(value: str) -> Tuple[int, int, int]:
    clean = (value or "").strip().lstrip("#")
    if len(clean) != 6:
        return (116, 127, 148)
    return tuple(int(clean[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def clamp(v: float, lo: float = 0, hi: float = 255) -> int:
    return int(max(lo, min(hi, round(v))))


def mix(a: Tuple[int, int, int], b: Tuple[int, int, int], t: float) -> Tuple[int, int, int]:
    return (
        clamp(a[0] + (b[0] - a[0]) * t),
        clamp(a[1] + (b[1] - a[1]) * t),
        clamp(a[2] + (b[2] - a[2]) * t),
    )


def adjust(rgb: Tuple[int, int, int], *, s_mul: float = 1.0, l_mul: float = 1.0) -> Tuple[int, int, int]:
    r, g, b = [c / 255.0 for c in rgb]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    s = max(0.0, min(1.0, s * s_mul))
    l = max(0.0, min(1.0, l * l_mul))
    rr, gg, bb = colorsys.hls_to_rgb(h, l, s)
    return (clamp(rr * 255), clamp(gg * 255), clamp(bb * 255))


def relative_url_to_absolute(rel_url: str) -> str:
    rel = str(rel_url or "").lstrip("/")
    return f"{SITE_URL}/{rel}"


def canonical_for_rel(rel_path: str) -> str:
    rel = rel_path.replace("\\", "/").lstrip("/")
    return f"{SITE_URL}/{rel}"


def is_bilingual_page(rel_path: str) -> bool:
    rel = rel_path.replace("\\", "/").lstrip("/")
    if rel == "research-summary.html":
        return False
    if "/" not in rel:
        return rel.endswith(".html")
    return rel.startswith(("music/", "post/", "photo/")) and rel.endswith(".html")


def build_hreflang_block(canonical_url: str) -> str:
    sep = "&" if "?" in canonical_url else "?"
    zh_url = f"{canonical_url}{sep}lang=zh"
    en_url = f"{canonical_url}{sep}lang=en"
    return "\n".join(
        [
            "  " + HREFLANG_MARKER_START,
            f'  <link rel="alternate" hreflang="zh-CN" href="{zh_url}" />',
            f'  <link rel="alternate" hreflang="en" href="{en_url}" />',
            f'  <link rel="alternate" hreflang="x-default" href="{canonical_url}" />',
            "  " + HREFLANG_MARKER_END,
        ]
    )


def upsert_hreflang_block(text: str, canonical_url: str) -> str:
    block = build_hreflang_block(canonical_url)
    if HREFLANG_MARKER_START in text and HREFLANG_MARKER_END in text:
        return re.sub(
            re.escape(HREFLANG_MARKER_START) + r".*?" + re.escape(HREFLANG_MARKER_END),
            block.strip(),
            text,
            flags=re.S,
        )

    canonical_re = re.compile(r'(^\s*<link rel="canonical" href="[^"]+" />\s*$)', re.M)
    match = canonical_re.search(text)
    if not match:
        return text
    insert_at = match.end()
    return text[:insert_at] + "\n" + block + text[insert_at:]


def upsert_feed_autodiscovery(text: str) -> str:
    feed_link = (
        f'  <link rel="alternate" type="application/rss+xml" '
        f'title="Chronohaze Notes Feed" href="{FEED_URL}" />'
    )
    pattern = re.compile(
        r'<link rel="alternate"\s+type="application/rss\+xml"\s+title="[^"]*"\s+href="[^"]+"\s*/>',
        re.I,
    )
    if pattern.search(text):
        return pattern.sub(feed_link.strip(), text, count=1)

    anchor_re = re.compile(
        r"(\s*<!-- GENERATED:hreflang:end -->\s*$|\s*<link rel=\"canonical\" href=\"[^\"]+\" />\s*$)",
        re.M,
    )
    match = anchor_re.search(text)
    if not match:
        return text
    insert_at = match.end()
    return text[:insert_at] + "\n" + feed_link + text[insert_at:]


def replace_meta_content(text: str, attr_name: str, attr_value: str, content: str) -> str:
    pattern = re.compile(
        rf'(<meta\s+{re.escape(attr_name)}="{re.escape(attr_value)}"\s+content=")([^"]*)("\s*/?>)',
        re.I,
    )
    if pattern.search(text):
        return pattern.sub(rf"\1{content}\3", text, count=1)
    return text


def patch_page_head(
    page_path: Path,
    *,
    root: Optional[Path] = None,
    og_image_url: Optional[str] = None,
    force_hreflang: bool = False,
) -> bool:
    original = page_path.read_text(encoding="utf-8")
    text = original

    canonical_m = re.search(r'<link rel="canonical" href="([^"]+)" />', text)
    canonical_url = canonical_m.group(1).strip() if canonical_m else ""

    if og_image_url:
        text = replace_meta_content(text, "property", "og:image", og_image_url)
        text = replace_meta_content(text, "name", "twitter:image", og_image_url)

    if root is not None:
        try:
            rel_page = page_path.relative_to(root)
            depth = max(0, len(rel_page.parts) - 1)
            prefix = "../" * depth
            favicon_href = f"{prefix}assets/favicon.ico?v={FAVICON_VERSION}"
            apple_href = f"{prefix}assets/apple-touch-icon.png?v={FAVICON_VERSION}"
            text = re.sub(
                r'(<link\b[^>]*rel=["\']icon["\'][^>]*href=["\'])([^"\']*)(["\'][^>]*>)',
                rf"\1{favicon_href}\3",
                text,
                count=1,
                flags=re.I,
            )
            text = re.sub(
                r'(<link\b[^>]*rel=["\']apple-touch-icon["\'][^>]*href=["\'])([^"\']*)(["\'][^>]*>)',
                rf"\1{apple_href}\3",
                text,
                count=1,
                flags=re.I,
            )
        except ValueError:
            pass

    if canonical_url and (force_hreflang or is_bilingual_page(str(page_path))):
        text = upsert_hreflang_block(text, canonical_url)
    if canonical_url:
        text = upsert_feed_autodiscovery(text)

    if text != original:
        page_path.write_text(text, encoding="utf-8")
        return True
    return False


def parse_music_palette_map(js_path: Path) -> Dict[str, str]:
    text = js_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r'if\s*\(detailPath === "(music/[^"]+)"\)\s*\{\s*article\.dataset\.lyricsPaletteBg = "(#[0-9a-fA-F]{6})";',
        re.S,
    )
    return {path: color.lower() for path, color in pattern.findall(text)}


def hash_color_seed(text: str) -> Tuple[int, int, int]:
    digest = hashlib.md5(text.encode("utf-8")).digest()
    h = digest[0] / 255.0
    s = 0.40 + (digest[1] / 255.0) * 0.25
    l = 0.38 + (digest[2] / 255.0) * 0.18
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return (clamp(r * 255), clamp(g * 255), clamp(b * 255))


def luminance(rgb: Tuple[int, int, int]) -> float:
    r, g, b = [c / 255.0 for c in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def choose_text_color(bg: Tuple[int, int, int]) -> Tuple[int, int, int]:
    return (245, 248, 252) if luminance(bg) < 0.52 else (34, 38, 48)


def draw_radial_glow(base: Image.Image, center: Tuple[int, int], radius: int, color: Tuple[int, int, int], alpha: int) -> None:
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    x, y = center
    d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*color, alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(8, radius // 2)))
    base.alpha_composite(glow)


def draw_noise_dots(draw: ImageDraw.ImageDraw, seed_text: str, color: Tuple[int, int, int], count: int = 48) -> None:
    seed = hashlib.sha1(seed_text.encode("utf-8")).digest()
    for i in range(count):
        a = seed[i % len(seed)]
        b = seed[(i + 7) % len(seed)]
        c = seed[(i + 13) % len(seed)]
        x = (a / 255.0) * OG_WIDTH
        y = (b / 255.0) * OG_HEIGHT
        r = 1 + (c % 4)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(*color, 18))


def fit_text_lines(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
    max_lines: int,
) -> List[str]:
    compact = re.sub(r"\s+", " ", str(text or "").strip())
    if not compact:
        return []
    lines: List[str] = []
    current = ""
    for ch in compact:
        test = current + ch
        bbox = draw.textbbox((0, 0), test, font=font)
        width = bbox[2] - bbox[0]
        if current and width > max_width:
            lines.append(current.rstrip())
            current = ch.lstrip()
            if len(lines) >= max_lines:
                break
        else:
            current = test
    if len(lines) < max_lines and current:
        lines.append(current.rstrip())
    if len(lines) > max_lines:
        lines = lines[:max_lines]
    if len(lines) == max_lines and compact and "".join(lines).strip() != compact.strip():
        last = lines[-1].rstrip(" .，。;；、")
        ellipsis = "…"
        while last:
            bbox = draw.textbbox((0, 0), last + ellipsis, font=font)
            if (bbox[2] - bbox[0]) <= max_width:
                break
            last = last[:-1]
        lines[-1] = (last + ellipsis) if last else ellipsis
    return lines


def draw_text_lines(
    draw: ImageDraw.ImageDraw,
    lines: List[str],
    *,
    x: int,
    y: int,
    font: ImageFont.ImageFont,
    fill: Tuple[int, int, int, int],
    line_gap: int,
) -> int:
    cursor_y = y
    for line in lines:
        draw.text((x, cursor_y), line, font=font, fill=fill)
        bbox = draw.textbbox((x, cursor_y), line, font=font)
        cursor_y += (bbox[3] - bbox[1]) + line_gap
    return cursor_y


def render_math_card_image(item: dict, out_path: Path) -> None:
    img = Image.new("RGBA", OG_SIZE, (*MATH_TEMPLATE_BG, 255))
    draw = ImageDraw.Draw(img, "RGBA")

    # Background glows and geometric traces
    draw_radial_glow(img, (210, 130), 220, (70, 112, 205), 140)
    draw_radial_glow(img, (980, 520), 260, (191, 77, 91), 120)
    draw_radial_glow(img, (880, 130), 180, (124, 158, 230), 55)

    for i in range(0, OG_WIDTH, 70):
        alpha = 24 if i % 140 == 0 else 10
        draw.line((i, 0, i, OG_HEIGHT), fill=(220, 228, 246, alpha), width=1)
    for j in range(0, OG_HEIGHT, 70):
        alpha = 18 if j % 140 == 0 else 8
        draw.line((0, j, OG_WIDTH, j), fill=(220, 228, 246, alpha), width=1)

    # Soft white panel
    panel_xy = (56, 58, OG_WIDTH - 56, OG_HEIGHT - 58)
    panel = Image.new("RGBA", OG_SIZE, (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel, "RGBA")
    pd.rounded_rectangle(panel_xy, radius=28, fill=MATH_PANEL_BG, outline=(255, 255, 255, 70), width=2)
    img.alpha_composite(panel)

    draw = ImageDraw.Draw(img, "RGBA")
    draw_noise_dots(draw, str(item.get("title") or ""), (34, 46, 78))

    title_font = load_font(HEADLINE_FONT_CANDIDATES, 58)
    body_font = load_font(SANS_FONT_CANDIDATES, 28)
    meta_font = load_font(MONO_FONT_CANDIDATES, 20)
    label_font = load_font(SANS_FONT_CANDIDATES, 22)

    draw.rounded_rectangle((86, 92, 314, 132), radius=18, fill=(36, 52, 88, 228))
    draw.text((104, 101), "CHRONOHAZE · MATH", font=label_font, fill=(240, 246, 255, 255))

    title_lines = fit_text_lines(draw, item.get("title") or "", title_font, max_width=940, max_lines=4)
    y = draw_text_lines(
        draw,
        title_lines,
        x=90,
        y=166,
        font=title_font,
        fill=(*MATH_TEXT, 255),
        line_gap=8,
    )

    excerpt = item.get("excerpt") or ""
    excerpt_lines = fit_text_lines(draw, excerpt, body_font, max_width=910, max_lines=4)
    y = draw_text_lines(
        draw,
        excerpt_lines,
        x=92,
        y=y + 14,
        font=body_font,
        fill=(*MATH_MUTED, 255),
        line_gap=6,
    )

    # Bottom metadata rail
    rail_y = OG_HEIGHT - 98
    draw.line((90, rail_y, OG_WIDTH - 90, rail_y), fill=(163, 176, 204, 110), width=2)
    date_text = str(item.get("date") or "")
    slug_text = str(Path(str(item.get("url") or "")).stem)
    draw.text((92, rail_y + 16), date_text, font=meta_font, fill=(*MATH_MUTED, 255))
    slug_bbox = draw.textbbox((0, 0), slug_text, font=meta_font)
    slug_w = slug_bbox[2] - slug_bbox[0]
    draw.text((OG_WIDTH - 92 - slug_w, rail_y + 16), slug_text, font=meta_font, fill=(79, 91, 118, 255))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, format="PNG", optimize=True)


def render_music_card_image(item: dict, out_path: Path, palette_hex: str) -> None:
    base = rgb_from_hex(palette_hex)
    deep = adjust(base, s_mul=0.8, l_mul=0.38)
    mid = adjust(base, s_mul=0.95, l_mul=0.78)
    accent = adjust(base, s_mul=1.05, l_mul=1.25)
    text_rgb = choose_text_color(deep)
    muted_rgb = mix(text_rgb, mid if luminance(mid) < 0.65 else deep, 0.55)

    img = Image.new("RGBA", OG_SIZE, (*deep, 255))
    draw = ImageDraw.Draw(img, "RGBA")

    # Gradient bands
    for x in range(OG_WIDTH):
        t = x / max(1, OG_WIDTH - 1)
        c = mix(deep, mid, t * 0.92)
        draw.line((x, 0, x, OG_HEIGHT), fill=(*c, 255), width=1)

    draw_radial_glow(img, (OG_WIDTH - 170, 126), 250, accent, 120)
    draw_radial_glow(img, (220, OG_HEIGHT - 130), 210, mix(accent, (255, 255, 255), 0.15), 90)
    draw_radial_glow(img, (640, 440), 180, mix(base, (255, 255, 255), 0.2), 48)

    draw = ImageDraw.Draw(img, "RGBA")
    draw_noise_dots(draw, str(item.get("url") or ""), mix(text_rgb, base, 0.25), count=60)

    # Soft panel
    panel = Image.new("RGBA", OG_SIZE, (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel, "RGBA")
    panel_fill = (*mix(deep, (255, 255, 255), 0.08), 170)
    panel_outline = (*mix(text_rgb, base, 0.5), 90)
    pd.rounded_rectangle((58, 58, OG_WIDTH - 58, OG_HEIGHT - 58), radius=28, fill=panel_fill, outline=panel_outline, width=2)
    img.alpha_composite(panel)

    draw = ImageDraw.Draw(img, "RGBA")
    title_font = load_font(HEADLINE_FONT_CANDIDATES, 62)
    body_font = load_font(SANS_FONT_CANDIDATES, 26)
    small_font = load_font(SANS_FONT_CANDIDATES, 22)
    mono_font = load_font(MONO_FONT_CANDIDATES, 20)

    label_text = "CHRONOHAZE · MUSIC"
    label_box_w = 268
    draw.rounded_rectangle((86, 92, 86 + label_box_w, 132), radius=18, fill=(*mix(deep, text_rgb, 0.05), 210))
    draw.text((102, 101), label_text, font=small_font, fill=(*mix(text_rgb, (255, 255, 255), 0.08), 255))

    title_lines = fit_text_lines(draw, item.get("title_clean") or item.get("title_raw") or "", title_font, max_width=940, max_lines=4)
    y = draw_text_lines(
        draw,
        title_lines,
        x=90,
        y=165,
        font=title_font,
        fill=(*text_rgb, 255),
        line_gap=8,
    )

    sub_lines_raw: List[str] = []
    if item.get("subtitle"):
        sub_lines_raw.append(str(item.get("subtitle")))
    if item.get("creation_period"):
        sub_lines_raw.append(f"Creation period · {item.get('creation_period')}")
    status_text = str(item.get("status") or "available").replace("_", " ").title()
    sub_lines_raw.append(f"Status · {status_text}")
    sub_lines = fit_text_lines(draw, "  ·  ".join(sub_lines_raw), body_font, max_width=920, max_lines=2)
    y = draw_text_lines(
        draw,
        sub_lines,
        x=92,
        y=y + 14,
        font=body_font,
        fill=(*muted_rgb, 255),
        line_gap=6,
    )

    excerpt = str(item.get("description_excerpt") or "")
    if excerpt:
        excerpt_lines = fit_text_lines(draw, excerpt, small_font, max_width=920, max_lines=4)
        y = draw_text_lines(
            draw,
            excerpt_lines,
            x=92,
            y=y + 18,
            font=small_font,
            fill=(*mix(text_rgb, muted_rgb, 0.35), 240),
            line_gap=5,
        )

    # footer rail
    rail_y = OG_HEIGHT - 100
    draw.line((90, rail_y, OG_WIDTH - 90, rail_y), fill=(*mix(text_rgb, base, 0.45), 90), width=2)
    slug_text = Path(str(item.get("url") or "")).stem
    artist_text = "HazezZ"
    draw.text((92, rail_y + 16), artist_text, font=mono_font, fill=(*mix(text_rgb, base, 0.2), 255))
    slug_bbox = draw.textbbox((0, 0), slug_text, font=mono_font)
    draw.text((OG_WIDTH - 92 - (slug_bbox[2] - slug_bbox[0]), rail_y + 16), slug_text, font=mono_font, fill=(*mix(text_rgb, base, 0.35), 255))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, format="PNG", optimize=True)


def collect_hreflang_targets(root: Path) -> List[Path]:
    targets: List[Path] = []
    for rel in sorted(root.glob("*.html")):
        targets.append(rel)
    for sub in ("music", "post", "photo"):
        for path in sorted((root / sub).glob("*.html")):
            targets.append(path)
    return targets


def extract_meta(text: str, attr_name: str, attr_value: str) -> str:
    m = re.search(
        rf'<meta\s+{re.escape(attr_name)}="{re.escape(attr_value)}"\s+content="([^"]*)"\s*/?>',
        text,
        flags=re.I,
    )
    return m.group(1).strip() if m else ""


def extract_title_and_description(page_path: Path) -> Tuple[str, str]:
    text = page_path.read_text(encoding="utf-8")
    title = ""
    m = re.search(r"<title>(.*?)</title>", text, flags=re.I | re.S)
    if m:
        title = re.sub(r"\s+", " ", m.group(1)).strip()
    og_title = extract_meta(text, "property", "og:title")
    if og_title:
        title = og_title
    desc = extract_meta(text, "property", "og:description") or extract_meta(text, "name", "description")
    desc = re.sub(r"\s+", " ", desc).strip()
    return title, desc


def site_card_config_for(rel: str) -> Tuple[str, Tuple[int, int, int], Tuple[int, int, int]]:
    rel = rel.replace("\\", "/")
    label = "CHRONOHAZE"
    base = (27, 34, 50)
    accent = (109, 129, 161)
    if rel == "index.html":
        label, base, accent = "CHRONOHAZE · HOME", (24, 30, 44), (113, 132, 164)
    elif rel == "math.html" or rel.startswith("post/"):
        label, base, accent = "CHRONOHAZE · MATH", (20, 26, 42), (86, 116, 190)
    elif rel == "yin-le.html":
        label, base, accent = "CHRONOHAZE · MUSIC", (30, 24, 34), (138, 112, 164)
    elif rel.startswith("music/album-"):
        label, base, accent = "CHRONOHAZE · ALBUM", (28, 24, 33), (152, 118, 170)
    elif rel.startswith("music/"):
        label, base, accent = "CHRONOHAZE · TRACK", (30, 24, 34), (138, 112, 164)
    elif rel == "portfolio-1.html" or rel.startswith("photo/"):
        label, base, accent = "CHRONOHAZE · PHOTO", (22, 31, 30), (104, 138, 143)
    elif rel == "research.html" or rel == "research-summary.html":
        label, base, accent = "CHRONOHAZE · RESEARCH", (21, 27, 40), (95, 123, 174)
    elif rel == "cv.html":
        label, base, accent = "CHRONOHAZE · CV", (30, 31, 38), (126, 137, 157)
    elif rel == "search.html":
        label, base, accent = "CHRONOHAZE · SEARCH", (25, 31, 40), (96, 124, 166)
    return label, base, accent


def render_site_card_image(
    rel: str,
    title: str,
    desc: str,
    out_path: Path,
    *,
    label_override: str | None = None,
    base_override: Tuple[int, int, int] | None = None,
    accent_override: Tuple[int, int, int] | None = None,
) -> None:
    label, base, accent = site_card_config_for(rel)
    if label_override is not None:
        label = label_override
    if base_override is not None:
        base = base_override
    if accent_override is not None:
        accent = accent_override
    deep = adjust(base, s_mul=0.9, l_mul=0.82)
    dark = adjust(base, s_mul=0.9, l_mul=0.45)
    text_rgb = (240, 244, 250)
    muted_rgb = mix(text_rgb, accent, 0.6)

    img = Image.new("RGBA", OG_SIZE, (*dark, 255))
    draw = ImageDraw.Draw(img, "RGBA")
    for x in range(OG_WIDTH):
        t = x / max(1, OG_WIDTH - 1)
        c = mix(dark, deep, t * 0.8)
        draw.line((x, 0, x, OG_HEIGHT), fill=(*c, 255), width=1)

    draw_radial_glow(img, (OG_WIDTH - 140, 110), 240, accent, 110)
    draw_radial_glow(img, (180, OG_HEIGHT - 120), 220, mix(accent, (255, 255, 255), 0.16), 90)
    draw = ImageDraw.Draw(img, "RGBA")

    for i in range(0, OG_WIDTH, 68):
        alpha = 18 if i % 136 == 0 else 8
        draw.line((i, 0, i, OG_HEIGHT), fill=(230, 236, 248, alpha), width=1)
    for j in range(0, OG_HEIGHT, 68):
        alpha = 16 if j % 136 == 0 else 7
        draw.line((0, j, OG_WIDTH, j), fill=(230, 236, 248, alpha), width=1)

    panel = Image.new("RGBA", OG_SIZE, (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel, "RGBA")
    pd.rounded_rectangle(
        (58, 58, OG_WIDTH - 58, OG_HEIGHT - 58),
        radius=30,
        fill=(246, 248, 252, 232),
        outline=(255, 255, 255, 72),
        width=2,
    )
    img.alpha_composite(panel)
    draw = ImageDraw.Draw(img, "RGBA")
    draw_noise_dots(draw, rel + title, (36, 48, 78), count=44)

    title_font = load_font(HEADLINE_FONT_CANDIDATES, 54)
    body_font = load_font(SANS_FONT_CANDIDATES, 24)
    label_font = load_font(SANS_FONT_CANDIDATES, 20)
    meta_font = load_font(MONO_FONT_CANDIDATES, 18)

    draw.rounded_rectangle((86, 90, 322, 132), radius=18, fill=(*mix(accent, dark, 0.35), 225))
    draw.text((102, 99), label, font=label_font, fill=(242, 246, 252, 255))

    clean_title = re.sub(r"\s+", " ", title or "").strip() or "Chronohaze"
    title_lines = fit_text_lines(draw, clean_title, title_font, max_width=930, max_lines=4)
    y = draw_text_lines(draw, title_lines, x=90, y=170, font=title_font, fill=(24, 29, 40, 255), line_gap=7)

    clean_desc = re.sub(r"\s+", " ", desc or "").strip()
    if clean_desc:
        desc_lines = fit_text_lines(draw, clean_desc, body_font, max_width=920, max_lines=4)
        y = draw_text_lines(
            draw,
            desc_lines,
            x=92,
            y=y + 16,
            font=body_font,
            fill=(89, 99, 120, 255),
            line_gap=5,
        )

    rail_y = OG_HEIGHT - 96
    draw.line((90, rail_y, OG_WIDTH - 90, rail_y), fill=(154, 168, 195, 100), width=2)
    draw.text((92, rail_y + 14), "chronohaze.space", font=meta_font, fill=(*muted_rgb, 255))
    slug_text = Path(rel).stem
    slug_bbox = draw.textbbox((0, 0), slug_text, font=meta_font)
    draw.text((OG_WIDTH - 92 - (slug_bbox[2] - slug_bbox[0]), rail_y + 14), slug_text, font=meta_font, fill=(92, 103, 129, 255))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, format="PNG", optimize=True)


def render_favicon_set(root: Path) -> None:
    logo_path = root / "assets/logo.png"
    if not logo_path.exists():
        return
    logo = Image.open(logo_path).convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    bg = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bg, "RGBA")

    for y in range(512):
        t = y / 511.0
        c = mix((36, 46, 70), (26, 32, 46), t)
        bd.line((0, y, 512, y), fill=(*c, 255), width=1)
    bd.ellipse((22, 22, 490, 490), fill=(0, 0, 0, 0), outline=(240, 246, 255, 38), width=2)
    glow = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    gd.ellipse((60, 64, 452, 456), fill=(160, 182, 224, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(48))
    bg.alpha_composite(glow)
    canvas.alpha_composite(bg)

    # subtle grain
    gd = ImageDraw.Draw(canvas, "RGBA")
    draw_noise_dots(gd, "favicon", (245, 248, 253), count=80)

    target_w = 360
    ratio = target_w / max(1, logo.width)
    target_h = max(1, int(round(logo.height * ratio)))
    logo_resized = logo.resize((target_w, target_h), resample=Image.LANCZOS)
    x = (512 - target_w) // 2
    y = (512 - target_h) // 2 - 6

    # strengthen white logo for tiny sizes
    alpha = logo_resized.getchannel("A")
    strengthened = Image.new("RGBA", logo_resized.size, (245, 248, 253, 255))
    strengthened.putalpha(alpha)
    shadow = Image.new("RGBA", logo_resized.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow, "RGBA")
    sd.rectangle((0, 0, logo_resized.size[0], logo_resized.size[1]), fill=(0, 0, 0, 0))
    shadow = strengthened.filter(ImageFilter.GaussianBlur(1))
    canvas.alpha_composite(shadow, (x, y))
    canvas.alpha_composite(strengthened, (x, y))

    canvas.convert("RGB").save(root / "assets/favicon-32.png", format="PNG", optimize=True, compress_level=9)
    canvas.resize((180, 180), Image.LANCZOS).convert("RGB").save(
        root / "assets/apple-touch-icon.png", format="PNG", optimize=True, compress_level=9
    )
    canvas.resize((32, 32), Image.LANCZOS).convert("RGBA").save(root / "assets/favicon-32.png", format="PNG", optimize=True)
    canvas.resize((16, 16), Image.LANCZOS).convert("RGBA").save(root / "assets/favicon-16.png", format="PNG", optimize=True)
    ico_base = canvas.convert("RGBA")
    ico_base.save(root / "assets/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])


def build_cards_and_patch_heads(root: Path) -> None:
    math_catalog = load_json(root / "assets/data/math-catalog.json")
    music_detail_catalog = load_json(root / "assets/data/music-detail-catalog.json")
    palette_map = parse_music_palette_map(root / "protect-media.js")
    render_favicon_set(root)

    math_image_map: Dict[str, str] = {}
    for item in (math_catalog.get("items") or []):
        rel_url = str(item.get("url") or "").replace("\\", "/")
        if not rel_url.startswith("post/") or not rel_url.endswith(".html"):
            continue
        out_rel = f"{MATH_OG_DIR}/{Path(rel_url).stem}.png"
        if rel_url == "post/theorem-to-framework-isabelle-submodular.html":
            render_site_card_image(
                rel_url,
                str(item.get("title_en") or item.get("title") or ""),
                str(item.get("excerpt_en") or item.get("excerpt") or ""),
                root / out_rel,
                label_override="CHRONOHAZE · RESEARCH",
                base_override=(21, 27, 40),
                accent_override=(95, 123, 174),
            )
        else:
            render_math_card_image(item, root / out_rel)
        math_image_map[rel_url] = relative_url_to_absolute(out_rel)

    music_image_map: Dict[str, str] = {}
    for item in (music_detail_catalog.get("items") or []):
        rel_url = str(item.get("url") or "").replace("\\", "/")
        if not rel_url.startswith("music/") or not rel_url.endswith(".html"):
            continue
        out_rel = f"{MUSIC_OG_DIR}/{Path(rel_url).stem}.png"
        palette_hex = palette_map.get(rel_url, None) or "#{:02x}{:02x}{:02x}".format(*hash_color_seed(rel_url))
        render_music_card_image(item, root / out_rel, palette_hex)
        music_image_map[rel_url] = relative_url_to_absolute(out_rel)

    site_image_map: Dict[str, str] = {}
    for page in collect_hreflang_targets(root):
        rel = str(page.relative_to(root)).replace("\\", "/")
        if rel in math_image_map or rel in music_image_map:
            continue
        if rel in ("policy.html", "accessibility.html", "blank.html", "blank-1.html"):
            continue
        title, desc = extract_title_and_description(page)
        out_rel = f"{SITE_OG_DIR}/{Path(rel).stem}.png"
        render_site_card_image(rel, title, desc, root / out_rel)
        site_image_map[rel] = relative_url_to_absolute(out_rel)

    # Patch page heads
    for page in collect_hreflang_targets(root):
        rel = str(page.relative_to(root)).replace("\\", "/")
        og_image = None
        if rel in math_image_map:
            og_image = math_image_map[rel]
        elif rel in music_image_map:
            og_image = music_image_map[rel]
        elif rel in site_image_map:
            og_image = site_image_map[rel]
        patch_page_head(page, root=root, og_image_url=og_image, force_hreflang=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate OG cards and patch social/head metadata.")
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    if not (root / "assets").exists():
        raise SystemExit(f"Invalid root: {root}")

    ensure_dir(root / MATH_OG_DIR)
    ensure_dir(root / MUSIC_OG_DIR)
    ensure_dir(root / SITE_OG_DIR)
    build_cards_and_patch_heads(root)


if __name__ == "__main__":
    main()
