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

import datetime

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.utils import timezone
import mock

# from ..models import Feed


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

    maxDiff = None

    def test_create(self):
        url = u'http://example.com/feed.xml'
        c = Client()
        c.force_login(self.user)

        response = c.post('/api/inventory/', {'action': 'create', 'url': url})

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
                    'checked': '',
                    'updated': '',
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

    def test_update(self):
        """
        A feed's user title and feed URL may be changed by the update action.
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
        c = Client()
        c.force_login(self.user)

        response = c.post('/api/inventory/', {
            'action': 'update',
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
                    'checked': '',
                    'updated': '',
                    'added': str(added),  # FIXME use RFC 3339 format
                    'error': '',
                    'active': True,
                    'url': url,
                },
            },
            'feedOrder': [feed.id],
            'labelsById': {},
            'labelOrder': [],
        }, response.json())

    def test_remove(self):
        feed = self.user.feed_set.create(
            url='http://example.com/feed2.xml',
            feed_title='Feed 2',
            added=timezone.now() - datetime.timedelta(days=1),
        )
        c = Client()
        c.force_login(self.user)

        response = c.post('/api/inventory/', {
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

    def test_activate(self):
        """
        A feed is scheduled to be checked by the activate action.
        """
        feed = self.user.feed_set.create(
            url='http://example.com/feed1.xml',
            feed_title='Feed 1',
            added=timezone.now(),
            next_check=None,
        )
        c = Client()
        c.force_login(self.user)

        response = c.post('/api/inventory/', {
            'action': 'update',
            'feed': feed.id,
            'active': 'on',
            'title': '',
            'url': 'http://example.com/feed1.xml',
        })

        self.assertEqual(200, response.status_code)
        [feed] = self.user.feed_set.all()
        self.assertIsNotNone(feed.next_check)

    def test_deactivate(self):
        """
        A feed is no longer scheduled to be checked following the deactivate
        action.
        """
        feed = self.user.feed_set.create(
            url='http://example.com/feed1.xml',
            feed_title='Feed 1',
            added=timezone.now(),
            next_check=None,
        )
        c = Client()
        c.force_login(self.user)

        response = c.post('/api/inventory/', {
            'action': 'deactivate',
            'feed': feed.id,
            'active': 'off',
            'title': '',
            'url': 'http://example.com/feed1.xml',
        })

        self.assertEqual(200, response.status_code)
        [feed] = self.user.feed_set.all()
        self.assertIsNone(feed.next_check)


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
