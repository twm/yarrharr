#!/bin/bash
# Generate raster and optimized versions of the Yarrharr icon.
# Copyright 2013 Tom Most <twm@freecog.net>; GPLv3+
#
# Packages required:
#
#  * inkscape
#  * icoutils
#  * python-scour
#  * optipng

set -xe

cd "$(dirname $0)/.."

DEST_DIR=yarrharr/static/
# Relative to $DEST_DIR
SOURCE_FILE=../../assets/icon.inkscape.svg

make_png() {
    local size="$1"
    local filename="$2"
    inkscape -f "$SOURCE_FILE" --export-png="$filename" \
        -w "$size" -h "$size" --export-area-page
    optipng "$filename"
}

make_svg() {
    local svg_filename="$1"
    scour -i "$SOURCE_FILE" -o "$svg_filename" \
        --indent=none --enable-comment-stripping \
        --enable-id-stripping --shorten-ids
}

pushd "$DEST_DIR"

# Generate a clean SVG (minus Inkscape cruft).  I pine for sizes="any"
# support...
make_svg icon.svg

# PNG raster icons in all the standard sizes.
make_png 16 icon.16.png
make_png 24 icon.24.png
make_png 32 icon.32.png
make_png 48 icon.48.png
make_png 64 icon.64.png

# Generate a .ico to be used as a favicon.  .ico has the best browser support
# of any format (notably, IE doesn't support anything else).
icotool --create -o icon.ico icon.16.png icon.24.png icon.32.png icon.64.png

# Firefox OS wants a 60x60 PNG.
make_png 60 icon.fxos.png

# Android and iOS are crazy (see <http://mathiasbynens.be/notes/touch-icons>).
# Just generate one big 152x152 icon for both; it simply isn't worth the HTML
# clutter to generate one of each size and link to them.  This should also work
# for Opera and Chrome's speed dial features.
make_png 152 icon.touch.png
