# -*- coding: utf-8 -*-
# Copyright © 2017, 2018, 2019, 2020 Tom Most <twm@freecog.net>
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

import hashlib
from datetime import datetime, timedelta
from unittest import mock

import attr
import pytz
from attr.validators import instance_of
from django.contrib.auth.models import User
from django.test import TestCase as DjangoTestCase
from django.utils import timezone
from pkg_resources import resource_filename, resource_string
from treq.testing import RequestTraversalAgent, StubTreq
from twisted.internet import defer, error, task
from twisted.python.failure import Failure
from twisted.trial.unittest import SynchronousTestCase
from twisted.web import http, server, static
from twisted.web.client import ResponseNeverReceived, readBody
from twisted.web.resource import ErrorPage, IResource
from zope.interface import implementer

from ..fetch import (
    ArticleUpsert,
    BadStatus,
    BozoError,
    EmptyBody,
    Gone,
    MaybeUpdated,
    NetworkError,
    Unchanged,
    poll_feed,
)
from ..models import Feed

EMPTY_RSS = resource_string('yarrharr', 'examples/empty.rss')
SOME_HTML = resource_string('yarrharr', 'examples/nofeed.html')


@attr.s
class FetchFeed(object):
    """
    A `FetchFeed` object looks enough like :class:`yarrharr.models.Feed` that
    fetching works.
    """
    url = attr.ib(default=u'http://an.example/feed.xml')
    last_modified = attr.ib(default=b'', validator=instance_of(bytes))
    etag = attr.ib(default=b'', validator=instance_of(bytes))
    digest = attr.ib(default=b'', validator=instance_of(bytes))


def examples():
    """
    Produce a resource which serves the files in the `yarrharr/examples`
    directory.

    :returns: :class:`~twisted.web.resource.IResource` provider
    """
    examples = static.File(resource_filename('yarrharr', 'examples'))
    examples.contentTypes = {
        '.html': 'text/html',
        '.rss': 'application/rss+xml',
        '.atom': 'application/atom+xml',
    }
    return examples


@implementer(IResource)
@attr.s
class StaticResource:
    """
    `StaticResource` implements :class:`~twisted.web.resource.IResource`.
    It produces a static response for all requests.
    """
    content = attr.ib()
    content_type = attr.ib(default=b'application/xml')

    isLeaf = True

    def render(self, request):
        if self.content_type is None:
            ct = []
        else:
            ct = [self.content_type]
        request.responseHeaders.setRawHeaders(b'Content-Type', ct)
        return self.content


class StaticResourceTests(SynchronousTestCase):
    def test_content(self):
        client = StubTreq(StaticResource(content=b'abcd'))
        response = self.successResultOf(client.get('http://an.example/'))
        self.assertEqual(200, response.code)
        self.assertEqual([b'application/xml'], response.headers.getRawHeaders(b'Content-Type'))
        body = self.successResultOf(response.content())
        self.assertEqual(b'abcd', body)

    def test_content_type(self):
        client = StubTreq(StaticResource(content=b'hello', content_type='text/plain'))
        response = self.successResultOf(client.get('http://an.example/'))
        self.assertEqual(200, response.code)
        self.assertEqual([b'text/plain'], response.headers.getRawHeaders(b'Content-Type'))
        body = self.successResultOf(response.content())
        self.assertEqual(b'hello', body)

    def test_no_content_type(self):
        """
        Unlike `twisted.web.static.Data`, `StaticResource` can generate
        a request with no ``Content-Type`` header.
        """
        client = StubTreq(StaticResource(content=b'hello', content_type=None))
        response = self.successResultOf(client.get('http://an.example/'))
        self.assertEqual(None, response.headers.getRawHeaders(b'Content-Type'))


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
    last_modified = attr.ib(converter=str)
    content_type = attr.ib(default=b'application/xml')

    isLeaf = True

    def render(self, request):
        request.responseHeaders.setRawHeaders(b'Last-Modified', [self.last_modified])
        request.responseHeaders.setRawHeaders(b'Content-Type', [self.content_type])
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
    content_type = attr.ib(default='application/xml')

    isLeaf = True

    def render(self, request):
        request.responseHeaders.setRawHeaders(b'Content-Type', [self.content_type])
        if request.setETag(self.etag) == http.CACHED:
            return b''
        return self.content


