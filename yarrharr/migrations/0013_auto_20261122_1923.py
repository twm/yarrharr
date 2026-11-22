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

from django.db import migrations


class Migration(migrations.Migration):
    """
    Clear last_updated dates: they'll be set properly when the feed
    is next polled. (All affected feeds still are being polled.)
    """

    dependencies = [
        ("yarrharr", "0012_feed_error_at_feed_error_type"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                """
                UPDATE yarrharr_feed
                SET last_updated = NULL
                WHERE last_updated > last_checked
                """
            ],
            reverse_sql=["UPDATE yarrharr_feed SET last_updated = NULL"],
        )
    ]
