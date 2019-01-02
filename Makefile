# Copyright 2013, 2014, 2015, 2016, 2017, 2018 Tom Most <twm@freecog.net>; GPLv3+
# Yarrharr development Makefile.  This file contains recipes useful during
# development, but isn't part of the sdist release.

# Clear default rules.
.SUFFIXES:

WEBPACK ?= node_modules/.bin/webpack

# Run ``make V=`` to see the commands run.
V := @


webpack-prod:
	@echo "WEBPACK"
	$(V)rm -rf yarrharr/static
	$(V)NODE_ENV=production npm run build-prod
	# $(V)if grep -q propTypes yarrharr/static/main-*.js; then echo "ERROR: propTypes found in bundle. Please remove them."; exit 1; fi
	$(V)tox -e compress

release: webpack-prod
	rm -rf build/lib build/bdist.*  # Work around https://github.com/pypa/wheel/issues/147
	python3 setup.py sdist bdist_wheel

.PHONY: devserver
devserver:
	tox -e run -- django-admin migrate
	tox -e run -- django-admin updatehtml
	tox -e run -- django-admin runserver 127.0.0.1:8888

.PHONY: realserver
realserver:
	tox -e run -- django-admin migrate
	tox -e run -- django-admin collectstatic
	tox -e run -- yarrharr

.PHONY: poll-feeds
poll-feeds:
	tox -e run -- django-admin pollfeeds

.PHONY: force-poll
force-poll:
	tox -e run -- django-admin forcepoll

# TODO: Switch this to use webpack's dev server for hot module reloading.
webpack:
	$(V)NODE_ENV=development npm run build-dev


clean:
	-rm -rf yarrharr/static
	-rm -rf .tox
	-find -name '*.pyc' -delete

.PHONY: release test devserver clean
