#!/usr/bin/python3
# Copyright © 2018, 2019, 2020, 2022 Tom Most <twm@freecog.net>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
# Additional permission under GNU GPL version 3 section 7
#
# If you modify this Program, or any covered work, by linking or
# combining it with OpenSSL (or a modified version of that library),
# containing parts covered by the terms of the OpenSSL License, the
# licensors of this Program grant you additional permission to convey
# the resulting work.  Corresponding Source for a non-source form of
# such a combination shall include the source code for the parts of
# OpenSSL used as well as that of the covered work.
"""
Compile static assets.

All files in the yarrharr/static/ directory conform to this naming convention:

    {prefix}-{version}.{ext}

Where:

- The combination of {prefix} and {ext} are unique.
- {version} is a string that changes every time the content of the file
  changes, usually a hash of the file content.

Pre-compressed versions of most static assets are automatically generated in
gzip (.gz) and Brotli (.br) formats. See `yarrharr.application.Static`, which
serves these files.

Temporary files are generated in the build/ directory.
"""

import argparse
import asyncio
import hashlib
import re
import shlex
from asyncio.subprocess import PIPE
from dataclasses import dataclass
from pathlib import Path
from shutil import rmtree
from typing import Optional, Sequence

import brotli
import zopfli.gzip

repo_root = Path(__file__).parent.parent

COMPRESS_EXTS = (".js", ".css", ".svg", ".ico", ".map", ".ttf")
_validName = re.compile(r"\A[a-zA-Z0-9]+-[a-z0-9]+(\.[a-z0-9]+)+\Z")

_parser = argparse.ArgumentParser()
_parser.add_argument("--out-dir", type=Path, default=repo_root / "yarrharr" / "static")
_parser.add_argument("--build-dir", type=Path, default=repo_root / "build")
_parser.add_argument("--no-compress", action="store_false", dest="compress")
_parser.add_argument("--compress", action="store_true", default=True)


def hashname(prefix: str, ext: str, content: bytes) -> str:
    """
    Generate a filename based on file content.
    """
    name = f"{prefix}-{hashlib.sha256(content).hexdigest()[:12]}.{ext}"
    assert _validName.match(name) is not None, f"{name=} isn't valid"
    return name


@dataclass
class WriteRecord:
    name: str
    base_size: int
    gz_size: Optional[int] = None
    br_size: Optional[int] = None


class Writer:
    def __init__(self, out_dir: Path, compress: bool) -> None:
        self._out_dir = out_dir
        self._compress = compress
        self._written = []

    def add_file_bytes(self, name: str, data: bytes) -> None:
        """
        Write a file to the static directory from an in-memory buffer.
        """
        assert _validName.match(name) is not None, f"{name=} isn't valid"

        path = self._out_dir / name
        path.write_bytes(data)

        if self._compress and name.endswith(COMPRESS_EXTS):
            gz_path = path.with_suffix(path.suffix + ".gz")
            gz = zopfli.gzip.compress(data)
            gz_path.write_bytes(gz)

            br_path = path.with_suffix(path.suffix + ".br")
            br = brotli.compress(data, quality=11)
            br_path.write_bytes(br)

            self._written.append(WriteRecord(name, len(data), len(gz), len(br)))
        else:
            self._written.append(WriteRecord(name, len(data)))

    def add_file(self, name: str, source: Path) -> None:
        """
        Copy a file to the static directory.
        """
        self.add_file_bytes(name, source.read_bytes())

    def summarize(self) -> str:
        lines = [
            "ORIGINAL   ZOPFLI    (.gz)  BROTLI   (.br)  FILE",
            "---------  ---------------  --------------  ------------------------------------------",
        ]

        def pct(size, total) -> str:
            if size is None:
                left = right = "-"
            elif total == 0:
                left = f"{size:,d}"
                right = "-"
            else:
                left = f"{size:,d}"
                right = f"{size / total:.0%}"
            return f"{left:>9} {right:>5}"

        for r in self._written:
            lines.append(
                " ".join(
                    [
                        f"{r.base_size:>9,d} ",
                        pct(r.gz_size, r.base_size),
                        pct(r.br_size, r.base_size),
                        f" {r.name}",
                    ]
                )
            )

        return "\n".join(lines)


async def _run(args: Sequence[str]) -> None:
    """
    Run a command. Raise an exception if it exits non-zero.
    """
    proc = await asyncio.create_subprocess_exec(*args)
    await proc.wait()
    if proc.returncode != 0:
        raise Exception(f"{' '.join(shlex.quote(a) for a in args)} exited {proc.returncode}")


