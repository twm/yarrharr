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

from django.core.management.base import BaseCommand
from django.db import transaction

from yarrharr.models import Feed


class Command(BaseCommand):
    help = 'Audit feed article counts'
    requires_migration_checks = True

    def add_arguments(self, parser):
        parser.add_argument('--mutate', default=True, action='store_true',
                            help="Modify the database")
        parser.add_argument('--dry-run', action='store_false', dest='mutate',
                            help="Don't actually modify the database, just list feeds with bad counters")

    def handle(self, *args, **options):
        mutate = options['mutate']
        feeds = 0
        fixes = 0
        with transaction.atomic():
            for feed in Feed.objects.all().order_by('feed_title').iterator():
                feeds += 1
                fixes += self._audit_feed(feed, mutate)
        if mutate:
            self.stdout.write(self.style.SUCCESS("{:,d} counters fixed. {:,d} feeds were audited.".format(fixes, feeds)))

    def _audit_feed(self, feed, mutate):
        all = feed.articles.all().count()
        unread = feed.articles.filter(read=False).count()
        fave = feed.articles.filter(fave=True).count()

        fixes = 0
        if feed.all_count != all:
            feed.all_count = all
            fixes += 1
        if feed.unread_count != unread:
            feed.unread_count = unread
            fixes += 1
        if feed.fave_count != fave:
            feed.fave_count = fave
            fixes += 1

        if fixes > 0:
            if mutate:
                feed.save()
            self.stdout.write(self.style.WARNING("{} bad counts on feed pk={} {}".format(fixes, feed.pk, feed)))
        return fixes
