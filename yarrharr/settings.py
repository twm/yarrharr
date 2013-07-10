# Copyright 2013 Tom Most <twm@freecog.net>

"""
Yarrharr's Django settings module

The actual settings are read from :mod:`ConfigParser`-style files and
translated into the appropriate Django settings by
:func:`yarrharr.conf.read_yarrar_conf()`, which is in another module for
testability.  The files to read are defined by the :env:`YARRHARR_CONF`
environment variable, a shell-style glob pattern.
"""

import os
import glob

from yarrharr.conf import read_yarrharr_conf


pattern = os.environ.get('YARRHARR_CONF', '/etc/yarrharr/*.ini')
files = glob.glob(pattern)
conf = read_yarrharr_conf(files, locals())
