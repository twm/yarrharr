# -*- coding: utf-8 -*-
# Copyright © 2017 Tom Most <twm@freecog.net>
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

from datetime import datetime, timedelta
import hashlib

import attr
from attr.validators import instance_of
from django.contrib.auth.models import User
from django.test import TestCase as DjangoTestCase
from django.utils import timezone
import mock
from twisted.trial.unittest import SynchronousTestCase
from twisted.web import http, static
from twisted.web.resource import ErrorPage, IResource
from treq.testing import StubTreq
from pkg_resources import resource_filename, resource_string
from zope.interface import implementer

from ..models import Feed
from ..fetch import poll_feed, ArticleUpsert, BadStatus, Gone, MaybeUpdated
from ..fetch import Unchanged


EMPTY_RSS = resource_string('yarrharr', 'examples/empty.rss')


@attr.s
class FetchFeed(object):
    """
    A `FetchFeed` object looks enough like :class:`yarrharr.models.Feed` that
    fetching works.
    """
    url = attr.ib(default=u'http://an.example/feed.xml')
    last_modified = attr.ib(default=b'', validator=instance_of(bytes))
    etag = attr.ib(default=b'', validator=instance_of(bytes))
    digest = attr.ib(default=buffer(b''), convert=buffer, validator=instance_of(buffer))


def examples():
    """
    Produce a resource which serves the files in the `yarrharr/examples`
    directory.

    :returns: :class:`~twisted.web.resource.IResource` provider
    """
    examples = static.File(resource_filename('yarrharr', 'examples'))
    examples.contentTypes = {
        '.rss': 'application/rss+xml',
        '.atom': 'application/atom+xml',
    }
    return examples


@implementer(IResource)
@attr.s
class StaticResource(object):
    """
    `StaticLastModifiedResource` implements :class:`~twisted.web.resource.IResource`.
    It produces a static response for all requests.
    """
    content = attr.ib()

    isLeaf = True

    def render(self, request):
        return self.content


class StaticResourceTests(SynchronousTestCase):
    def test_no_match(self):
        client = StubTreq(StaticResource(content=b'abcd'))
        response = self.successResultOf(client.get('http://an.example/'))
        self.assertEqual(200, response.code)
        body = self.successResultOf(response.content())
        self.assertEqual(b'abcd', body)


@implementer(IResource)
@attr.s
class StaticLastModifiedResource(object):
    """
    `StaticLastModifiedResource` implements
    :class:`~twisted.web.resource.IResource`.  It produces a static response
    for all requests, except that it supports conditional match based on
    ``If-Modified-Since``. The handling of ``If-Modified-Since`` is an exact
    string match on the header value rather than a more correct comparison
    because Yarrharr should echo the exact date back to the server to allow for
    brittle implementations (rumor says this is necessary).
    """
    content = attr.ib()
    last_modified = attr.ib(convert=str)

    isLeaf = True

    def render(self, request):
        request.responseHeaders.setRawHeaders(b'Last-Modified', [self.last_modified])
        if request.requestHeaders.getRawHeaders('If-Modified-Since') == [self.last_modified]:
            request.setResponseCode(304)
            return b''
        request.setResponseCode(200)
        return self.content


class StaticLastModifiedResourceTests(SynchronousTestCase):
    def test_no_match(self):
        client = StubTreq(StaticLastModifiedResource(
            content=b'abcd',
            last_modified=u'Mon, 6 Feb 2017 00:00:00 GMT',
        ))
        response = self.successResultOf(client.get('http://an.example/'))
        self.assertEqual(200, response.code)
        self.assertEqual([u'Mon, 6 Feb 2017 00:00:00 GMT'],
                         response.headers.getRawHeaders(u'Last-Modified'))
        body = self.successResultOf(response.content())
        self.assertEqual(b'abcd', body)

    def test_match(self):
        client = StubTreq(StaticLastModifiedResource(
            content=b'abcd',
            last_modified=u'Mon, 6 Feb 2017 00:00:00 GMT',
        ))
        response = self.successResultOf(client.get('http://an.example/', headers={
            'if-modified-since': [u'Mon, 6 Feb 2017 00:00:00 GMT'],
        }))
        self.assertEqual(304, response.code)
        self.assertEqual([u'Mon, 6 Feb 2017 00:00:00 GMT'],
                         response.headers.getRawHeaders(u'Last-Modified'))
        body = self.successResultOf(response.content())
        self.assertEqual(b'', body)


