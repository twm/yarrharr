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

from typing import Union

from .enums import ArticleFilter


class ArticleFilterConverter:
    """
    Django `URL path converter`_ that allows a URL segment that matches
    a `Filter` enum member

    .. _url path converter: https://docs.djangoproject.com/en/3.2/topics/http/urls/#registering-custom-path-converters
    """
    regex = f"({'|'.join(f for f in ArticleFilter.__members__)})"

    def to_python(self, value: str) -> ArticleFilter:
        try:
            return ArticleFilter[value]
        except KeyError:
            raise ValueError(value)

    def to_url(self, value: Union[ArticleFilter, str]) -> str:
        """
        Convert a filter to a URL.

        :param filter:
            Either a value of the `Filter` enum or a string naming one.

        :returns: URL path segment
        """
        if isinstance(value, str):
            if value in ArticleFilter.__members__:
                return value
            return ArticleFilter[value].name
        if isinstance(value, ArticleFilter):
            return value.name
        raise ValueError(value)
