# Copyright 2013, 2014 Tom Most <twm@freecog.net>

"""
Yarrharr's Django settings module

The actual settings are read from :mod:`ConfigParser`-style files and
translated into the appropriate Django settings by
:func:`yarrharr.conf.read_yarrar_conf()`, which is in another module for
testability.  The files to read are defined by the :env:`YARRHARR_CONF`
environment variable, a shell-style glob pattern.
"""

from yarrharr.conf import find_conf_files, read_yarrharr_conf


files = find_conf_files()
conf = read_yarrharr_conf(files, locals())
