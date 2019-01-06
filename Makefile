# Copyright 2013, 2014, 2015, 2016, 2017, 2018, 2019 Tom Most <twm@freecog.net>; GPLv3+
# Yarrharr development Makefile.  This file contains recipes useful during
# development, but isn't part of the sdist release.
#
# TODO: Replace this with a shell script. This once had real recipes, but now
# it's just a bunch of phonies.

# Clear default rules.
.SUFFIXES:

.PHONY: webpack-release
webpack-release:
	rm -rf yarrharr/static
	NODE_ENV=production RUNMODE=release npm run webpack
	@if grep -q __debug__ yarrharr/static/main-*.js; then echo "ERROR: __debug__ found in bundle. Is minification working?"; exit 1; fi
	@if grep -q propTypes yarrharr/static/main-*.js; then echo "ERROR: propTypes found in bundle. Please remove them."; exit 1; fi
	tox -e compress

.PHONY: release
release: webpack-release
	rm -rf build/lib build/bdist.*  # Work around https://github.com/pypa/wheel/issues/147
	python3 setup.py sdist bdist_wheel

.PHONY: devserver
devserver:
	tox -e run -- django-admin migrate
	tox -e run -- django-admin updatehtml
	YARRHARR_CONF='yarrharr/tests/*.ini' tox -e run -- django-admin runserver 127.0.0.1:8887

.PHONY: realserver
realserver:
	NODE_ENV=development RUNMODE=dev-static npm run webpack
	tox -e run -- django-admin migrate
	tox -e run -- django-admin collectstatic --noinput
	tox -e run -- yarrharr

.PHONY: poll-feeds
poll-feeds:
	tox -e run -- django-admin pollfeeds

.PHONY: force-poll
force-poll:
	tox -e run -- django-admin forcepoll

.PHONY: webpack
webpack:
	# Remove the static directory so that the latest_static templatetag knows
	# we are in HMR mode:
	rm -rf yarrharr/static
	NODE_ENV=development RUNMODE=dev-hot npm run webpack-dev-server

.PHONY: clean
clean:
	-rm -rf yarrharr/static
	-rm -rf .tox
	-find -name '*.pyc' -delete
