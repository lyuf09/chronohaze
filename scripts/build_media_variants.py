#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from dataclasses import dataclass
from datetime import date
from pathlib import Path
import re
from typing import Dict, Iterable, List, Tuple

from PIL import Image


DEFAULT_WIDTHS = (960, 1600)
SOURCE_DIRS = ("assets/images/wix", "assets/template")
SOURCE_SUFFIXES = {".jpg", ".jpeg", ".png"}


@dataclass
class SourceImage:
    path: Path
    rel: str
    width: int
    height: int


def is_variant_path(path: Path) -> bool:
    numeric_suffix = re.search(r"-(\d{3,4})$", path.stem)
    if numeric_suffix:
        width_hint = int(numeric_suffix.group(1))
        if 320 <= width_hint <= 2400:
            return True
    return bool(path.stem.endswith("-960") or path.stem.endswith("-1600")) or any(
        path.name.endswith(f"-{w}.{ext}")
        for w in DEFAULT_WIDTHS
        for ext in ("jpg", "jpeg", "png", "webp", "avif")
    )


def variant_path_for(src: Path, width: int, ext: str) -> Path:
    return src.with_name(f"{src.stem}-{width}.{ext}")


def iter_source_images(root: Path) -> Iterable[Path]:
    for rel_dir in SOURCE_DIRS:
      base = root / rel_dir
      if not base.is_dir():
          continue
      for path in sorted(base.rglob("*")):
          if not path.is_file():
              continue
          if path.suffix.lower() not in SOURCE_SUFFIXES:
              continue
          if is_variant_path(path):
              continue
          yield path


def measure_source(path: Path) -> SourceImage:
    with Image.open(path) as im:
        return SourceImage(
            path=path,
            rel=path.as_posix(),
            width=int(im.width),
            height=int(im.height),
        )


def resize_for_width(im: Image.Image, width: int) -> Image.Image:
    if im.width <= width:
        return im.copy()
    ratio = width / float(im.width)
    height = max(1, int(round(im.height * ratio)))
    return im.resize((width, height), Image.Resampling.LANCZOS)


def save_webp_variant(src: Path, out: Path, width: int, quality: int) -> bool:
    out.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        mode = im.mode
        if mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "A" in mode else "RGB")
        variant = resize_for_width(im, width)
        variant.save(out, format="WEBP", quality=quality, method=6)
    return True


def save_jpg_variant(src: Path, out: Path, width: int, quality: int) -> bool:
    out.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        if im.mode not in ("RGB",):
            im = im.convert("RGB")
        variant = resize_for_width(im, width)
        variant.save(out, format="JPEG", quality=quality, optimize=True, progressive=True)
    return True


