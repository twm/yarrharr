# -*- coding: utf-8 -*-
# Copyright © 2017, 2018, 2019 Tom Most <twm@freecog.net>
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
import os

import attr
from django import template
from django.conf import settings
from django.template.defaultfilters import stringfilter

register = template.Library()
_static_dir = os.path.join(os.path.dirname(__file__), '../static')


@attr.s(cmp=False)
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
    files is necessary because Webpack's watch mode (used in development)
    doesn't clear files from the output directory (``CleanWebpackPlugin``
    doesn't operate). In production the mtime checking is a no-op, as there is
    exactly one file which matches the pattern.

    Matching is also done with additional ``.gz`` and ``.br`` extensions. These
    are stripped in the return value, as `yarrharr.application.Static` does not
    permit them.

    :param str pattern: fnmatch (glob) pattern -- see :mod:`fnmatch`
    :returns: name of the file with the greatest modification time in the directory
    :raises: :exc:`NoStaticMatch` when no file matching the pattern exists
    """
    # TODO The result of this should be cached when not in DEBUG mode.
    assert '/' not in pattern  # don't support subdirectories

    # When using Webpack's dev server to do hot module reloading the files are
    # served from memory with static names.
    if settings.HOT:
        return pattern.replace('*', 'hot')

    name, mtime = None, None
    for entry in os.scandir(_static_dir):
        if not entry.is_file():
            continue

        if not (
            fnmatch.fnmatchcase(entry.name, pattern) or
            fnmatch.fnmatchcase(entry.name, pattern + '.gz') or
            fnmatch.fnmatchcase(entry.name, pattern + '.br')
        ):
            continue

        s = entry.stat()
        if mtime is None or s.st_mtime > mtime:
            if entry.name.endswith(('.br', '.gz')):
                name = entry.name[:-3]
            else:
                name = entry.name
            mtime = s.st_mtime

    if name is None:
        raise NoStaticMatch(pattern)

    return name
