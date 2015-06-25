# Copyright 2013, 2014, 2015 Tom Most <twm@freecog.net>; GPLv3+
# Yarrharr development Makefile.  This file contains recipes useful during
# development, but isn't part of the sdist release.

# Clear default rules.
.SUFFIXES:

NODEJS ?= $(shell which nodejs || which node)
LESSC ?= $(NODEJS) node_modules/.bin/lessc

SCOUR ?= scour
SCOURFLAGS := --indent=none --enable-comment-stripping \
	--enable-id-stripping --shorten-ids

LISTEN ?= 127.0.0.1

# Run ``make V=`` to see the commands run.
V := @

# This variable is appended to by the Make fragments in tools when they are
# included below.
STATIC_TARGETS := yarrharr/static/yarrharr.css

yarrharr/static/yarrharr.css: assets/yarrharr.less
	$(V)mkdir -p "$(dir $@)"
	@echo "LESS $@"
	$(V)$(LESSC) --strict-math=on --compress $< $@

include tools/symbolic-icons.mk
include tools/yarrharr-icon.mk

static-assets: $(STATIC_TARGETS)

release: static-assets
	python setup.py sdist

devserver:
	tox -e runserver -- $(LISTEN):8888

webpackserver:
	node_modules/.bin/webpack-dev-server --port 8889 --host $(LISTEN) \
		--hot --content-base ./static/

check-feeds:
	tox -e run -- django-admin.py check_feeds

clean:
	-rm -rf yarrharr/static
	-rm -rf .tox
	-find -name '*.pyc' -delete

.PHONY: static-assets release test devserver check-feeds clean