def save_avif_variant(avifenc_bin: str, src: Path, out: Path, width: int, quality: int) -> bool:
    # avifenc works from an input file; write a temp png in the output directory.
    tmp = out.with_suffix(".tmp.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        with Image.open(src) as im:
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGBA" if "A" in im.mode else "RGB")
            variant = resize_for_width(im, width)
            variant.save(tmp, format="PNG", optimize=True)
        speed = "6"
        cq = str(max(0, min(63, int(round((100 - quality) * 0.63)))))
        subprocess.run(
            [avifenc_bin, "--min", cq, "--max", cq, "--speed", speed, str(tmp), str(out)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True
    finally:
        if tmp.exists():
            tmp.unlink()


def maybe_generate_variant(
    kind: str,
    src: Path,
    width: int,
    out: Path,
    *,
    force: bool,
    quality_webp: int,
    quality_jpg: int,
    avifenc_bin: str | None,
) -> Tuple[bool, str]:
    if out.exists() and not force and out.stat().st_mtime >= src.stat().st_mtime:
        return False, "up-to-date"

    if kind == "webp":
        save_webp_variant(src, out, width, quality_webp)
        return True, "generated"
    if kind == "jpg":
        save_jpg_variant(src, out, width, quality_jpg)
        return True, "generated"
    if kind == "avif":
        if not avifenc_bin:
            return False, "avifenc-unavailable"
        save_avif_variant(avifenc_bin, src, out, width, quality_webp)
        return True, "generated"
    return False, "unsupported-kind"


def build_srcset(rel_paths: List[str]) -> str:
    pairs = []
    for rel in rel_paths:
        m = rel.rsplit("-", 1)
        if len(m) != 2:
            continue
        width_part = m[1].split(".", 1)[0]
        if not width_part.isdigit():
            continue
        pairs.append(f"{rel} {width_part}w")
    return ", ".join(pairs)


def normalize_rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def main() -> int:
    ap = argparse.ArgumentParser(description="Build responsive image variants and manifest for Chronohaze")
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--widths", default="960,1600", help="Comma-separated target widths (default: 960,1600)")
    ap.add_argument("--force", action="store_true", help="Regenerate variants even if up-to-date")
    ap.add_argument("--skip-jpg", action="store_true", help="Do not generate fallback JPG variants")
    ap.add_argument("--skip-webp", action="store_true", help="Do not generate WEBP variants")
    ap.add_argument("--skip-avif", action="store_true", help="Do not generate AVIF variants")
    ap.add_argument("--manifest-only", action="store_true", help="Do not write new variants, only scan and emit manifest")
    ap.add_argument("--quality-webp", type=int, default=88)
    ap.add_argument("--quality-jpg", type=int, default=84)
    args = ap.parse_args()

    root = args.root.resolve()
    widths = tuple(sorted({int(x) for x in str(args.widths).split(",") if str(x).strip().isdigit()}))
    if not widths:
        widths = DEFAULT_WIDTHS

    avifenc_bin = None if args.skip_avif else shutil.which("avifenc")
    generated_counts = {"webp": 0, "jpg": 0, "avif": 0}
    skipped_counts = {"webp": 0, "jpg": 0, "avif": 0}
    manifest_items: Dict[str, Dict[str, object]] = {}

    for src_path in iter_source_images(root):
        src = measure_source(src_path)
        entry: Dict[str, object] = {
            "original": {
                "width": src.width,
                "height": src.height,
            },
            "formats": {},
        }
        formats: Dict[str, object] = {}

        for kind in ("avif", "webp", "jpg"):
            if args.manifest_only:
                do_generate = False
            elif kind == "jpg" and args.skip_jpg:
                do_generate = False
            elif kind == "webp" and args.skip_webp:
                do_generate = False
            elif kind == "avif" and args.skip_avif:
                do_generate = False
            else:
                do_generate = True

            rels: List[str] = []
            for width in widths:
                out = variant_path_for(src.path, width, kind if kind != "jpg" else "jpg")
                if do_generate:
                    changed, reason = maybe_generate_variant(
                        kind,
                        src.path,
                        width,
                        out,
                        force=args.force,
                        quality_webp=args.quality_webp,
                        quality_jpg=args.quality_jpg,
                        avifenc_bin=avifenc_bin,
                    )
                    if changed:
                        generated_counts[kind] += 1
                    else:
                        skipped_counts[kind] += 1
                        if kind == "avif" and reason == "avifenc-unavailable":
                            pass
                if out.exists():
                    rels.append(normalize_rel(out, root))

            if rels:
                formats[kind] = {
                    "widths": [int(rel.rsplit("-", 1)[1].split(".", 1)[0]) for rel in rels],
                    "srcset": build_srcset(rels),
                    "files": rels,
                }

        entry["formats"] = formats
        manifest_items[normalize_rel(src.path, root)] = entry

    manifest = {
        "generated_at": date.today().isoformat(),
        "variant_widths": list(widths),
        "avif_encoder_available": bool(avifenc_bin),
        "items": manifest_items,
    }
    out_path = root / "assets" / "data" / "image-variants.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote manifest: {out_path} ({len(manifest_items)} images)")
    for kind in ("webp", "jpg", "avif"):
        print(f"{kind}: generated={generated_counts[kind]} skipped={skipped_counts[kind]}")
    if not avifenc_bin and not args.skip_avif:
        print("Note: AVIF variants not generated (avifenc not installed). Manifest still includes any pre-existing AVIF files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
