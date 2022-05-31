#!/bin/bash

tox -e static --notest

exec watchexec \
    --watch less \
    --watch img \
    --watch vendor \
    --on-busy-update=queue \
    --shell=none \
    -- \
    .tox/static/bin/python bin/compile-static.py --no-compress
