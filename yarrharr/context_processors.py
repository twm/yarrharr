# Copyright © 2022 Tom Most <twm@freecog.net>
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
Yarrharr template context processors.
"""

import os

from django.conf import settings


def csp(request):
    """
    Add the script nonce from the ``Content-Security-Policy`` header to the
    request context.
    """
    if settings.YARRHARR_SCRIPT_NONCE:
        try:
            nonce = request.headers["Yarrharr-Script-Nonce"]
        except KeyError:
            if os.environ.get("YARRHARR_TESTING") == "yes":
                # Only ignore this in unit tests so we fail safe in production.
                nonce = None
            else:
                raise
    else:
        nonce = None
    return {"script_nonce": nonce}
