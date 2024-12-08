# Copyright 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2022, 2023 Tom Most <twm@freecog.net>; GPLv3+

set shell := ["bash", "-euc"]

default:
    just --list

_static:
    tox -e static

# Tag a release and trigger the GHA release workflow
release:
    set -exu -o pipefail
    git diff --quiet HEAD || exit 1
    [[ $(git rev-parse --abbrev-ref HEAD) == trunk ]]
    version=$(.tox/release/bin/hatch version)
    tag="v${version}"
    git tag "$tag"
    git push origin "$tag"
    git push origin trunk

devserver: _static
    tox -e run -- django-admin migrate
    tox -e run -- django-admin updatehtml
    YARRHARR_CONF='yarrharr/tests/*.ini' tox -e run -- django-admin runserver 127.0.0.1:8888

realserver: _static
    tox -e run -- django-admin migrate
    tox -e run -- django-admin collectstatic --noinput
    tox -e run -- yarrharr

poll-feeds:
    tox -e run -- django-admin pollfeeds

force-poll:
    tox -e run -- django-admin forcepoll

clean:
    -rm -rf yarrharr/static
    -rm -rf .tox
    -find -name '*.pyc' -delete
