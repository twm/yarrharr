# A very lazy Makefile.  Just shell out to do everything.  Some day this can be
# come a real build system, maybe, if I feel like it…

export YARRHARR_CONF=yarrharr/tests/test_config.ini

static-assets:
	rm -rf yarrharr/static
	mkdir -p yarrharr/static
	tools/build-css.sh
	tools/build-icons.sh

release: static-assets
	python setup.py sdist

test:
	bin/manage.py test south yarr yarrharr

devserver:
	mkdir -p static
	bin/manage.py runserver

.PHONY: static-assets release test devserver
