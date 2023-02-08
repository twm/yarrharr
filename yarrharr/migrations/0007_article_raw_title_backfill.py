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

import html

from django.db import migrations


def backfill_article_raw_title(apps, schema_editor):
    """
    Backfill the `yarrharr.models.Article.raw_title` column with an
    HTML-escaped version of the `title` column.
    """
    Article = apps.get_model("yarrharr", "Article")

    for article in Article.objects.all().only("title", "raw_title"):
        article.raw_title = html.escape(article.title)
        article.save()


class Migration(migrations.Migration):
    dependencies = [
        ("yarrharr", "0006_article_content_snippet"),
    ]

    operations = [
        migrations.RunPython(backfill_article_raw_title, elidable=True),
    ]
