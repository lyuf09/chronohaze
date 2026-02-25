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
OG_WIDTH = 1200
OG_HEIGHT = 630
OG_SIZE = (OG_WIDTH, OG_HEIGHT)

MATH_OG_DIR = "assets/og/math"
MUSIC_OG_DIR = "assets/og/music"

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

    if canonical_url and (force_hreflang or is_bilingual_page(str(page_path))):
        text = upsert_hreflang_block(text, canonical_url)

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
        if rel.name == "research-summary.html":
            continue
        targets.append(rel)
    for sub in ("music", "post", "photo"):
        for path in sorted((root / sub).glob("*.html")):
            targets.append(path)
    return targets


def build_cards_and_patch_heads(root: Path) -> None:
    math_catalog = load_json(root / "assets/data/math-catalog.json")
    music_detail_catalog = load_json(root / "assets/data/music-detail-catalog.json")
    palette_map = parse_music_palette_map(root / "protect-media.js")

    math_image_map: Dict[str, str] = {}
    for item in (math_catalog.get("items") or []):
        rel_url = str(item.get("url") or "").replace("\\", "/")
        if not rel_url.startswith("post/") or not rel_url.endswith(".html"):
            continue
        out_rel = f"{MATH_OG_DIR}/{Path(rel_url).stem}.png"
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

    # Patch page heads
    for page in collect_hreflang_targets(root):
        rel = str(page.relative_to(root)).replace("\\", "/")
        og_image = None
        if rel in math_image_map:
            og_image = math_image_map[rel]
        elif rel in music_image_map:
            og_image = music_image_map[rel]
        patch_page_head(page, og_image_url=og_image, force_hreflang=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate OG cards and patch social/head metadata.")
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    if not (root / "assets").exists():
        raise SystemExit(f"Invalid root: {root}")

    ensure_dir(root / MATH_OG_DIR)
    ensure_dir(root / MUSIC_OG_DIR)
    build_cards_and_patch_heads(root)


if __name__ == "__main__":
    main()
