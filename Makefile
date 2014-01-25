# A very lazy Makefile.  Just shell out to do everything.  Some day this can
# become a real build system, maybe, if I feel like it…

export YARRHARR_CONF=yarrharr/tests/test_config.ini

LESSC ?= node_modules/less/bin/lessc

yarrharr/static/yarrharr.css: assets/yarrharr.less
	@mkdir -p $(dir $@)
	$(LESSC) --verbose --strict-math=on --compress $< $@

static-assets: yarrharr/static/yarrharr.css
	cp 'assets/gnome-icon-theme-symbolic/gnome/scalable/actions/go-down-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/actions/go-up-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/actions/system-run-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/status/starred-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/status/non-starred-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/status/dialog-error-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/status/dialog-information-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/status/dialog-question-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/status/dialog-warning-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/mimetypes/text-x-generic-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/places/folder-saved-search-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/actions/view-continuous-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/actions/view-list-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/actions/view-paged-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/actions/view-refresh-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/actions/object-select-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/emblems/emblem-synchronizing-symbolic.svg' \
	    'assets/gnome-icon-theme-symbolic/gnome/scalable/emblems/emblem-system-symbolic.svg' \
	    'yarrharr/static/'
	tools/build-icons.sh

release: static-assets
	python setup.py sdist

test:
	bin/manage.py test south yarr yarrharr

devserver:
	mkdir -p static
	bin/manage.py runserver

.PHONY: static-assets release test devserver