@implementer(IResource)
@attr.s
class StaticEtagResource(object):
    """
    `StaticEtagResource` implements :class:`~twisted.web.resource.IResource`.
    It produces a static response and supports conditional gets based on
    ``Etag`` and ``If-None-Match``.
    """
    content = attr.ib()
    etag = attr.ib()

    isLeaf = True

    def render(self, request):
        if request.setETag(self.etag) == http.CACHED:
            return b''
        return self.content


class StaticEtagResourceTests(SynchronousTestCase):
    def test_no_match(self):
        client = StubTreq(StaticEtagResource(b'abcd', b'"abcd"'))
        response = self.successResultOf(client.get('http://an.example/'))
        self.assertEqual(200, response.code)
        self.assertEqual(['"abcd"'], response.headers.getRawHeaders('Etag'))
        body = self.successResultOf(response.content())
        self.assertEqual(b'abcd', body)

    def test_match(self):
        client = StubTreq(StaticEtagResource(b'abcd', b'"abcd"'))
        response = self.successResultOf(client.get('http://an.example/', headers={
            'if-none-match': ['"abcd"'],
        }))
        self.assertEqual(304, response.code)
        self.assertEqual(['"abcd"'], response.headers.getRawHeaders('Etag'))
        body = self.successResultOf(response.content())
        self.assertEqual(b'', body)


class FetchTests(SynchronousTestCase):
    def test_410_gone(self):
        """
        A 410 HTTP status code translates to a Gone result.
        """
        feed = FetchFeed()
        client = StubTreq(ErrorPage(410, 'Gone', 'Gone'))

        result = self.successResultOf(poll_feed(feed, client))

        self.assertEqual(Gone(), result)

    def test_404_not_found(self):
        """
        A 404 HTTP status code translates to a BadStatus result.
        """
        feed = FetchFeed()
        client = StubTreq(ErrorPage(404, 'Not Found', '???'))

        result = self.successResultOf(poll_feed(feed, client))

        self.assertEqual(BadStatus(404), result)

    def test_content_unchanged(self):
        """
        If the bytes of the response don't change, the feed is considered Unchanged.
        """
        digest = hashlib.sha256(EMPTY_RSS).digest()
        feed = FetchFeed(digest=digest)
        client = StubTreq(StaticResource(EMPTY_RSS))

        result = self.successResultOf(poll_feed(feed, client))

        self.assertEqual(Unchanged(u'digest'), result)

    def test_etag_304(self):
        """
        The ``If-None-Match`` header is sent when there is a stored Etag. If
        this results in a 304 Not Modified response, the feed is regarded as
        Unchanged.
        """
        feed = FetchFeed(etag=b'"abcd"')
        client = StubTreq(StaticEtagResource(EMPTY_RSS, b'"abcd"'))

        result = self.successResultOf(poll_feed(feed, client))

        self.assertEqual(Unchanged(u'etag'), result)

    def test_etag_200(self):
        """
        When the ``If-None-Match`` header does not match, a 200 response is
        processed normally.
        """
        feed = FetchFeed(etag=b'"abcd"')
        client = StubTreq(StaticEtagResource(EMPTY_RSS, '"1234"'))

        result = self.successResultOf(poll_feed(feed, client))

        self.assertEqual(MaybeUpdated(
            feed_title=u'Empty RSS feed',
            site_url=u'http://an.example/',
            etag=b'"1234"',
            last_modified=b'',
            digest=mock.ANY,
            articles=[],
        ), result)

    def test_last_modified_304(self):
        """
        The ``If-Modified-Since`` header is sent when there is a stored date.
        When this produces a 304 Not Modified response, the feed is regarded as
        Unchanged.
        """
        feed = FetchFeed(last_modified=b'Tue, 7 Feb 2017 10:25:00 GMT')
        client = StubTreq(StaticLastModifiedResource(
            content=EMPTY_RSS,
            last_modified='Tue, 7 Feb 2017 10:25:00 GMT',
        ))

        result = self.successResultOf(poll_feed(feed, client))

        self.assertEqual(Unchanged(u'last-modified'), result)

    def test_last_modified_200(self):
        """
        When the ``If-Modified-Since`` header does not match, a 200 response is
        processed normally.
        """
        feed = FetchFeed(last_modified=b'Mon, 6 Feb 2017 00:00:00 GMT')
        client = StubTreq(StaticLastModifiedResource(
            content=EMPTY_RSS,
            last_modified=u'Tue, 7 Feb 2017 10:25:00 GMT',
        ))

        result = self.successResultOf(poll_feed(feed, client))

        self.assertEqual(MaybeUpdated(
            feed_title=u'Empty RSS feed',
            site_url=u'http://an.example/',
            etag=b'',
            last_modified=b'Tue, 7 Feb 2017 10:25:00 GMT',
            digest=mock.ANY,
            articles=[],
        ), result)


