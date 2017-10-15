from django.core.management.base import BaseCommand
from django.db import transaction

from yarrharr.models import Article
from yarrharr.sanitize import REVISION, sanitize_html


def need_update():
    return Article.objects.exclude(content_rev=REVISION).only("raw_content")


class Command(BaseCommand):
    help = 'Update article HTML for sanitizer changes'

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
                    article.content = sanitize_html(article.raw_content)
                    article.content_rev = REVISION
                    article.save()
                count += len(batch)
            self.stdout.write(self.style.SUCCESS("Updated {} articles".format(count)))
        self.stdout.write(self.style.SUCCESS("Finished: updated {} articles".format(count)))
