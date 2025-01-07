# Copyright © 2022, 2025 Tom Most <twm@freecog.net>
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
            csp_nonce = request.headers["Yarrharr-Csp-Nonce"]
        except KeyError:
            if os.environ.get("YARRHARR_TESTING") == "yes":
                # Only ignore this in unit tests so we fail safe in production.
                csp_nonce = None
            else:
                raise
    else:
        csp_nonce = None
    return {"csp_nonce": csp_nonce}
