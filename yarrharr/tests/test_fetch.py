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

import attr
from twisted.trial.unittest import SynchronousTestCase
from twisted.web import http, static
from twisted.web.resource import ErrorPage, IResource
from treq.testing import StubTreq
from pkg_resources import resource_filename, resource_string
from zope.interface import implementer

from ..fetch import poll_feed, BadStatus, Gone, MaybeUpdated, Unchanged


EMPTY_RSS = resource_string('yarrharr', 'examples/empty.rss')


@attr.s
class FetchFeed(object):
    """
    A `FetchFeed` object looks enough like :class:`yarrharr.models.Feed` that
    fetching works.
    """
    url = attr.ib(default=u'http://an.example/feed.xml')
    last_modified = attr.ib(default=None)
    etag = attr.ib(default=None)


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

    def putChild(self, path, child):
        raise NotImplementedError()

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

    def putChild(self, path, child):
        raise NotImplementedError()

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

    def test_etag_304(self):
        """
        The ``If-None-Match`` header is sent when there is a stored Etag. If
        this results in a 304 Not Modified response, the feed is regarded as
        Unchanged.
        """
        feed = FetchFeed(etag=u'"abcd"')
        client = StubTreq(StaticEtagResource(EMPTY_RSS, '"abcd"'))

        result = self.successResultOf(poll_feed(feed, client))

        self.assertEqual(Unchanged(), result)

    def test_etag_200(self):
        """
        When the ``If-None-Match`` header does not match, a 200 response is
        processed normally.
        """
        feed = FetchFeed(etag=u'"abcd"')
        client = StubTreq(StaticEtagResource(EMPTY_RSS, '"1234"'))

        result = self.successResultOf(poll_feed(feed, client))

        self.assertEqual(MaybeUpdated(
            feed_title=u'Empty RSS feed',
            site_url=u'http://an.example/',
            etag=u'"1234"',
            last_modified=None,
            articles=[],
        ), result)

    def test_last_modified_304(self):
        """
        The ``If-Modified-Since`` header is sent when there is a stored date.
        When this produces a 304 Not Modified response, the feed is regarded as
        Unchanged.
        """
        feed = FetchFeed(last_modified=u'Tue, 7 Feb 2017 10:25:00 GMT')
        client = StubTreq(StaticLastModifiedResource(
            content=EMPTY_RSS,
            last_modified='Tue, 7 Feb 2017 10:25:00 GMT',
        ))

        result = self.successResultOf(poll_feed(feed, client))

        self.assertEqual(Unchanged(), result)

    def test_last_modified_200(self):
        """
        When the ``If-Modified-Since`` header does not match, a 200 response is
        processed normally.
        """
        feed = FetchFeed(last_modified=u'Mon, 6 Feb 2017 00:00:00 GMT')
        client = StubTreq(StaticLastModifiedResource(
            content=EMPTY_RSS,
            last_modified=u'Tue, 7 Feb 2017 10:25:00 GMT',
        ))

        result = self.successResultOf(poll_feed(feed, client))

        self.assertEqual(MaybeUpdated(
            feed_title=u'Empty RSS feed',
            site_url=u'http://an.example/',
            etag=None,
            last_modified=u'Tue, 7 Feb 2017 10:25:00 GMT',
            articles=[],
        ), result)
