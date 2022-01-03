# -*- coding: utf-8 -*-
# Copyright © 2018 Tom Most <twm@freecog.net>
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
Django database instrumentation

Use these functions like::

    from django.db import connection

    with connection.execute_wrapper(...):
        # Use the Django ORM.

See `database instrumentation <https://docs.djangoproject.com/en/2.1/topics/db/instrumentation/>`_
in the Django documentation for more information.
"""
import reprlib

from twisted.logger import Logger

log = Logger()


def log_mutations(execute, sql, params, many, context):
    """
    Log every non-SELECT query executed.
    """
    if not sql.startswith("SELECT "):
        log.debug(
            "Query {sql} params={params} many={many!r}",
            sql=sql,
            params=reprlib.repr(params),
            many=many,
        )
    return execute(sql, params, many, context)


def log_on_error(execute, sql, params, many, context):
    """
    Log a query if an exception is raised.
    """
    try:
        return execute(sql, params, many, context)
    except Exception:
        log.debug(
            "Query {sql} params={params} many={many!r}",
            sql=sql,
            params=reprlib.repr(params),
            many=many,
        )
        raise
