# Copyright 2013, 2014 Tom Most <twm@freecog.net>; GPLv3+
# Yarrharr development Makefile.  This file contains recipes useful during
# development, but isn't part of the sdist release.

# Clear default rules.
.SUFFIXES:

NODEJS ?= $(shell which nodejs || which node)
LESSC ?= $(NODEJS) node_modules/.bin/lessc

SCOUR ?= scour
SCOURFLAGS := --indent=none --enable-comment-stripping \
	--enable-id-stripping --shorten-ids

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

devserver: static-assets
	YARRHARR_CONF=yarrharr/tests/test_config.ini python bin/manage.py runserver

clean:
	-rm -rf yarrharr/static
	-rm -rf .tox

.PHONY: static-assets release test devserver clean
