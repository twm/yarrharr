#!/bin/bash
# Generate the contents of yarrharr/static from the stuff in assets.

set -xe

# Go to repo root.
cd "$(dirname $0)"/..

# I do not feel like dealing with dependency tracking for this.
rm -rf yarrharr/static
mkdir -p yarrharr/static

# Twitter's less thinger: npm install -g recess
recess \
    assets/normalize.css/normalize.css \
    assets/yarrharr.less \
    --compress >yarrharr/static/yarrharr.css
