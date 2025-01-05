# Copyright © 2013, 2014 Tom Most <twm@freecog.net>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

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
