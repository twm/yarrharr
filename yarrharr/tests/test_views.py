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
import datetime

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.utils import timezone
from unittest import mock

from ..models import Feed, Label
from ..signals import schedule_changed


class dictwith(object):
    """
    An object that compares equal to a dictionary which has a superset of the
    keys and values of the wrapped dictionary.
    """
    def __init__(self, wrapped):
        self._wrapped = wrapped

    def __eq__(self, other):
        if not isinstance(other, dict):
            return False
        for key, value in self._wrapped.items():
            if key not in other:
                return False
            if other[key] != value:
                return False
        return True

    def __repr__(self):
        return '+' + repr(self._wrapped)


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


class LoginRedirectTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='james',
            email='james@mail.example',
            password='hunter2',
        )

    def test_login_redirect(self):
        """
        When redirecting post-login all of the paths handled by the SPA are
        valid.  See #122.
        """
        c = Client()
        nexts = [
            '/',
            '/all/fave',
            '/all/unread/1234',
            '/label/1234/unread',
            '/label/1234/fave/',
            '/label/1234/unread/1234',
            '/label/1234/all/1234/',
            '/feed/1/unread',
            '/feed/2/fave/',
            '/feed/3/all/4'
            '/feed/5/all/678/'
            '/inventory',
            '/inventory/',
            '/inventory/add',
            '/inventory/add/',
        ]

        redirects = []
        for next_ in nexts:
            response = c.post('/login/', {
                'next': next_,
                'username': 'james',
                'password': 'hunter2',
            })
            redirects.append(response['Location'])

        self.assertEqual(nexts, redirects)


class InventoryViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='john',
            email='john@mail.example',
            password='sesame',
        )
        self.client = Client()
        self.client.force_login(self.user)

    maxDiff = None

    def test_get_sort(self):
        feed_c = self.user.feed_set.create(
            url='http://example.com/feedC.xml',
            feed_title='Feed C',
            site_url='http://example.com/',
            added=timezone.now(),
        )
        feed_b = self.user.feed_set.create(
            url='http://example.com/feedB.xml',
            feed_title='feed b',  # Case is ignored.
            site_url='http://example.com/',
            added=timezone.now(),
        )
        feed_a = self.user.feed_set.create(
            url='http://example.com/feedA.xml',
            feed_title='<-Feed a',  # Non-alphanumeric characters are disregarded.
            site_url='http://example.com/',
            added=timezone.now(),
        )
        label_a = feed_a.label_set.create(text='A', user=self.user)
        label_c = feed_b.label_set.create(text='C', user=self.user)
        label_b = feed_c.label_set.create(text='B', user=self.user)

        response = self.client.get('/api/inventory/')

        self.assertEqual({
            'feedsById': mock.ANY,
            'feedOrder': [
                feed_a.id,
                feed_b.id,
                feed_c.id,
            ],
            'labelsById': mock.ANY,
            'labelOrder': [
                label_a.id,
                label_b.id,
                label_c.id,
            ],
        }, response.json())

    def test_create(self):
        url = u'http://example.com/feed.xml'

        with signal_inbox(schedule_changed) as schedule_changed_signals:
            response = self.client.post('/api/inventory/', {
                'action': 'create-feed',
                'url': url,
            })

        self.assertEqual(200, response.status_code)
        [feed] = self.user.feed_set.all()
        self.assertEqual(url, feed.url)
        self.assertEqual(url, feed.feed_title)
        self.assertIsNotNone(feed.added)
        self.assertIsNotNone(feed.next_check)  # scheduled for poll
        self.assertEqual({
            'feedId': feed.id,
            'feedsById': {
                str(feed.id): {
                    'id': feed.id,
                    'title': url,
                    'text': '',
                    'siteUrl': '',
                    'labels': [],
                    'unreadCount': 0,
                    'faveCount': 0,
                    'checked': None,
                    'updated': None,
                    'added': mock.ANY,
                    'error': '',
                    'active': True,
                    'url': url,
                },
            },
            'feedOrder': [feed.id],
            'labelsById': {},
            'labelOrder': [],
        }, response.json())
        self.assertEqual(1, len(schedule_changed_signals))

    def test_update_feed_title_and_url(self):
        """
        A feed's user title and feed URL are set by the update-feed action.
        """
        added = timezone.now() - datetime.timedelta(days=1)
        feed = self.user.feed_set.create(
            url='http://example.com/feedX.xml',
            feed_title='Feed X',
            site_url='http://example.com/',
            added=added,
        )
        url = 'http://example.com/feedZ.xml'
        user_title = 'Feed Z'

        with signal_inbox(schedule_changed) as schedule_changed_signals:
            response = self.client.post('/api/inventory/', {
                'action': 'update-feed',
                'feed': feed.id,
                'url': url,
                'active': 'on',
                'title': user_title,
            })

        self.assertEqual(200, response.status_code)
        [feed] = self.user.feed_set.all()
        self.assertEqual(url, feed.url)
        self.assertEqual(user_title, feed.user_title)
        self.assertEqual({
            'feedsById': {
                str(feed.id): {
                    'id': feed.id,
                    'title': 'Feed X',
                    'text': user_title,
                    'siteUrl': 'http://example.com/',
                    'labels': [],
                    'unreadCount': 0,
                    'faveCount': 0,
                    'checked': None,
                    'updated': None,
                    'added': added.timestamp() * 1000,
                    'error': '',
                    'active': True,
                    'url': url,
                },
            },
            'feedOrder': [feed.id],
            'labelsById': {},
            'labelOrder': [],
        }, response.json())
        self.assertEqual(1, len(schedule_changed_signals))

    def test_update_labels(self):
        """
        A feed's label associations may be changed by the update action.
        """
        added = timezone.now() - datetime.timedelta(days=1)
        label_c = self.user.label_set.create(text='C')
        feed = self.user.feed_set.create(
            url='http://example.com/feedX.xml',
            feed_title='Feed X',
            site_url='http://example.com/',
            added=added,
        )
        label_b = feed.label_set.create(text='B', user=self.user)
        label_a = self.user.label_set.create(text='A')

        response = self.client.post('/api/inventory/', {
            'action': 'update-feed',
            'feed': feed.id,
            'url': feed.url,
            'active': 'on',
            'title': '',
            'label': [str(label_a.id), str(label_c.id)],
        })

        self.assertEqual(200, response.status_code)
        [feed] = self.user.feed_set.all()
        self.assertEqual({
            'feedsById': {
                str(feed.id): dictwith({
                    'labels': [1, 3],
                }),
            },
            'feedOrder': [feed.id],
            'labelsById': {
                str(label_a.id): dictwith({
                    'text': 'A',
                    'feeds': [feed.id],
                }),
                str(label_b.id): dictwith({
                    'text': 'B',
                    'feeds': [],
                }),
                str(label_c.id): dictwith({
                    'text': 'C',
                    'feeds': [feed.id],
                }),
            },
            'labelOrder': [label_a.id, label_b.id, label_c.id],
        }, response.json())

    def test_remove_feed(self):
        """
        The remove action can delete a single feed.
        """
        feed = self.user.feed_set.create(
            url='http://example.com/feed2.xml',
            feed_title='Feed 2',
            added=timezone.now() - datetime.timedelta(days=1),
        )

        response = self.client.post('/api/inventory/', {
            'action': 'remove',
            'feed': feed.id,
        })

        self.assertEqual(200, response.status_code)
        self.assertEqual(0, self.user.feed_set.count())
        self.assertEqual({
            'feedsById': {},
            'feedOrder': [],
            'labelsById': {},
            'labelOrder': [],
        }, response.json())
        self.assertRaises(Feed.DoesNotExist, Feed.objects.get, pk=feed.id)

    def test_remove_labels(self):
        """
        The remove action can delete a single label, leaving the associated
        feeds unaffected.
        """
        feed_a = self.user.feed_set.create(
            url='http://example.com/feed-a.xml',
            feed_title='Feed A',
            added=timezone.now() - datetime.timedelta(days=1),
        )
        label_a = feed_a.label_set.create(text='A', user=self.user)

        response = self.client.post('/api/inventory/', {
            'action': 'remove',
            'label': str(label_a.id),
        })

        self.assertEqual(200, response.status_code)
        self.assertEqual(1, self.user.feed_set.count())
        self.assertEqual({
            'feedsById': {
                str(feed_a.id): {
                    'id': feed_a.id,
                    'title': 'Feed A',
                    'text': '',
                    'siteUrl': '',
                    'labels': [],
                    'unreadCount': 0,
                    'faveCount': 0,
                    'checked': None,
                    'updated': None,
                    'added': mock.ANY,
                    'error': '',
                    'active': mock.ANY,
                    'url': 'http://example.com/feed-a.xml',
                },
            },
            'feedOrder': [feed_a.id],
            'labelsById': {},
            'labelOrder': [],
        }, response.json())
        self.assertRaises(Label.DoesNotExist, Label.objects.get, pk=label_a.id)

    def test_update_feed_activate(self):
        """
        A feed is scheduled to be checked following an update-feed action with
        active=on.
        """
        feed = self.user.feed_set.create(
            url='http://example.com/feed1.xml',
            feed_title='Feed 1',
            added=timezone.now(),
            next_check=None,
        )

        response = self.client.post('/api/inventory/', {
            'action': 'update-feed',
            'feed': feed.id,
            'active': 'on',
            'title': '',
            'url': 'http://example.com/feed1.xml',
        })

        self.assertEqual(200, response.status_code)
        [feed] = self.user.feed_set.all()
        self.assertIsNotNone(feed.next_check)
        self.assertEqual({
            'feedsById': {
                str(feed.id): dictwith({
                    'id': feed.id,
                    'active': True,
                }),
            },
            'feedOrder': [feed.id],
            'labelsById': {},
            'labelOrder': [],
        }, response.json())

    def test_update_feed_deactivate(self):
        """
        A feed is no longer scheduled to be checked following an update-feed
        action with active=off.
        """
        feed = self.user.feed_set.create(
            url='http://example.com/feed1.xml',
            feed_title='Feed 1',
            added=timezone.now(),
            next_check=None,
        )

        response = self.client.post('/api/inventory/', {
            'action': 'update-feed',
            'feed': feed.id,
            'active': 'off',
            'title': '',
            'url': 'http://example.com/feed1.xml',
        })

        self.assertEqual(200, response.status_code)
        [feed] = self.user.feed_set.all()
        self.assertIsNone(feed.next_check)
        self.assertEqual({
            'feedsById': {
                str(feed.id): dictwith({
                    'id': feed.id,
                    'active': False,
                }),
            },
            'feedOrder': [feed.id],
            'labelsById': {},
            'labelOrder': [],
        }, response.json())

    def test_update_label(self):
        """
        The update-label action sets the labels text and associated feeds.
        """
        feed_a = self.user.feed_set.create(
            url='http://example/a',
            feed_title='A',
            added=timezone.now(),
        )
        feed_b = self.user.feed_set.create(
            url='http://example/b',
            feed_title='B',
            added=timezone.now(),
        )
        feed_c = self.user.feed_set.create(
            url='http://example/c',
            feed_title='C',
            added=timezone.now(),
        )
        label_a = self.user.label_set.create(
            text='A',
        )
        label_a.feeds.set([feed_a, feed_c])

        response = self.client.post('/api/inventory/', {
            'action': 'update-label',
            'label': label_a.id,
            'feed': [feed_b.id, feed_c.id],
            'text': 'B&C',
        })

        self.assertEqual(200, response.status_code)

        # Label A was updated.
        updated = Label.objects.get(id=label_a.id)
        self.assertEqual("B&C", updated.text)
        self.assertRaises(Feed.DoesNotExist, updated.feeds.get, pk=feed_a.id)
        updated.feeds.get(pk=feed_b.id)
        updated.feeds.get(pk=feed_c.id)

        self.assertEqual({
            'feedsById': {
                str(feed_a.id): dictwith({
                    'id': feed_a.id,
                    'labels': [],
                }),
                str(feed_b.id): dictwith({
                    'id': feed_b.id,
                    'labels': [label_a.id],
                }),
                str(feed_c.id): dictwith({
                    'id': feed_c.id,
                    'labels': [label_a.id],
                }),
            },
            'feedOrder': [feed_a.id, feed_b.id, feed_c.id],
            'labelsById': {
                str(label_a.id): dictwith({
                    'text': 'B&C',
                    'feeds': [feed_b.id, feed_c.id],
                }),
            },
            'labelOrder': [label_a.id],
        }, response.json())


class RobotsTxtTests(TestCase):
    def test_get(self):
        """
        The robots.txt file is empty.
        """
        response = Client().get('/robots.txt')
        self.assertEqual(200, response.status_code)
        self.assertEqual(b'', response.content)

    def test_head(self):
        """
        Django automatically supports HEAD when GET is provided.
        """
        response = Client().get('/robots.txt')
        self.assertEqual(200, response.status_code)

    def test_post(self):
        """
        Unsupported methods are rejected.
        """
        response = Client().post('/robots.txt', {})
        self.assertEqual(405, response.status_code)