async def scour_svg(svg: Path) -> bytes:
    """
    Run ``scour`` on an SVG file, returning the minified SVG.
    """
    proc = await asyncio.create_subprocess_exec(
        "/usr/bin/scour",
        "-i",
        str(svg),
        "--indent=none",
        "--enable-comment-stripping",
        "--enable-id-stripping",
        "--shorten-ids",
        stdout=PIPE,
        stderr=PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise Exception(f"scour exited {proc.returncode}: {stderr}")
    return stdout


async def rasterize_favicon(favicon: Path, build_dir: Path, w: Writer) -> None:
    """
    Use Inkscape to generate two raster versions of the favicon:

    - icon-[hexchars].png — a 152x152 PNG, optimized with optipng.
    - icon-[hexchars].ico — ICO with 16x16, 24x24, 32x32, and 64x64 versions.
      Built with icotool.
    """
    proc = await asyncio.create_subprocess_exec("inkscape", "--shell", stdin=PIPE, stdout=PIPE, stderr=PIPE)
    outfiles = []
    commands = []

    for size in (16, 24, 32, 64, 152):
        outfile = str(build_dir / f"{favicon.stem}.{size}.png")
        commands.append(f"{favicon} --export-png={outfile} -w {size} -h {size} --export-area-page\n".encode())
        outfiles.append(outfile)
    stdout, stderr = await proc.communicate(b"".join(commands))
    if proc.returncode != 0:
        raise Exception(f"inkscape exited {proc.returncode}: {stdout=} {stderr=}")

    png_path = Path(outfiles.pop())
    ico_path = build_dir / f"{favicon.stem}.ico"
    await asyncio.gather(
        _run(["optipng", "-quiet", str(png_path)]),
        _run(["icotool", "--create", "-o", str(ico_path), *outfiles]),
    )

    w.add_file(hashname("icon", "png", png_path.read_bytes()), png_path)
    w.add_file(hashname("icon", "ico", ico_path.read_bytes()), ico_path)


async def process_svg(svg: Path, w: Writer) -> None:
    """
    Minify the SVG and copy it to the output directory.
    """
    svg_bytes = await scour_svg(svg)
    w.add_file_bytes(hashname(svg.stem, "svg", svg_bytes), svg_bytes)


async def process_less(less: Path, build_dir: Path, w: Writer) -> None:
    """
    Convert .less to a CSS file and source map.
    """
    css_path = build_dir / f"{less.stem}.css"
    map_path = build_dir / f"{less.stem}.css.map"
    await _run(
        [
            "/usr/bin/node",
            "/usr/bin/lessc",
            "--no-js",
            "--strict-imports",
            f"--source-map={map_path}",
            str(less),
            str(css_path),
        ]
    )
    css = css_path.read_bytes()
    css_name = hashname(less.stem, "css", css)
    map_name = f"{css_name}.map"

    # We must change the source map reference on the last line when renaming
    # the file.
    last_line_index = css.rindex(b"\n") + 1
    last_line = css[last_line_index:]
    if not last_line.startswith(b"/*# sourceMappingURL="):
        raise Exception("Expected sourceMappingURL comment at the end of {css_path}, but found {last_line!r}")

    # ❤ copies
    css = css[:last_line_index] + f"/*# sourceMappingURL={map_name} */".encode()

    w.add_file_bytes(css_name, css)
    w.add_file(map_name, map_path)


async def process_glob(paths: Path, w: Writer) -> None:
    """
    Copy files to the output directory. They must match the naming convention.
    """
    for path in paths:
        if not path.is_file():
            raise Exception(f"{path} is not a file")
        w.add_file(path.name, path)


async def process_fonts(root_dir: Path, w: Writer) -> None:
    nr_base = root_dir / "vendor" / "newsreader"
    nr_normal = (nr_base / "Newsreader[opsz,wght].woff2").read_bytes()
    nr_normal_name = hashname("newsreader", "woff2", nr_normal)
    w.add_file_bytes(nr_normal_name, nr_normal)
    nr_italic = (nr_base / "Newsreader-Italic[opsz,wght].woff2").read_bytes()
    nr_italic_name = hashname("newsreaderi", "woff2", nr_italic)
    w.add_file_bytes(nr_italic_name, nr_italic)

    ic_base = root_dir / "vendor" / "inconsolata"
    ic_var = (ic_base / "Inconsolata-VF.ttf").read_bytes()
    ic_var_name = hashname("inconsolata", "ttf", ic_var)
    w.add_file_bytes(ic_var_name, ic_var)

    css = (
        f"""\
@font-face {{
  font-family: 'Newsreader';
  font-weight: 200 900;
  font-style: normal;
  font-stretch: normal;
  src: url('{nr_normal_name}') format('woff2');
}}

@font-face {{
  font-family: 'Newsreader';
  font-weight: 200 900;
  font-style: italic;
  font-stretch: normal;
  src: url('{nr_italic_name}') format('woff2');
}}

@font-face {{
  font-family: 'Inconsolata VF';
  font-weight: 200 900;
  font-style: normal;
  font-stretch: normal;
  src: url('{ic_var_name}');
}}
"""
    ).encode()
    w.add_file_bytes(hashname("fonts", "css", css), css)


async def _main(build_dir: Path, out_dir: Path, compress: bool) -> None:
    build_dir.mkdir(parents=True, exist_ok=True)
    if out_dir.exists():
        rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    w = Writer(out_dir, compress)

    icon = repo_root / "img" / "icon.svg"
    await asyncio.gather(
        process_svg(icon, w),
        rasterize_favicon(icon, build_dir, w),
        process_svg(repo_root / "img" / "lettertype.svg", w),
        process_svg(repo_root / "img" / "logotype.svg", w),
        process_glob((repo_root / "vendor" / "normalize.css").glob("normalize-*.css"), w),
        process_less(repo_root / "less" / "main.less", build_dir, w),
        process_fonts(repo_root, w),
    )
    print(w.summarize())


def main():
    args = _parser.parse_args()
    asyncio.run(_main(args.build_dir, args.out_dir, args.compress))


if __name__ == "__main__":
    main()
