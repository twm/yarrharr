# Copyright 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2022, 2023 Tom Most <twm@freecog.net>; GPLv3+
# Yarrharr development Makefile.  This file contains recipes useful during
# development, but isn't part of the sdist release.
#
# TODO: Replace this with a shell script. This once had real recipes, but now
# it's just a bunch of phonies.

# Clear default rules.
.SUFFIXES:

# MAke is greAt.
.ONESHELL:

.PHONY: static
static:
	tox -e static

.PHONY: release
release: static
	tox -e release --notest
	version=$$(grep -oP '(?<=__version__ = ")([^"]+)(?=")' yarrharr/__init__.py)
	.tox/release/bin/python -m build
	.tox/release/bin/python -m twine check "dist/yarrharr-$${version}.tar.gz" "dist/yarrharr-$${version}-py3-none-any.whl"
	git tag "v$${version}"

.PHONY: devserver
devserver: static
	set -e
	tox -e run -- django-admin migrate
	tox -e run -- django-admin updatehtml
	YARRHARR_CONF='yarrharr/tests/*.ini' tox -e run -- django-admin runserver 127.0.0.1:8888

.PHONY: realserver
realserver: static
	set -e
	tox -e run -- django-admin migrate
	tox -e run -- django-admin collectstatic --noinput
	tox -e run -- yarrharr

.PHONY: poll-feeds
poll-feeds:
	tox -e run -- django-admin pollfeeds

.PHONY: force-poll
force-poll:
	tox -e run -- django-admin forcepoll

.PHONY: clean
clean:
	-rm -rf yarrharr/static
	-rm -rf .tox
	-find -name '*.pyc' -delete
