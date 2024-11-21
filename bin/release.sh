#!/usr/bin/env bash
set -exu -o pipefail
git diff --quiet HEAD || exit 1
tox -e release --notest
version=$(.tox/release/bin/hatch version)
.tox/release/bin/python -m build
.tox/release/bin/python -m twine check "dist/yarrharr-${version}.tar.gz" "dist/yarrharr-${version}-py3-none-any.whl"
git tag "v${version}"
