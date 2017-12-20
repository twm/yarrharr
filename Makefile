# Copyright 2013, 2014, 2015, 2016, 2017 Tom Most <twm@freecog.net>; GPLv3+
# Yarrharr development Makefile.  This file contains recipes useful during
# development, but isn't part of the sdist release.

# Clear default rules.
.SUFFIXES:

LESSC ?= node_modules/.bin/lessc
WEBPACK ?= node_modules/.bin/webpack

SCOUR ?= scour
SCOURFLAGS := --indent=none --enable-comment-stripping \
	--enable-id-stripping --shorten-ids

# Run ``make V=`` to see the commands run.
V := @

# This variable is appended to by the Make fragments in tools when they are
# included below.
STATIC_TARGETS :=

include tools/yarrharr-icon.mk

webpack-prod:
	$(V)mkdir -p "$(dir $@)"
	@echo "WEBPACK"
	$(V)NODE_ENV=production $(WEBPACK) --bail --profile --json > webpack-stats.json

static-assets: $(STATIC_TARGETS) webpack-prod

release: static-assets
	python setup.py sdist bdist_wheel

.PHONY: devserver
devserver:
	tox -e run -- django-admin migrate
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

webpack:
	$(WEBPACK) --watch --progress

clean:
	-rm -rf yarrharr/static
	-rm -rf .tox
	-find -name '*.pyc' -delete

.PHONY: static-assets release test devserver clean
