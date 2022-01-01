# -*- coding: utf-8 -*-
# Copyright © 2021 Tom Most <twm@freecog.net>
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
A template tag that generates common attributes for Yarrharr's tab markup.
"""
import html

from django.template import Library, Node, TemplateSyntaxError

register = Library()


def tabattrs(parser, token):
    """
    Insert HTML attributes for tab styling.

    A call like::

        <a {% tabattrs "foo" %} href="...">

    Generates HTML attributes like::

        <a id="foo" aria-selected=false href="...">

    The ``aria-selected`` attribute is ``true`` when the given tab ID is
    present in the ``tabs_selected`` context variable.
    """
    try:
        tag_name, tab_id, *extra = token.split_contents()
    except ValueError:
        raise TemplateSyntaxError(
            f"{token.contents.split()[0]} tag requires at least one",
        )

    if not (tab_id[0] == tab_id[-1] and tab_id[0] in "\"'"):
        raise TemplateSyntaxError(f"{tag_name}'s argument must be a quoted string")

    return _TabAttrNode(tab_id[1:-1])


class _TabAttrNode(Node):
    def __init__(self, tab_id: str) -> None:
        self.tab_id = tab_id

    def render(self, context):
        selected = self.tab_id in context.get("tabs_selected", ())
        return (
            f'id="{html.escape(self.tab_id)}"'
            f' aria-selected={"true" if selected else "false"}'
        )


register.tag("tabattrs", tabattrs)
