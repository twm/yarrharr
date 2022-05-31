# Copyright 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2022 Tom Most <twm@freecog.net>; GPLv3+
# Yarrharr development Makefile.  This file contains recipes useful during
# development, but isn't part of the sdist release.
#
# TODO: Replace this with a shell script. This once had real recipes, but now
# it's just a bunch of phonies.

# Clear default rules.
.SUFFIXES:

.PHONY: static
static:
	tox -e static

.PHONY: release
release: static
	rm -rf build/lib build/bdist.*  # Work around https://github.com/pypa/wheel/issues/147
	python3 setup.py sdist bdist_wheel

.PHONY: devserver
devserver: static
	tox -e run -- django-admin migrate
	tox -e run -- django-admin updatehtml
	YARRHARR_CONF='yarrharr/tests/*.ini' tox -e run -- django-admin runserver 127.0.0.1:8888

.PHONY: realserver
realserver: static
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
