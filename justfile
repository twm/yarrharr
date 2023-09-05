# Copyright 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2022, 2023 Tom Most <twm@freecog.net>; GPLv3+

static:
    tox -e static

release: static
    set -e
    git diff --quiet HEAD || exit 1
    tox -e release --notest
    version=$$(grep -oP '(?<=__version__ = ")([^"]+)(?=")' yarrharr/__init__.py)
    .tox/release/bin/python -m build
    .tox/release/bin/python -m twine check "dist/yarrharr-$${version}.tar.gz" "dist/yarrharr-$${version}-py3-none-any.whl"
    git tag "v$${version}"

devserver: static
    set -e
    tox -e run -- django-admin migrate
    tox -e run -- django-admin updatehtml
    YARRHARR_CONF='yarrharr/tests/*.ini' tox -e run -- django-admin runserver 127.0.0.1:8888

realserver: static
    set -e
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