class StaticEtagResourceTests(SynchronousTestCase):
    def test_no_match(self):
        client = StubTreq(StaticEtagResource(b'abcd', b'"abcd"'))
        response = self.successResultOf(client.get('http://an.example/'))
        self.assertEqual(200, response.code)
        self.assertEqual(['application/xml'], response.headers.getRawHeaders('Content-Type'))
        self.assertEqual(['"abcd"'], response.headers.getRawHeaders('Etag'))
        body = self.successResultOf(response.content())
        self.assertEqual(b'abcd', body)

    def test_match(self):
        client = StubTreq(StaticEtagResource(b'abcd', b'"abcd"'))
        response = self.successResultOf(client.get('http://an.example/', headers={
            'if-none-match': ['"abcd"'],
        }))
        self.assertEqual(304, response.code)
        self.assertEqual(['application/xml'], response.headers.getRawHeaders('Content-Type'))
        self.assertEqual(['"abcd"'], response.headers.getRawHeaders('Etag'))
        body = self.successResultOf(response.content())
        self.assertEqual(b'', body)


@implementer(IResource)
@attr.s
class BlackHoleResource(object):
    """
    `BlackHoleResource` accepts all requests but never responds.
    """
    isLeaf = True

    def render(self, request):
        return server.NOT_DONE_YET


class BlackHoleResourceTests(SynchronousTestCase):
    def test_no_response(self):
        agent = RequestTraversalAgent(BlackHoleResource())

        d = agent.request(b'GET', b'http://an.example/')

        self.assertNoResult(d)


@implementer(IResource)
@attr.s
class ForeverBodyResource(object):
    """
    `ForeverBodyResource` responds with headers, but never writes a
    response body.
    """
    isLeaf = True

    content_type = attr.ib(default='application/xml')

    def render(self, request):
        request.responseHeaders.setRawHeaders(b'Content-Type', [self.content_type])
        request.write(b'')  # Flush headers.
        return server.NOT_DONE_YET


class ForeverBodyResourceTests(SynchronousTestCase):
    def test_no_body(self):
        """
        `ForeverBodyResource` returns response headers, but no body.
        """
        agent = RequestTraversalAgent(ForeverBodyResource())

        response = self.successResultOf(agent.request(b'GET', b'https://an.example/'))
        d = readBody(response)

        self.assertNoResult(d)


@attr.s
class ErrorTreq(object):
    """
    A treq-alike mock which only supports GET requests. Calling the
    :meth:`.get()` method results in a failed Deferred.
    """
    _error = attr.ib(validator=attr.validators.instance_of(Exception))

    def get(self, *a, **kw):
        return defer.fail(Failure(self._error))


