# Copyright 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2022, 2023, 2024, 2025 Tom Most <twm@freecog.net>; GPLv3+

set shell := ["bash", "-euc"]
set positional-arguments

export YARRHARR_CONF := env("YARRHARR_CONF", justfile_dir() / "yarrharr/tests/dev.ini")
export YARRHARR_TESTING := "yes"
export DJANGO_SETTINGS_MODULE := "yarrharr.settings"
export PYTHONDONTWRITEBYTECODE := "yes"
# This must remain disabled due to https://github.com/twisted/treq/issues/226
# export POISON_REACTOR := "yes"

default:
    just --list

_static +args="--compress":
    uv run --script bin/compile-static.py "$@"

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
    if [[ $(uv run --only-group release hatch version) != $version ]]
    then
        printf "ERROR: Version %q didn't take\n" "$version"
        exit 1
    fi
    git tag "$tag"
    git push origin "$tag"
    git push origin trunk

# Run by the GitHub workflow to actually build the release artifacts.
_release: _static
    #!/usr/bin/env bash
    set -exu -o pipefail
    git diff --quiet HEAD || exit 1
    version=$(uv run --only-group release -- hatch version)
    uv export --no-dev --no-emit-project --format requirements.txt --frozen -o "dist/yarrharr-${version}-requirements.txt"
    uv run --only-group release -m build
    uv run --only-group release twine check "dist/yarrharr-${version}.tar.gz" "dist/yarrharr-${version}-py3-none-any.whl"

iterstatic:
    #!/bin/bash
    exec watchexec \
        --watch css \
        --watch img \
        --watch vendor \
        --watch bin \
        --on-busy-update=queue \
        --shell=none \
        -- \
        just _static --no-compress

# Lint the codebase
lint:
    uv run --only-group lint ruff check ./yarrharr
    uv run --only-group lint ruff format --check ./yarrharr

test:
    just pytest
    just django-admin makemigrations --dry-run --check
    just django-admin check

pytest *args:
    #!/bin/bash
    set -eux -o pipefail
    # FIXME: SynchronousTestCase.mktemp() creates a directory named for the test in the
    # working directory, so put that somewhere temporary:
    tmpdir=$(mktemp -d)
    uv --project {{ justfile_dir() }} --directory "$tmpdir" run pytest {{ justfile_dir() }}/yarrharr "$@"
    rm -rf "$tmpdir"

itertests *args:
    watchexec \
        --watch {{ justfile_dir() }}/yarrharr \
        --on-busy-update=queue \
        --shell=none \
        -- \
        just pytest -vvv "$@"

devserver: _static
    @just django-admin migrate
    @just django-admin updatehtml
    @just django-admin runserver 127.0.0.1:8888

realserver: _static
    @just django-admin migrate
    @just django-admin collectstatic --noinput
    uv run -- yarrharr

django-admin *args:
    uv run django-admin "$@"

makemigrations:
    @just django-admin makemigrations
    @just lint
    uv run --only-group lint ruff check --fix yarrharr/migrations
    uv run --only-group lint ruff format yarrharr/migrations
    git add yarrharr/migrations/*.py

poll-feeds:
    @just django-admin pollfeeds

force-poll:
    @just django-admin forcepoll

clean:
    -rm -rf yarrharr/static
    -find -name '*.pyc' -delete
