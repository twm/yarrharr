# Copyright 2013, 2014, 2015, 2016, 2017, 2018, 2019 Tom Most <twm@freecog.net>; GPLv3+
# Yarrharr development Makefile.  This file contains recipes useful during
# development, but isn't part of the sdist release.
#
# TODO: Replace this with a shell script. This once had real recipes, but now
# it's just a bunch of phonies.

# Clear default rules.
.SUFFIXES:

.PHONY: webpack
webpack:
	rm -rf yarrharr/static
	mkdir yarrharr/static
	cp -v vendor/normalize.css/normalize-*.css yarrharr/static/
	bin/compile-less.sh
	tox -e run -- python bin/compile-svg.py
	tox -e compress

.PHONY: release
release: webpack
	rm -rf build/lib build/bdist.*  # Work around https://github.com/pypa/wheel/issues/147
	python3 setup.py sdist bdist_wheel

.PHONY: devserver
devserver: webpack
	tox -e run -- django-admin migrate
	tox -e run -- django-admin updatehtml
	YARRHARR_CONF='yarrharr/tests/*.ini' tox -e run -- django-admin runserver 127.0.0.1:8888

.PHONY: realserver
realserver: webpack
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
