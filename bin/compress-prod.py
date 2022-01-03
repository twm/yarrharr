#!/usr/bin/python3
# Copyright © 2018 Tom Most <twm@freecog.net>
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
Generate .gz and .br versions of the files in yarrharr/static
"""
from pathlib import Path

import brotli
import zopfli.gzip

static_dir = Path("yarrharr/static")
src_files = []
for pattern in ("*.js", "*.css", "*.svg", "*.ico", "*.map"):
    src_files.extend(static_dir.glob(pattern))
src_files.sort()

print("ORIGINAL   ZOPFLI    (.gz)  BROTLI   (.br)  FILE")
print(
    "---------  ---------------  --------------  ------------------------------------------"
)

for path in src_files:
    buf = path.read_bytes()

    gz_path = path.with_suffix(path.suffix + ".gz")
    gz = zopfli.gzip.compress(buf)
    gz_path.write_bytes(gz)

    br_path = path.with_suffix(path.suffix + ".br")
    br = brotli.compress(buf, quality=11)
    br_path.write_bytes(br)

    base_size = len(buf)
    gz_size = len(gz)
    gz_pct = gz_size / base_size
    br_size = len(br)
    br_pct = br_size / base_size
    print(
        "{base_size:>9,d}  {gz_size:>9,d} {gz_pct:>5.0%} {br_size:>9,d} {br_pct:>5.0%}  {path.name}".format_map(
            locals()
        )
    )
