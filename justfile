# Copyright 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2022, 2023, 2024, 2025 Tom Most <twm@freecog.net>; GPLv3+

set shell := ["bash", "-euc"]
set positional-arguments

default:
    just --list

_static:
    tox -e static

# Tag a release and trigger the GHA release workflow
release:
    #!/bin/bash
    set -exu -o pipefail
    if [[ $(git rev-parse --abbrev-ref HEAD) != trunk ]]
    then
        echo "ERROR: Must be on trunk branch"
        exit 1
    fi
    if ! git diff --quiet HEAD
    then
        echo "ERROR: Dirty working copy"
        exit 1
    fi
    for p in $(seq 0 42)
    do
        version="$(TZ=America/Los_Angeles date +%Y.%-m).$p"
        tag="v${version}"
        if ! git rev-parse "$tag" &>/dev/null
        then
            break
        fi
    done
    incremental update yarrharr --newversion "$version"
    git commit -am "Anoint $version"
    tox -e release --notest --recreate
    if [[ $(.tox/release/bin/hatch version) != $version ]]
    then
        printf "ERROR: Version %q didn't take\n" "$version"
        exit 1
    fi
    git tag "$tag"
    git push origin "$tag"
    git push origin trunk

iterstatic:
    #!/bin/bash
    tox -e static --notest
    exec watchexec \
        --watch css \
        --watch img \
        --watch vendor \
        --watch bin \
        --on-busy-update=queue \
        --shell=none \
        -- \
        .tox/static/bin/python bin/compile-static.py --no-compress

itertests +args='./yarrharr':
    #!/bin/bash
    tox -e test --develop --notest
    export YARRHARR_CONF=./yarrharr/tests/dev.ini
    export YARRHARR_TESTING=yes
    export DJANGO_SETTINGS_MODULE=yarrharr.settings
    export PYTHONDONTWRITEBYTECODE=yes
    exec watchexec \
        --watch yarrharr \
        --on-busy-update=queue \
        --shell=none \
        -- \
        .tox/test/bin/pytest -vvv "$@"

devserver: _static
    tox run -e run -- django-admin migrate
    tox run -e run -- django-admin updatehtml
    YARRHARR_CONF='yarrharr/tests/*.ini' tox run -e run -- django-admin runserver 127.0.0.1:8888

realserver: _static
    tox run -e run -- django-admin migrate
    tox run -e run -- django-admin collectstatic --noinput
    tox run -e run -- yarrharr

poll-feeds:
    tox run -e run -- django-admin pollfeeds

force-poll:
    tox run -e run -- django-admin forcepoll

clean:
    -rm -rf yarrharr/static
    -rm -rf .tox
    -find -name '*.pyc' -delete
