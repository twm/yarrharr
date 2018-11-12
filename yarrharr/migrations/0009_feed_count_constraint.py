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

from django.db import migrations, models

COUNT_COLUMNS = ['all_count', 'unread_count', 'fave_count']

CREATE_TRIGGERS = [
    """
    CREATE TRIGGER feed_check_nonnegative_{column}
    AFTER UPDATE OF {column} ON yarrharr_feed FOR EACH ROW
    BEGIN
        SELECT RAISE(ABORT, 'negative {column}')
        WHERE NEW.{column} < 0;
    END
    """.format(column=c) for c in COUNT_COLUMNS
]

DROP_TRIGGERS = [
    "DROP TRIGGER feed_check_nonnegative_{}".format(column)
    for column in COUNT_COLUMNS
]


class Migration(migrations.Migration):
    """
    Install triggers to enforce feed count columns are non-negative. Once
    Django gains support for check constraints (expected in Django 2.2) these
    can be replaced.
    """

    dependencies = [
        ('yarrharr', '0008_feed_counts_by_trigger'),
    ]

    operations = [
        migrations.RunSQL(CREATE_TRIGGERS, DROP_TRIGGERS),
    ]
