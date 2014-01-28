# A very lazy Makefile.  Just shell out to do everything.  Some day this can
# become a real build system, maybe, if I feel like it…

# Clear default rules.
.SUFFIXES:

export YARRHARR_CONF=yarrharr/tests/test_config.ini

NODEJS ?= $(shell which nodejs || which node)
LESSC ?= $(NODEJS) node_modules/.bin/lessc

SCOUR ?= scour
SCOURFLAGS := --indent=none --enable-comment-stripping \
	--enable-id-stripping --shorten-ids

V := @

STATIC_TARGETS := yarrharr/static/yarrharr.css

yarrharr/static:
	$(V)mkdir -p $(dir $@)

yarrharr/static/yarrharr.css: assets/yarrharr.less yarrharr/static
	@echo "LESS $@"
	$(V)$(LESSC) --verbose --strict-math=on --compress $< $@

ICON_SRC_ROOT := assets/gnome-icon-theme-symbolic/gnome/scalable
ICON_DEST := yarrharr/static
ICONS := \
    actions/go-down-symbolic.svg \
    actions/go-up-symbolic.svg \
    actions/system-run-symbolic.svg \
    status/starred-symbolic.svg \
    status/non-starred-symbolic.svg \
    status/dialog-error-symbolic.svg \
    status/dialog-information-symbolic.svg \
    status/dialog-question-symbolic.svg \
    status/dialog-warning-symbolic.svg \
    mimetypes/text-x-generic-symbolic.svg \
    places/folder-saved-search-symbolic.svg \
    actions/view-continuous-symbolic.svg \
    actions/view-list-symbolic.svg \
    actions/view-paged-symbolic.svg \
    actions/view-refresh-symbolic.svg \
    actions/object-select-symbolic.svg \
    emblems/emblem-synchronizing-symbolic.svg \
    emblems/emblem-system-symbolic.svg

define MINIFY-ICON-RULE
STATIC_TARGETS += $(ICON_DEST)/$(notdir $(1))

$(ICON_DEST)/$(notdir $(1)): $(ICON_SRC_ROOT)/$(1) $(ICON_DEST)
	@echo "SCOUR $$@ "
	$$(V)$$(SCOUR) -i "$$<" -o "$$@" $$(SCOURFLAGS) >/dev/null 2>&1
endef

$(foreach f,$(ICONS),$(eval $(call MINIFY-ICON-RULE,$f)))

include tools/yarrharr-icon.mk

static-assets: $(STATIC_TARGETS)

release: static-assets
	python setup.py sdist

test:
	bin/manage.py test south yarr yarrharr

devserver:
	mkdir -p static
	bin/manage.py runserver

clean:
	-rm -rf yarrharr/static

.PHONY: static-assets release test devserver clean
