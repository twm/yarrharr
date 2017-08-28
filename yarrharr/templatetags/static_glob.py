# -*- coding: utf-8 -*-
# Copyright © 2017 Tom Most <twm@freecog.net>
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
#
# Additional permission under GNU GPL version 3 section 7
#
# If you modify this Program, or any covered work, by linking or
# combining it with OpenSSL (or a modified version of that library),
# containing parts covered by the terms of the OpenSSL License, the
# licensors of this Program grant you additional permission to convey
# the resulting work.  Corresponding Source for a non-source form of
# such a combination shall include the source code for the parts of
# OpenSSL used as well as that of the covered work.
"""
A template filter which matches against the yarrharr app's static files.
"""

import fnmatch
import stat
import os

import attr
from django import template
from django.template.defaultfilters import stringfilter


register = template.Library()
_static_dir = os.path.join(os.path.dirname(__file__), '../static')


@attr.s
class NoStaticMatch(Exception):
    pattern = attr.ib()

    def __str__(self):
        return "No file matches pattern {!r}".format(self.pattern)


@register.filter
@stringfilter
def newest_static(pattern):
    """
    Search the Yarrharr app's static directory for the newest file matching the
    given fnmatch pattern.

    This combines with a Webpack output file pattern that incorporates a hash
    of the file contents to ensure that the browser always receives the latest
    file without sending cache-busting headers. Discarding all but the newest
    files is necessary because Webpack's watch mode doesn't clear files from
    the output directory (``CleanWebpackPlugin`` doesn't operate).

    :param str pattern: fnmatch (glob) pattern -- see :mod:`fnmatch`
    :returns: name of the file with the greatest modification time in the directory
    :raises: :exc:`NoStaticMatch` when no file matching the pattern exists
    """
    # TODO The result of this should be cached when not in DEBUG mode.
    assert '/' not in pattern  # don't support subdirectories
    name, mtime = None, None
    for fn in os.listdir(_static_dir):  # *sigh* need Python 3 for scandir...
        if not fnmatch.fnmatchcase(fn, pattern):
            continue

        s = os.stat(os.path.join(_static_dir, fn))
        if not stat.S_ISREG(s.st_mode):
            continue

        if mtime is None or s.st_mtime > mtime:
            name = fn
            mtime = s.st_mtime

    if name is None:
        raise NoStaticMatch(pattern)

    return name
