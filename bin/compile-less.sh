#!/bin/bash
set -exu -o pipefail

tmpdir="$(mktemp -d)"
DESTDIR="yarrharr/static"

# Random, unpredictable filename that should be safe to sed within a text file.
css="main-$(uuidgen).css"
map="${css}.map"

lessc \
    --no-ie-compat \
    --no-js \
    --strict-imports \
    --strict-math=on \
    --verbose \
    --source-map="$tmpdir/$map" \
    --source-map-url="$map" \
    assets/base.less \
    "$tmpdir/$css"

hash=$(sha256sum -b - < "$tmpdir/$css" | head -c 16)

css_hashed="main-${hash}.css"
map_hashed="${css_hashed}.map"


if ! mkdir "$DESTDIR"
then
    rm -fv "$DESTDIR"/main-*.css{,.map}
fi

# Transform the source mapping URL to include the hash.
sed "s,${map},${map_hashed}," "$tmpdir/$css" > "$DESTDIR/$css_hashed"
cp -v "$tmpdir/$map" "$DESTDIR/$map_hashed"
rm -rf "$tmpdir"