class MaybeUpdatedTests(DjangoTestCase):
    """
    `fetch()` returns `MaybeUpdated` when it successfully retrieves a feed. Its
    `persist()` method is called to update the database.
    """
    def assertFields(self, o, **expected):
        actual = {}
        for key in expected:
            actual[key] = getattr(o, key)
        self.assertEqual(expected, actual)

    def setUp(self):
        self.user = User.objects.create_user(
            username='user',
            email='someone@example.net',
            password='sesame',
        )
        self.feed = Feed.objects.create(
            user=self.user,
            url='https://example.com/feed',
            site_url=u'',
            added=timezone.now(),
            next_check=timezone.now(),
            feed_title=u'Before',
            user_title=u'',
            etag=b'',
            last_modified=b'',
            digest=b'',
        )

    def test_persist_update_feed_meta(self):
        """
        When no articles are present, only feed metadata is refreshed.
        """
        mu = MaybeUpdated(
            feed_title=u'After',
            site_url=u'https://example.com/',
            articles=[],
            etag=b'"etag"',
            last_modified=b'Tue, 15 Nov 1994 12:45:26 GMT',
            digest=b'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        )

        mu.persist(self.feed)

        self.assertEqual(u'', self.feed.error)
        self.assertEqual(u'After', self.feed.feed_title)
        self.assertEqual(u'https://example.com/', self.feed.site_url)
        self.assertEqual(b'"etag"', self.feed.etag)
        self.assertEqual(b'Tue, 15 Nov 1994 12:45:26 GMT', self.feed.last_modified)
        self.assertEqual(b'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', self.feed.digest)
        # Right now scheduling is naïve, but this will need to be changed
        # when that does.
        self.assertGreater(self.feed.next_check,
                           timezone.now() + timedelta(hours=12))

    def test_persist_new_article(self):
        """
        An article which does not match any in the database is inserted.
        """
        mu = MaybeUpdated(
            feed_title=u'Example',
            site_url=u'https://example.com/',
            articles=[
                ArticleUpsert(
                    author=u'Joe Bloggs',
                    title=u'Blah Blah',
                    url=u'https://example.com/blah-blah',
                    date=timezone.now(),
                    guid=u'doesnotexist',
                    raw_content=u'<p>Hello, world!</p>',
                ),
            ],
            etag=b'"etag"',
            last_modified=b'Tue, 15 Nov 1994 12:45:26 GMT',
            digest=b'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        )

        mu.persist(self.feed)

        [article] = self.feed.articles.all()
        self.assertFields(
            article,
            read=False,
            fave=False,
            author=u'Joe Bloggs',
            title=u'Blah Blah',
            url=u'https://example.com/blah-blah',
            raw_content=u'<p>Hello, world!</p>',
            content=u'<p>Hello, world!',
        )

    def test_persist_article_lacking_date(self):
        """
        The current date is assigned to articles which did not include one in
        the feed. When checking for updates this gives a decent approximation
        of when the article was actually posted, though it does mean that all
        articles in the feed when it is first added have the same date.
        """
        lower_bound = timezone.now()
        mu = MaybeUpdated(
            feed_title=u'Example',
            site_url=u'https://example.com/',
            articles=[
                ArticleUpsert(
                    author=u'Joe Bloggs',
                    title=u'Blah Blah',
                    url=u'https://example.com/blah-blah',
                    date=None,
                    guid=u'49e3c525-724c-44d8-ad0c-d78bd216d003',
                    raw_content=u'<p>Hello, world!</p>',
                ),
            ],
            etag=b'"etag"',
            last_modified=b'Tue, 15 Nov 1994 12:45:26 GMT',
            digest=b'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        )

        mu.persist(self.feed)

        upper_bound = timezone.now()
        [article] = self.feed.articles.all()
        self.assertTrue(lower_bound <= article.date <= upper_bound)

    def test_persist_article_guid_match(self):
        """
        An article which matches by GUID is updated in place.
        """
        self.feed.articles.create(
            read=True,
            fave=False,
            author=u'???',
            title=u'???',
            date=datetime(2000, 1, 2, 3, 4, 5, tzinfo=timezone.utc),
            url=u'http://example.com/blah-blah',
            guid=u'49e3c525-724c-44d8-ad0c-d78bd216d003',
            raw_content=b'',
            content=b'',
        )
        mu = MaybeUpdated(
            feed_title=u'After',
            site_url=u'https://example.com/',
            articles=[
                ArticleUpsert(
                    author=u'Joe Bloggs',
                    title=u'Blah Blah',
                    url=u'https://example.com/blah-blah',
                    date=timezone.now(),
                    guid=u'49e3c525-724c-44d8-ad0c-d78bd216d003',
                    raw_content=u'<p>Hello, world!</p>',
                ),
            ],
            etag=b'"etag"',
            last_modified=b'Tue, 15 Nov 1994 12:45:26 GMT',
            digest=b'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        )

        mu.persist(self.feed)

        [article] = self.feed.articles.all()
        self.assertFields(
            article,
            read=True,  # It does not become unread due to the update.
            fave=False,
            author=u'Joe Bloggs',
            title=u'Blah Blah',
            url=u'https://example.com/blah-blah',
            raw_content=u'<p>Hello, world!</p>',
            content=u'<p>Hello, world!',
        )

    def test_persist_article_sanitize(self):
        """
        The HTML associated with an article is sanitized when it is persisted.
        """
        mu = MaybeUpdated(
            feed_title=u'<b>Example</b>',
            site_url=u'https://example.com/',
            articles=[
                ArticleUpsert(
                    author=u'Joe Bloggs',
                    title=u'Blah <i>Blah</i>',
                    url=u'https://example.com/blah-blah',
                    date=timezone.now(),
                    guid=u'49e3c525-724c-44d8-ad0c-d78bd216d003',
                    raw_content=u'<p>Hello, <style>...</style>world'
                                u'<script type="text/javascript">alert("lololol")</script>!',
                ),
            ],
            etag=b'"etag"',
            last_modified=b'Tue, 15 Nov 1994 12:45:26 GMT',
            digest=b'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        )

        mu.persist(self.feed)

        self.assertEqual(u'Example', self.feed.title)
        [article] = self.feed.articles.all()
        self.assertFields(
            article,
            title=u'Blah Blah',
            raw_content=u'<p>Hello, <style>...</style>world'
                        u'<script type="text/javascript">alert("lololol")</script>!',
            content=u'<p>Hello, world!',
        )
