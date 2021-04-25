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

from django.utils.safestring import SafeString

from ..converters import Filter, FilterConverter


class FilterConverterTests:
    """
    Test `yarrharr.converters.FilterConverter`
    """

    def test_to_python(self):
        c = FilterConverter()
        self.assertIs(Filter.unread, c.to_python("unread"))
        self.assertIs(Filter.fave, c.to_python("fave"))
        self.assertIs(Filter.all, c.to_python("all"))
        self.assertRaises(ValueError, c.to_python, "")
        self.assertRaises(ValueError, c.to_python, "nope")

    def test_to_url(self):
        c = FilterConverter()
        self.assertEqual("unread", c.to_url(Filter.unread))
        self.assertRaises(ValueError, c.to_url, "nope")
        self.assertRaises(ValueError, c.to_url, 1)
        self.assertRaises(ValueError, c.to_url, None)

    def test_roundtrip(self):
        c = FilterConverter()
        self.assertIs(Filter.all, c.to_python(c.to_url(Filter.all)))
        self.assertEqual("unread", c.to_url(c.to_python("unread")))

    def test_to_url_safe_string(self):
        """
        `to_url()` works with `SafeString` instances so it can be called
        within templates.
        """
        c = FilterConverter()
        self.assertEqual("unread", c.to_url(SafeString("unread")))
