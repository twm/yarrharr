#!/usr/bin/python3
# Copyright © 2018, 2019, 2020, 2022 Tom Most <twm@freecog.net>
"""
This script optimizes SVG files with scour and uses Inkscape to
generate two raster versions of the favicon:

  * icon-[hexchars].png — a 152x152 PNG, optimized with optipng.
  * icon-[hexchars].ico — ICO with 16x16, 24x24, 32x32, and 64x64 versions.
    Built with icotool.

The aforementioned CLI tools must be installed and on the PATH so that this
script can invoke them.

Temporary files are generated in the build/ directory.
"""

import asyncio
import argparse
import hashlib
import shlex
from shutil import copyfile
from typing import Sequence
from asyncio.subprocess import PIPE
from pathlib import Path

repo_root = Path(__file__).parent.parent

_parser = argparse.ArgumentParser()
_parser.add_argument("--img-dir", type=Path, default=repo_root / "img")
_parser.add_argument("--out-dir", type=Path, default=repo_root / "yarrharr" / "static")
_parser.add_argument("--build-dir", type=Path, default=repo_root / "build")


async def scour_svg(svg: Path) -> bytes:
    proc = await asyncio.create_subprocess_exec(
        "/usr/bin/scour",
        "-i",
        str(svg),
        "--indent=none",
        "--enable-comment-stripping",
        "--enable-id-stripping",
        "--shorten-ids",
        stdout=PIPE,
    )
    stdout, _ = await proc.communicate()
    if proc.returncode != 0:
        raise Exception(f"scour exited {proc.returncode}")
    return stdout


async def _run(args: Sequence[str]) -> None:
    proc = await asyncio.create_subprocess_exec(*args)
    await proc.wait()
    if proc.returncode != 0:
        raise Exception(f"{' '.join(shlex.quote(a) for a in args)} exited {proc.returncode}")


async def rasterize_favicon(favicon: Path, build_dir: Path, out_dir: Path) -> None:
    proc = await asyncio.create_subprocess_exec("inkscape", "--shell", stdin=PIPE)
    outfiles = []
    commands = []

    for size in (16, 24, 32, 64, 152):
        outfile = str(build_dir / f"{favicon.stem}.{size}.png")
        commands.append(f"{favicon} --export-png={outfile} -w {size} -h {size} --export-area-page\n".encode())
        outfiles.append(outfile)
    await proc.communicate(b"".join(commands))
    if proc.returncode != 0:
        raise Exception(f"inkscape exited {proc.returncode}")

    png_path = Path(outfiles.pop())
    ico_path = build_dir / f"{favicon.stem}.ico"
    await asyncio.gather(
        _run(["optipng", "-quiet", str(png_path)]),
        _run(["icotool", "--create", "-o", str(ico_path), *outfiles]),
    )

    copyfile(png_path, out_dir / hashname("icon", "png", png_path.read_bytes()))
    copyfile(ico_path, out_dir / hashname("icon", "ico", ico_path.read_bytes()))


def hashname(prefix: str, ext: str, content: bytes) -> str:
    return f"{prefix}-{hashlib.sha256(content).hexdigest()[:12]}.{ext}"


async def process_svg(svg: Path, out_dir: Path) -> None:
    svg_bytes = await scour_svg(svg)
    (out_dir / hashname(svg.stem, "svg", svg_bytes)).write_bytes(svg_bytes)


async def _main(img_dir: Path, build_dir: Path, out_dir: Path) -> None:
    build_dir.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)

    icon = img_dir / "icon.svg"
    await asyncio.gather(
        process_svg(img_dir / "lettertype.svg", out_dir),
        process_svg(img_dir / "logotype.svg", out_dir),
        process_svg(icon, out_dir),
        rasterize_favicon(icon, build_dir, out_dir),
    )


def main():
    args = _parser.parse_args()
    asyncio.run(_main(args.img_dir, args.build_dir, args.out_dir))


if __name__ == "__main__":
    main()
