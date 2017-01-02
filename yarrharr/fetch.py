# -*- coding: utf-8 -*-
# Copyright © 2016, 2017 Tom Most <twm@freecog.net>
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

"""
Feed fetcher based on Twisted Web
"""

from cStringIO import StringIO
from datetime import datetime, timedelta

import attr
from django.utils import timezone
import feedparser.http
from twisted.python import log
from twisted.python.failure import Failure
from twisted.internet import defer
from twisted.internet.threads import deferToThread
import treq
import pytz

from .models import Feed


@attr.s(slots=True, frozen=True)
class BadStatus(object):
    """
    A poll resulted in an unexpected HTTP status code.

    :ivar int code: HTTP status code
    """
    code = attr.ib()

    def persist(self, feed):
        feed.last_checked = timezone.now()
        feed.error = u'Fetch failed: HTTP status {}'.format(self.code)
        schedule(feed)
        feed.save()


@attr.s(slots=True, frozen=True)
class Unchanged(object):
    """
    A poll determined that the feed has not changed, perhaps due to a HTTP 304 response.
    """
    def persist(self, feed):
        feed.last_checked = timezone.now()
        feed.error = u''
        schedule(feed)
        feed.save()


@attr.s(slots=True, frozen=True)
class Gone(object):
    """
    HTTP 410 Gone was returned, so the feed should not be checked anymore.
    """
    def persist(self, feed):
        feed.last_checked = timezone.now()
        feed.error = u'Feed is no longer available: automatically deactivated'
        feed.next_check = None
        feed.save()


@attr.s(slots=True, frozen=True)
class MaybeUpdated(object):
    """
    The contents of the feed have been retrieved and may have changed. The
    database should be updated to reflect the new content.
    """
    feed_title = attr.ib()
    site_url = attr.ib()
    articles = attr.ib()

    def persist(self, feed):
        # TODO: Save articles
        schedule(feed)
        feed.save()


@attr.s(slots=True, frozen=True)
class Article(object):
    author = attr.ib()
    title = attr.i()
    url = attr.ib()
    date = attr.ib()
    guid = attr.ib()
    raw_content = attr.ib()


@attr.s(slots=True, frozen=True)
class BozoError(object):
    """
    feedparser rejected the feed and wasn't able to extract anything useful.
    """
    error = attr.ib()

    def persist(self, feed):
        feed.last_checked = timezone.now()
        feed.error = self.error
        feed.schedule()
        schedule(feed)
        feed.save()


@attr.s(slots=True, frozen=True)
class PollError(object):
    """
    Fetching or processing the feed content failed.

    :ivar failure: Details of the failure, captured as
        a :class:`twisted.internet.failure.Failure` object
    """
    failure = attr.ib(default=attr.Factory(Failure))

    def persist(self, feed):
        feed.last_checked = timezone.now()
        schedule(feed)
        feed.save()


@defer.inlineCallbacks
def poll():
    """
    Fetch any feeds which need checking.
    """
    feeds_to_check = yield deferToThread(
        lambda: list(Feed.objects.filter(next_check__gte=timezone.now())))
    if not feeds_to_check:
        return

    outcomes = []
    for feed in feeds_to_check:
        try:
            outcomes.append((feed, (yield poll_feed(feed))))
        except Exception:
            log.err()
            outcomes.append((feed, PollError()))

    yield deferToThread(persist_outcomes, outcomes)


@defer.inlineCallbacks
def poll_feed(feed, client=treq):
    """
    Do the parts of updating the feed which don't involve the database: fetch
    the feed content and parse it.

    :param feed: The :class:`~yarrharr.models.Feed` to poll
    :param str url: URL to retrieve
    """
    # TODO: Etag and Last-Modified support
    response = yield client.get(feed.url, timeout=30, headers={
        'accept': feedparser.http.ACCEPT_HEADER,
    })
    raw_bytes = yield response.content()

    if response.code != 200:
        defer.returnValue([BadStatus(response.code)])

    # TODO: To avoid unnecessary processing, check if the bytes of the feed
    # haven't changed in case the server doesn't support Etags/Last-Modified.

    # TODO: Detect permanent redirects and return Moved.

    # Convert headers to the format expected by feedparser.
    # TODO: feedparser appears to use native strings for headers, so these will
    # need to be encoded under Python 3.
    h = {'content-location': response.request.absoluteURI}
    h.update({k.lower(): b', '.join(v) for (k, v) in response.headers.getAllRawHeaders()})

    # NOTE: feedparser.parse() will try to interpret a plain string as a URL,
    # so we wrap it in a StringIO() to force it to parse the response.
    # Otherwise the HTTP response body could be just a URL and trigger
    # blocking I/O!
    parsed = feedparser.parse(StringIO(raw_bytes), response_headers=h)

    articles = []
    for entry in parsed['entries']:
        articles.append(Article(
            author=entry.get('author', u''),
            title=entry.get('title', u''),
            url=entry.get('link', u''),
            # XXX: publication date can be missing?
            date=as_datetime(entry.get('published_parsed')),
        ))

    feed = parsed.get('feed')
    if not feed and feed['bozo']:
        defer.returnValue(BozoError(error=str(feed['bozo_exception'])))
    else:
        defer.returnValue(MaybeUpdated(
            feed_title=feed.get('title', u''),
            site_url=feed.get('link', u''),
            articles=articles,
        ))


def persist_outcomes(outcomes):
    """
    This function is called in a thread to update the database after a poll.

    :param outcomes:
    """
    for feed, outcome in outcomes:
        outcome.persist(feed)


def schedule(feed):
    """
    Update the `next_check` timestamp on a feed.
    """
    if feed.next_check is None:
        # The feed was disabled while we were checking it. Do not schedule
        # another check.
        return
    feed.next_check = timezone.now() + timedelta(days=1)


def as_datetime(t):
    """
    Convert a UTC 9-tuple in the style of the Python :mod:`time` module to
    a timezone-aware :class:`datetime.datetime`.
    """
    return datetime(
        year=t[0],
        month=t[1],
        day=t[2],
        hour=t[3],
        minute=t[4],
        second=t[5],
        tzinfo=pytz.utc,
    )
