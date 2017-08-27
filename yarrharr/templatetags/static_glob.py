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
import os

from django import template
from django.template.defaultfilters import stringfilter


register = template.Library()
_static_dir = os.path.join(os.path.dirname(__file__), '../static')


@register.filter
@stringfilter
def static_glob(pattern):
    """
    Match a glob pattern against the files in yarrharr's static file directory.
    """
    # TODO The result of this should be cached when not in DEBUG mode.
    assert '/' not in pattern  # don't support subdirectories
    paths = os.listdir(_static_dir)
    return [fn for fn in paths if fnmatch.fnmatchcase(fn, pattern) and
            os.path.isfile(os.path.join(_static_dir, fn))]
