from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from yarrharr.models import Feed


class Command(BaseCommand):
    help = "Check feeds for updates"

    def add_arguments(self, parser):
        parser.add_argument("feed_id", nargs="*", type=int)

    def handle(self, *args, **options):
        next_check = timezone.now()
        with transaction.atomic():
            if options["feed_id"]:
                for feed_id in options["feed_id"]:
                    try:
                        feed = Feed.objects.get(pk=feed_id)
                    except Feed.DoesNotExist:
                        raise CommandError("Feed {} does not exist".format(feed_id))
                    if feed.next_check is None:
                        raise CommandError("Feed {} is disabled".format(feed_id))
                    feed.next_check = next_check
                    feed.save()
                    self.stdout.write("Feed {} marked to be checked".format(feed))
                count = len(options["feed_id"])
            else:
                feeds = Feed.objects.exclude(next_check=None)
                count = feeds.update(next_check=next_check)
            self.stdout.write(self.style.SUCCESS("Updated {} feeds".format(count)))
