# Copyright © 2017, 2018, 2026 Tom Most <twm@freecog.net>
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

from itertools import batched

from django.core.management.base import BaseCommand
from django.db import transaction

from yarrharr.models import Article
from yarrharr.sanitize import REVISION


class Command(BaseCommand):
    help = "Update article HTML for sanitizer changes"

    def handle(self, *args, **options):
        change_count = 0
        unchanged_count = 0
        ids = list(Article.objects.exclude(content_rev=REVISION).values_list("id", flat=True))
        self.stdout.write(self.style.SUCCESS(f"{len(ids):,d} articles need update"))
        for batch_ids in batched(ids, 100):
            with transaction.atomic():
                batch = list(Article.objects.filter(id__in=batch_ids))
                for article in batch:
                    update_fields = article.set_content(article.raw_title, article.raw_content)
                    if update_fields > {"content_rev"}:
                        change_count += 1
                    else:
                        unchanged_count += 1
                    article.save(update_fields=update_fields)

            pct = (change_count + unchanged_count) * 100.0 / len(ids)
            self.stdout.write(f"{pct:6.02f}% {change_count:,d} articles updated; {unchanged_count:,d} unchanged")
        count = change_count + unchanged_count
        self.stdout.write(self.style.SUCCESS(f"Updated {count:,d} articles to revision {REVISION}"))
        if count:
            changed_pct = change_count * 100.0 / count
            unchanged_pct = unchanged_count * 100 / count
            self.stdout.write(f"{changed_pct:.02f}% of articles changed ({change_count:,d})")
            self.stdout.write(f"{unchanged_pct:.02f}% of articles were unchanged ({unchanged_count:,d})")
