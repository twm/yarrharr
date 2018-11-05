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


CREATE_TRIGGERS = [
    """
    CREATE TRIGGER feed_all_count_insert
    AFTER INSERT ON yarrharr_article FOR EACH ROW
    BEGIN
        UPDATE yarrharr_feed SET
            all_count = all_count + 1,
            unread_count = unread_count + (NOT NEW.read),
            fave_count = fave_count + NEW.fave
        WHERE yarrharr_feed.id = NEW.feed_id;
    END
    """,
    """
    CREATE TRIGGER feed_all_count_delete
    AFTER DELETE ON yarrharr_article FOR EACH ROW
    BEGIN
        UPDATE yarrharr_feed SET
            all_count = all_count - 1,
            unread_count = unread_count - (NOT OLD.read),
            fave_count = fave_count - OLD.fave
        WHERE yarrharr_feed.id = OLD.feed_id;
    END
    """,
    """
    CREATE TRIGGER feed_update_unread_count
    AFTER UPDATE OF read ON yarrharr_article FOR EACH ROW
    BEGIN
        UPDATE yarrharr_feed SET unread_count = unread_count - (NEW.read - OLD.read)
        WHERE yarrharr_feed.id = OLD.feed_id;
    END
    """,
    """
    CREATE TRIGGER feed_update_fave_count
    AFTER UPDATE OF fave ON yarrharr_article FOR EACH ROW
    BEGIN
        UPDATE yarrharr_feed SET fave_count = fave_count + (NEW.fave - OLD.fave)
        WHERE yarrharr_feed.id = OLD.feed_id;
    END
    """,
]

DROP_TRIGGERS = [
    """DROP TRIGGER feed_all_count_insert""",
    """DROP TRIGGER feed_all_count_delete""",
    """DROP TRIGGER feed_update_unread_count""",
    """DROP TRIGGER feed_update_fave_count""",
]


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
        migrations.RunPython(init_feed_counts, migrations.RunPython.noop),
        migrations.RunSQL(CREATE_TRIGGERS, DROP_TRIGGERS),
    ]
