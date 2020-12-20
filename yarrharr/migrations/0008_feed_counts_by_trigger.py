# Copyright © 2018, 2020 Tom Most <twm@freecog.net>
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
from ._0008_triggers import CREATE_TRIGGERS, DROP_TRIGGERS


def init_feed_counts(apps, schema_editor):
    Feed = apps.get_model('yarrharr', 'Feed')
    db_alias = schema_editor.connection.alias

    # This could be done more efficiently with aggregations, but given the
    # limited testing this migration will get we're using crude ORM calls as
    # they are more likely to be correct.
    for feed in Feed.objects.using(db_alias).all():
        feed.all_count = feed.articles.all().count()
        feed.unread_count = feed.articles.filter(read=False).count()
        feed.fave_count = feed.articles.filter(fave=True).count()
        feed.save()


class Migration(migrations.Migration):

    dependencies = [
        ('yarrharr', '0007_article_raw_title_backfill'),
    ]

    operations = [
        migrations.AddField(
            model_name='feed',
            name='all_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='feed',
            name='fave_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='feed',
            name='unread_count',
            field=models.IntegerField(default=0),
        ),
        migrations.RunPython(init_feed_counts, migrations.RunPython.noop, elidable=True),
        migrations.RunSQL(CREATE_TRIGGERS, DROP_TRIGGERS, elidable=True),
    ]
