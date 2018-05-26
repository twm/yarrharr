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

from contextlib import contextmanager
from datetime import timedelta
from unittest.mock import ANY

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User

from ..models import Feed, Article
from ..signals import poll_now


@contextmanager
def signal_inbox(signal):
    """
    Context manager which collects Django signals in a list. Use like::

        with signal_inbox(some_signal) as inbox:
            ...  # Cause the signal to be sent.

        [[sender, kwargs]] = inbox

    There will be one item in the inbox list per signal dispatched.
    """
    inbox = []

    def receive(sender, **kwargs):
        inbox.append((sender, kwargs))

    signal.connect(receive)
    try:
        yield inbox
    finally:
        signal.disconnect(receive)


class FeedTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='admin',
            email='admin@mailhost.example',
            password='sesame',
        )

    def test_str_feed_title(self):
        """
        The title from the feed content is used unless overridden by the user.
        """
        f = self.user.feed_set.create(
            url='https://feed.example/',
            added=timezone.now(),
            next_check=timezone.now(),
            feed_title=u'Example Feed‽',
            user_title=u'',
        )
        self.assertEqual(u'Example Feed‽', f.title)
        self.assertEqual(u'Example Feed‽ <https://feed.example/>',
                         u'{}'.format(f))

    def test_str_user_title(self):
        """
        A user-set title has precedence over the title given in the feed
        content.
        """
        f = self.user.feed_set.create(
            url='https://feed.example/',
            added=timezone.now(),
            next_check=timezone.now(),
            feed_title=u'Example Feed',
            user_title=u'My Example Feed',
        )
        self.assertEqual(u'My Example Feed', f.title)
        self.assertEqual(u'My Example Feed <https://feed.example/>',
                         u'{}'.format(f))

    def test_poll_now_sent_create(self):
        """
        Creation of a `Feed` instance with a poll time now or in the past
        sends the poll_now signal.
        """
        with signal_inbox(poll_now) as inbox:
            f = self.user.feed_set.create(
                next_check=timezone.now(),
                url='https://feed.example/',
                added=timezone.now(),
            )

        self.assertEqual([(f, {'signal': ANY})], inbox)

    def test_poll_now_sent_update(self):
        """
        Saving a `Feed` instance with a poll time now or in the past sends the
        poll_now signal.

        Note that the actual behavior sends the signal on any save, not just
        those which change the `next_check` field. The duplicate signals are
        okay because polling when no feed is actually due is a no-op.
        """
        with signal_inbox(poll_now) as inbox:
            f = self.user.feed_set.create(
                next_check=None,
                url='https://feed.example/',
                added=timezone.now(),
            )

            # No signal has been sent as no poll is scheduled.
            self.assertEqual([], inbox)

            f.next_check = timezone.now() - timedelta(days=1)
            f.save()

            self.assertEqual([(f, {'signal': ANY})], inbox)


class ArticleTests(TestCase):
    def test_repr(self):
        a = Article(
            feed=Feed(
                user=User.objects.create_user(
                    username='admin',
                    email='admin@mailhost.example',
                    password='sesame',
                ),
                url='https://feed.example/',
                added=timezone.now(),
                next_check=timezone.now(),
                feed_title=u'Example Feed',
            ),
            read=False,
            fave=False,
            author='',
            title='Some Article',
            url='https://feed.example/1',
            date=timezone.now(),
            guid='1',
            raw_content='...',
            content='...',
        )

        self.assertEqual("Some Article <https://feed.example/1>",
                         u'{}'.format(a))
