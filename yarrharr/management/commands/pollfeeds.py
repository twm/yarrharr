import sys

from django.core.management.base import BaseCommand
from twisted.internet.task import react
from twisted.logger import globalLogBeginner, textFileLogObserver

from yarrharr.application import updateFeeds


class Command(BaseCommand):
    help = 'Check feeds for updates'

    def add_arguments(self, parser):
        parser.add_argument('--max-fetch', type=int, default=5,
                            help='Limit on the number of feeds to check')

    def handle(self, *args, **options):
        globalLogBeginner.beginLoggingTo([textFileLogObserver(sys.stderr)],
                                         redirectStandardIO=False)
        react(updateFeeds, (options['max_fetch'],))
