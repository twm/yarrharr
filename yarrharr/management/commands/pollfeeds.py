import sys

from django.core.management.base import BaseCommand
from twisted.internet.task import react
from twisted.logger import globalLogBeginner, textFileLogObserver

from yarrharr.application import updateFeeds


class Command(BaseCommand):
    help = 'Check feeds for updates'

    def handle(self, *args, **options):
        globalLogBeginner.beginLoggingTo([textFileLogObserver(sys.stderr)],
                                         redirectStandardIO=False)
        react(updateFeeds, ())
