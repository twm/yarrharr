# Squish the GNOME symbolic icons for web use
# Copyright 2014 Tom Most <twm@freecog.net>; GPLv3+
#
# This Makefile fragment depends on the V, SCOUR and SCOURFLAGS variables being
# defined by the caller.  It appends icon output target files to
# STATIC_TARGETS.

SYMBOLIC_SRC_ROOT := assets/gnome-icon-theme-symbolic/gnome/scalable
SYMBOLIC_DEST := yarrharr/static
SYMBOLIC_ICONS := \
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

define SYMBOLIC-MINIFY
STATIC_TARGETS += $(SYMBOLIC_DEST)/$(notdir $(1))

$(SYMBOLIC_DEST)/$(notdir $(1)): $(SYMBOLIC_SRC_ROOT)/$(1)
	$$(V)mkdir -p "$$(dir $$@)"
	@echo "SCOUR $$@ "
	$$(V)$$(SCOUR) -i "$$<" -o "$$@" $$(SCOURFLAGS) >/dev/null 2>&1
endef

$(foreach f,$(SYMBOLIC_ICONS),$(eval $(call SYMBOLIC-MINIFY,$f)))
