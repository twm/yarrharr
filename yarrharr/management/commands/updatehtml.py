# -*- coding: utf-8 -*-
# Copyright © 2017, 2018 Tom Most <twm@freecog.net>
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

from django.core.management.base import BaseCommand
from django.db import transaction

from yarrharr.models import Article
from yarrharr.sanitize import REVISION


def need_update():
    return Article.objects.exclude(content_rev=REVISION).only("raw_content")


class Command(BaseCommand):
    help = "Update article HTML for sanitizer changes"

    def handle(self, *args, **options):
        count = 0
        estimate = need_update().count()
        self.stdout.write(self.style.SUCCESS("{} articles need update".format(estimate)))
        while True:
            with transaction.atomic():
                batch = list(need_update()[:100])
                if not batch:
                    break
                for article in batch:
                    article.set_content(article.raw_title, article.raw_content)
                    article.save()
                count += len(batch)
            self.stdout.write(self.style.SUCCESS("Updated {} articles".format(count)))
        self.stdout.write(self.style.SUCCESS("Finished: updated {} articles".format(count)))
