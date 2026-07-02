# Copyright © 2026 Tom Most <twm@freecog.net>
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
Re-export some feedparser symbols

This module exisxts because feedparser.http imports ``requests``, which
we don't want as a dependency.
"""

import sys
import types

try:
    # Install a non-functional requests module for feedparser.http to import.
    # This works because we don't use feedparser's HTTP APIs.
    sys.modules["requests"] = types.ModuleType("requests")

    from feedparser import parse
    from feedparser.http import ACCEPT_HEADER
finally:
    del sys.modules["requests"]

__all__ = (
    "ACCEPT_HEADER",
    "parse",
)