class FetchTests(SynchronousTestCase):
    """
    Test `yarrharr.fetch.poll_feed()`.

    :ivar clock: `twisted.internet.task.Clock` instance
    """
    def setUp(self):
        self.clock = task.Clock()

    def test_raw_content_not_sanitized(self):
        """
        feedparser's HTML sanitization is disabled so that we can implement
        custom sanitization.
        """
        feed = FetchFeed()
        xml = resource_string('yarrharr', 'examples/html-script.rss')
        client = StubTreq(StaticResource(xml))

        outcome = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertIn(u'<script>', outcome.articles[0].raw_content)

    def test_feed_title_html(self):
        """
        HTML in the feed title is sanitized.
        """
        feed = FetchFeed()
        xml = resource_string('yarrharr', 'examples/html-title.atom')
        client = StubTreq(StaticResource(xml))

        outcome = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertIsInstance(outcome, MaybeUpdated)
        self.assertEqual(u'Feed with HTML <title/>', outcome.feed_title)

    def test_raw_title_html(self):
        """
        HTML in article titles is sanitized passes through in the `raw_title`
        field.
        """
        feed = FetchFeed()
        xml = resource_string('yarrharr', 'examples/html-title.atom')
        client = StubTreq(StaticResource(xml))

        outcome = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertIsInstance(outcome, MaybeUpdated)
        self.assertEqual(u'Feed with HTML <title/>', outcome.feed_title)
        self.assertEqual(
            '&lt;b&gt;Entry with Escaped HTML &amp;lt;title/&amp;gt;&lt;/b&gt;',
            outcome.articles[0].raw_title,
        )

    def test_title_htmlish(self):
        """
        Sometimes feeds have plain text titles which resemble HTML. feedparser
        may translate such a title into plain text. When it does this we must
        escape the text so that it is valid HTML in the `raw_title` field.
        """
        feed = FetchFeed()
        xml = resource_string('yarrharr', 'examples/htmlish-title.rss')
        client = StubTreq(StaticResource(xml, b'text/xml;charset=utf-8'))

        outcome = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertIsInstance(outcome, MaybeUpdated)
        self.assertEqual('<notreallyhtml>', outcome.feed_title)
        self.assertEqual('It goes &lt;bing&gt;', outcome.articles[0].raw_title)

    def test_title_missing_atom(self):
        """
        An Atom feed that lacks a title gets a title based on its URL.
        """
        feed = FetchFeed()
        xml = resource_string('yarrharr', 'examples/no-feed-title.atom')
        client = StubTreq(StaticResource(xml, b'text/xml;charset=utf-8'))

        outcome = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertIsInstance(outcome, MaybeUpdated)
        self.assertEqual(feed.url, outcome.feed_title)

    def test_title_missing_rss(self):
        """
        An RSS feed that lacks a title gets a title based on its URL.
        """
        feed = FetchFeed()
        xml = resource_string('yarrharr', 'examples/no-feed-title.rss')
        client = StubTreq(StaticResource(xml, b'text/xml;charset=utf-8'))

        outcome = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertIsInstance(outcome, MaybeUpdated)
        self.assertEqual(feed.url, outcome.feed_title)

    def test_entry_without_title(self):
        """
        An entry in a RSS feed may lack a title. This resolves to an empty
        string for the raw_title.
        """
        feed = FetchFeed()
        xml = resource_string('yarrharr', 'examples/no-item-title.rss')
        client = StubTreq(StaticResource(xml, b'text/xml; charset=utf-8'))

        outcome = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertIsInstance(outcome, MaybeUpdated)
        self.assertEqual('', outcome.articles[0].raw_title)

    def test_no_content_type(self):
        """
        We can cope with an RSS feed lacking a ``Content-Type`` header without
        raising an exception.
        """
        feed = FetchFeed()
        xml = resource_string("yarrharr", "examples/empty.rss")
        client = StubTreq(StaticResource(xml, content_type=None))

        self.successResultOf(poll_feed(feed, self.clock, client))

    def test_connection_refused(self):
        """
        An expected error type when connecting produces a NetworkError.
        """
        feed = FetchFeed()
        client = ErrorTreq(ResponseNeverReceived([
            # IndentationError is subbing in here for this weird OpenSSL thing:
            #
            #     Failure: twisted.web._newclient.ResponseNeverReceived:
            #     [<twisted.python.failure.Failure OpenSSL.SSL.Error: [
            #      ('SSL routines', 'tls_process_server_certificate',
            #       'certificate verify failed')]>]
            Failure(IndentationError('TLS certificate verify failed')),
        ]))

        result = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertEqual(
            NetworkError('TLS certificate verify failed'),
            result,
        )

    def test_tls_cert_error(self):
        """
        A TLS certificate error produces a NetworkError.
        """
        feed = FetchFeed()
        client = ErrorTreq(error.ConnectionRefusedError(
            '111: Connection refused'))

        result = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertEqual(
            NetworkError('Connection was refused by other side: 111: Connection refused.'),
            result,
        )

    def test_timeout_response(self):
        """
        A timeout when making the request produces a NetworkError.
        """
        feed = FetchFeed()
        client = StubTreq(BlackHoleResource())

        d = poll_feed(feed, self.clock, client)
        self.clock.advance(30 + 1)
        result = self.successResultOf(d)

        self.assertEqual(
            NetworkError('Request timed out after 30 seconds'),
            result,
        )

    def test_timeout_body(self):
        """
        A timeout when reading the response body produces a NetworkError.
        """
        feed = FetchFeed()
        client = StubTreq(ForeverBodyResource())

        d = poll_feed(feed, self.clock, client)
        self.clock.advance(30 + 1)
        result = self.successResultOf(d)

        self.assertEqual(
            NetworkError('Reading the response body timed out after 30 seconds'),
            result,
        )

    def test_410_gone(self):
        """
        A 410 HTTP status code translates to a Gone result.
        """
        feed = FetchFeed()
        client = StubTreq(ErrorPage(410, 'Gone', 'Gone'))

        result = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertEqual(Gone(), result)

    def test_404_not_found(self):
        """
        A 404 HTTP status code translates to a BadStatus result.
        """
        feed = FetchFeed()
        client = StubTreq(ErrorPage(404, 'Not Found', '???'))

        result = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertEqual(BadStatus(404), result)

    def test_content_unchanged(self):
        """
        If the bytes of the response don't change, the feed is considered Unchanged.
        """
        digest = hashlib.sha256(EMPTY_RSS).digest()
        feed = FetchFeed(digest=digest)
        client = StubTreq(StaticResource(EMPTY_RSS))

        result = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertEqual(Unchanged(u'digest'), result)

    def test_etag_304(self):
        """
        The ``If-None-Match`` header is sent when there is a stored Etag. If
        this results in a 304 Not Modified response, the feed is regarded as
        Unchanged.
        """
        feed = FetchFeed(etag=b'"abcd"')
        client = StubTreq(StaticEtagResource(EMPTY_RSS, b'"abcd"'))

        result = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertEqual(Unchanged(u'etag'), result)

    def test_etag_200(self):
        """
        When the ``If-None-Match`` header does not match, a 200 response is
        processed normally.
        """
        feed = FetchFeed(etag=b'"abcd"')
        client = StubTreq(StaticEtagResource(EMPTY_RSS, '"1234"'))

        result = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertEqual(MaybeUpdated(
            feed_title=u'Empty RSS feed',
            site_url=u'http://an.example/',
            etag=b'"1234"',
            last_modified=b'',
            digest=mock.ANY,
            articles=[],
            check_time=mock.ANY,
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

        result = self.successResultOf(poll_feed(feed, self.clock, client))

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

        result = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertEqual(MaybeUpdated(
            feed_title=u'Empty RSS feed',
            site_url=u'http://an.example/',
            etag=b'',
            last_modified=b'Tue, 7 Feb 2017 10:25:00 GMT',
            digest=mock.ANY,
            articles=[],
            check_time=mock.ANY,
        ), result)

    def test_bozo_html(self):
        """
        When feedparser sets the bozo bit and fails to extract anything useful
        from the document, BozoError results. In this case a HTML document
        provides nothing useful.
        """
        feed = FetchFeed('http://an.example/nofeed.html')
        client = StubTreq(StaticResource(SOME_HTML, b'text/html'))

        outcome = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertEqual(BozoError(code=200, content_type=u'text/html', error=mock.ANY), outcome)

    def test_bozo_empty(self):
        """
        A zero-byte response body causes feedparser to return this nonsense::

             {'bozo': False, 'entries': [], 'feed': {}, 'headers': {}}

        To avoid blanking out the feed title if it temporarily errors out in
        this way we catch this case earlier, producing an `EmptyBody` result.
        """
        feed = FetchFeed('https://an.example/0byte')
        client = StubTreq(StaticResource(b"", content_type=None))

        outcome = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertEqual(EmptyBody(code=200, content_type=""), outcome)

    def test_updated_only(self):
        """
        An Atom feed which only has entry dates from ``<updated>`` tags is
        interpreted as having articles with the dates according to the
        ``<updated>`` tags.
        """
        feed = FetchFeed()
        xml = resource_string('yarrharr', 'examples/updated-only.atom')
        client = StubTreq(StaticResource(xml))

        outcome = self.successResultOf(poll_feed(feed, self.clock, client))

        self.assertIsInstance(outcome, MaybeUpdated)
        self.assertEqual([
            datetime(2017, 3, 17, tzinfo=pytz.UTC),
            datetime(2013, 1, 1, tzinfo=pytz.UTC),
        ], [article.date for article in outcome.articles])


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
            check_time=timezone.now(),
        )

        mu.persist(self.feed)

        self.assertEqual(u'', self.feed.error)
        self.assertEqual(u'After', self.feed.feed_title)
        self.assertEqual(mu.check_time, self.feed.last_checked)
        self.assertEqual(mu.check_time, self.feed.last_changed)
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
        An article which does not match any in the database is inserted. This
        marks the feed as changed.
        """
        mu = MaybeUpdated(
            feed_title=u'Example',
            site_url=u'https://example.com/',
            articles=[
                ArticleUpsert(
                    author=u'Joe Bloggs',
                    raw_title='Blah Blah',
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

        self.assertEqual(mu.check_time, self.feed.last_changed)
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
        mu = MaybeUpdated(
            feed_title=u'Example',
            site_url=u'https://example.com/',
            articles=[
                ArticleUpsert(
                    author=u'Joe Bloggs',
                    raw_title=u'Blah Blah',
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

        [article] = self.feed.articles.all()
        self.assertEqual(mu.check_time, article.date)

    def test_persist_article_guid_match(self):
        """
        An article which matches by GUID is updated in place. This counts as
        a feed update.
        """
        self.feed.articles.create(
            read=True,
            fave=False,
            author=u'???',
            title=u'???',
            date=datetime(2000, 1, 2, 3, 4, 5, tzinfo=timezone.utc),
            url=u'http://example.com/blah-blah',
            guid=u'49e3c525-724c-44d8-ad0c-d78bd216d003',
            raw_content='',
            content='',
        )
        mu = MaybeUpdated(
            feed_title=u'After',
            site_url=u'https://example.com/',
            articles=[
                ArticleUpsert(
                    author=u'Joe Bloggs',
                    raw_title='Blah Blah',
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

        self.assertEqual(mu.check_time, self.feed.last_changed)
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

    def test_persist_article_guid_http_to_https_match(self):
        """
        When the article GUID is a HTTPS URL, it is also matched against an
        existing article where the GUID has the HTTP scheme.
        """
        self.feed.articles.create(
            read=True,
            fave=False,
            author='???',
            title='???',
            date=datetime(2000, 1, 2, 3, 4, 5, tzinfo=timezone.utc),
            url='http://www.example.com/blah-blah',
            guid='http://example.com/1',
            raw_content='',
            content='',
        )
        mu = MaybeUpdated(
            feed_title='After',
            site_url='https://example.com/',
            articles=[
                ArticleUpsert(
                    author='Joe Bloggs',
                    raw_title='Blah Blah',
                    url='https://www2.example.com/blah-blah',
                    date=timezone.now(),
                    guid='https://example.com/1',
                    raw_content='<p>Hello, world!</p>',
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
            url='https://www2.example.com/blah-blah',
            guid='https://example.com/1',
        )

    def test_persist_article_url_match(self):
        """
        An article which matches by URL when no GUID is available is updated in
        place.
        """
        new_date = datetime(2011, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
        self.feed.articles.create(
            read=True,
            fave=False,
            author='???',
            raw_title='???',
            title='???',
            date=datetime(1999, 1, 2, 3, 4, 5, tzinfo=timezone.utc),
            url=u'https://example.com/blah-blah',
            guid=u'',  # Must not have a GUID to match by URL
            raw_content='',
            content='',
        )
        mu = MaybeUpdated(
            feed_title=u'Blah Blah',
            site_url=u'https://example.com/',
            articles=[
                ArticleUpsert(
                    author=u'Joe Bloggs',
                    raw_title='Blah Blah',
                    date=new_date,
                    url=u'https://example.com/blah-blah',
                    guid=u'',
                    raw_content=u'<p>Hello, world!</p>',
                ),
            ],
            etag=b'',
            last_modified=b'',
            digest=b'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        )

        mu.persist(self.feed)

        [article] = self.feed.articles.all()
        self.assertFields(
            article,
            read=True,  # It does not become unread due to the update.
            fave=False,
            author=u'Joe Bloggs',
            raw_title='Blah Blah',
            date=new_date,
            url=u'https://example.com/blah-blah',
            raw_content='<p>Hello, world!</p>',
        )

    def test_persist_article_https_to_http_url_match(self):
        """
        An article with a HTTPS URL can match an older article with the
        equivalent HTTP URL.
        """
        new_date = datetime(2011, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
        self.feed.articles.create(
            read=True,
            fave=True,
            author='???',
            raw_title='???',
            title='???',
            date=datetime(1999, 1, 2, 3, 4, 5, tzinfo=timezone.utc),
            url='http://example.com/blah-blah',
            guid='',  # Must not have a GUID to match by URL
            raw_content='',
            content='',
        )
        mu = MaybeUpdated(
            feed_title='Blah Blah',
            site_url='https://example.com/',
            articles=[
                ArticleUpsert(
                    author='Joe Bloggs',
                    raw_title='Blah Blah',
                    date=new_date,
                    url='https://example.com/blah-blah',
                    guid='',
                    raw_content=u'<p>Hello, world!</p>',
                ),
            ],
            etag=b'',
            last_modified=b'',
            digest=b'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        )

        mu.persist(self.feed)

        [article] = self.feed.articles.all()
        self.assertFields(
            article,
            read=True,  # It does not become unread due to the update.
            fave=True,
            author=u'Joe Bloggs',
            raw_title='Blah Blah',
            date=new_date,
            url=u'https://example.com/blah-blah',
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
                    raw_title='Blah &amp; Blah',
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

        self.assertEqual(u'<b>Example</b>', self.feed.title)
        [article] = self.feed.articles.all()
        self.assertFields(
            article,
            raw_title='Blah &amp; Blah',
            title='Blah & Blah',
            raw_content=(
                '<p>Hello, <style>...</style>world'
                '<script type="text/javascript">alert("lololol")</script>!'
            ),
            content='<p>Hello, world!',
        )


class BozoErrorTests(DjangoTestCase):
    def test_persist(self):
        """
        The attributes of BozoError are used to form a message for the feed's
        error field.
        """
        user = User.objects.create_user(
            username='user',
            email='someone@example.net',
            password='sesame',
        )
        feed = Feed.objects.create(
            user=user,
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
        be = BozoError(
            code=201,
            content_type=u'text/plain',
            error='Not XML',
        )

        be.persist(feed)

        # XXX Should we store the conditional get values and digest on error too?
        self.assertEqual(feed.etag, b'')
        self.assertEqual(feed.last_modified, b'')
        self.assertEqual(feed.digest, b'')
        self.assertEqual(u'Fetch failed: processing HTTP 201 text/plain response produced error: Not XML', feed.error)
