from django.core.management.base import BaseCommand
from django.utils import timezone

from yarrharr.models import Feed


class Command(BaseCommand):
    help = 'Check feeds for updates'

    def handle(self, *args, **options):
        Feed.objects.exclude(next_check=None).update(next_check=timezone.now())
