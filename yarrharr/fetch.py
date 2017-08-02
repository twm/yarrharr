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

from __future__ import unicode_literals, print_function

from cStringIO import StringIO
from datetime import datetime, timedelta
import hashlib

import attr
from django.db import transaction
from django.utils import timezone
import feedparser
try:
    from feedparser.http import ACCEPT_HEADER
except ImportError:
    from feedparser import ACCEPT_HEADER
from twisted.logger import Logger
from twisted.python.failure import Failure
from twisted.internet import error, defer
from twisted.internet.threads import deferToThread
from twisted.web import client
import treq
import pytz

from .models import Feed
from .sanitize import html_to_text, sanitize_html

try:
    # Seriously STFU this is not helpful.
    client._HTTP11ClientFactory.noisy = False
except:
    # Oh hey whatever. No promises.
    pass

log = Logger()


# Disable feedparser's HTML sanitization, as it drops important information
# (like YouTube embeds). We do our own sanitization with html5lib.
feedparser.SANITIZE_HTML = False


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

    :ivar str reason: String describing how the feed was unchanged.
    """
    reason = attr.ib()

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
    articles = attr.ib(repr=False)
    etag = attr.ib()
    last_modified = attr.ib()
    digest = attr.ib()

    def persist(self, feed):
        feed.last_checked = timezone.now()
        feed.error = u''
        feed.feed_title = self.feed_title
        feed.site_url = self.site_url
        feed.etag = self.etag
        feed.last_modified = self.last_modified
        feed.digest = self.digest
        log.debug("Upserting {upsert_count} articles to {feed}",
                  upsert_count=len(self.articles), feed=feed)

        for upsert in self.articles:
            try:
                self._upsert_article(feed, upsert)
            except Exception:
                log.failure("Failed to upsert {upsert}", upsert=upsert)

        schedule(feed)
        feed.save()

    def _match_article(self, feed, upsert):
        """
        Attempt to match the given upsert to an existing article in the feed.

        :param feed: :class:`yarrharr.models.Feed` to match against
        :param upsert: :class:`ArticleUpsert` instance
        :returns: two-tuple (:class:`yarrharr.models.Article`, :class:`str`),
            where the string is ``'guid'`` or ``'url'`` to indicate the nature
            of the match.

            If the match fails, returns ``(None, None)``.
        """
        if upsert.guid:
            try:
                match = feed.articles.filter(guid=upsert.guid)[0]
            except IndexError:
                pass
            else:
                return match, 'guid'

        # Fall back to the item link if no GUID is provided.
        # Note that we permit a match by link to match an article with a GUID.
        # This is because of databases migrated from django-yarr, which used
        # the link as a default GUID when one was not present.
        if upsert.url:
            try:
                match = feed.articles.filter(url=upsert.url)[0]
            except IndexError:
                pass
            else:
                return match, 'url'

        return None, None

    def _upsert_article(self, feed, upsert):
        match, match_type = self._match_article(feed, upsert)

        if not match:
            created = feed.articles.create(
                read=False,
                fave=False,
                author=upsert.author,
                title=upsert.title,
                url=upsert.url,
                # Sometimes feeds lack dates on entries (e.g.
                # <http://antirez.com/rss>); in this case default to the
                # current date so that they get the date the feed was fetched.
                date=upsert.date or timezone.now(),
                guid=upsert.guid,
                raw_content=upsert.raw_content,
                content=sanitize_html(upsert.raw_content),
            )
            created.save()
            log.debug("  created {created} (No match for GUID {guid!r} or URL {url!r})",
                      created=created, guid=upsert.guid, url=upsert.url)
            return

        # Check if we need to update.
        if (match.author != upsert.author or
                match.title != upsert.title or
                match.url != match.url or
                match.guid != match.guid or
                (upsert.date and match.date != upsert.date) or
                match.raw_content != upsert.raw_content):
            match.author = upsert.author
            match.title = upsert.title
            match.url = upsert.url
            match.guid = upsert.guid
            if upsert.date:
                # The feed may not give a date. In that case leave the date
                # that was assigned when the entry was first discovered.
                match.date = upsert.date
            match.raw_content = upsert.raw_content
            match.content = sanitize_html(upsert.raw_content)
            match.save()
            log.debug("  updated {updated} based on {match_type}",
                      updated=match, match_type=match_type)


@attr.s(slots=True, frozen=True)
class ArticleUpsert(object):
    author = attr.ib()
    title = attr.ib()
    url = attr.ib()
    date = attr.ib()
    guid = attr.ib()
    raw_content = attr.ib()


@attr.s(slots=True, frozen=True)
class BozoError(object):
    """
    feedparser rejected the feed and wasn't able to extract anything useful.

    :ivar int code: HTTP status code
    :ivar str content_type:
        Value of the Content-Type HTTP header. This is frequently a useful
        hint.
    :ivar str error: The feedparser "bozo exception".
    """
    code = attr.ib()
    content_type = attr.ib()
    error = attr.ib()

    def persist(self, feed):
        feed.last_checked = timezone.now()
        feed.etag = b''
        feed.last_modified = b''
        feed.digest = b''
        feed.error = u'Fetch failed: processing HTTP {} {} response produced error: {}'.format(
            self.code, self.content_type, self.error)
        schedule(feed)
        feed.save()


@attr.s(slots=True, frozen=True)
class NetworkError(object):
    """
    Fetching or processing the feed content failed due to a known networking
    issue. This represents an expected error case (for an unexpected error
    case, see :class:`~.PollError`).
    """
    error = attr.ib()

    def persist(self, feed):
        feed.last_checked = timezone.now()
        feed.error = self.error
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
        feed.error = self.failure.getTraceback()
        schedule(feed)
        feed.save()


@defer.inlineCallbacks
def poll(reactor, max_fetch):
    """
    Fetch any feeds which need checking.

    :param int max_fetch:
        Limit on the number of feeds to fetch concurrently. This is the
        increment of batching and aggregation: up to `max_fetch` feeds will be
        fetched concurrently and any updates applied to the database in
        a single transaction.

        Increasing this number will increase memory use, as feed content is
        held in memory before commit, but may also make checking feeds faster
        if many require checking.
    """
    start = reactor.seconds()

    feeds_to_check = yield deferToThread(
        lambda: list(Feed.objects.filter(next_check__isnull=False).filter(
            next_check__lte=timezone.now())[:max_fetch]))
    if not feeds_to_check:
        return

    outcomes = []
    for feed in feeds_to_check:
        try:
            outcome = (yield poll_feed(feed))
            outcomes.append((feed, outcome))
            log.debug("Polled {feed} -> {outcome}", feed=feed, outcome=outcome)
        except Exception:
            log.failure("Failed to poll {feed}", feed=feed)
            outcomes.append((feed, PollError()))

    try:
        yield deferToThread(persist_outcomes, outcomes)
    except Exception:
        log.failure("Failed to persist {count} outcomes", count=len(outcomes))
    else:
        log.info('Checking {count} feeds took {duration:.2f} sec',
                 count=len(outcomes), duration=reactor.seconds() - start)


def extract_etag(headers):
    try:
        etag = headers.getRawHeaders(b'etag', [])[-1]
    except IndexError:
        etag = b''
    if len(etag) > 1024:
        log.debug('Ignoring oversizzed ETag header ({count} bytes)', count=len(etag))
        etag = b''
    return etag


def extract_last_modified(headers):
    try:
        lm = headers.getRawHeaders(b'last-modified', [])[-1]
    except IndexError:
        lm = b''
    if len(lm) > 45:
        log.debug('Ignoring oversized Last-Modified header ({count} bytes)', count=len(lm))
        lm = b''
    return lm


@defer.inlineCallbacks
def poll_feed(feed, client=treq):
    """
    Do the parts of updating the feed which don't involve the database: fetch
    the feed content and parse it.

    :param feed: The :class:`~yarrharr.models.Feed` to poll
    :param str url: URL to retrieve
    """
    headers = {
        b'accept': [ACCEPT_HEADER],
    }
    if feed.etag:
        headers[b'if-none-match'] = [bytes(feed.etag)]
        conditional_get = Unchanged('etag')
    elif feed.last_modified:
        headers[b'if-modified-since'] = [bytes(feed.last_modified)]
        conditional_get = Unchanged('last-modified')
    else:
        # 304 is not expected unless we issued a conditional get.
        conditional_get = BadStatus(304)

    try:
        response = yield client.get(feed.url, timeout=30, headers=headers)
        raw_bytes = yield response.content()
    except (
        # DNS resolution failed. I'm not sure how exactly this is distinct from
        # UnknownHostError which is a subclass of ConnectError, but this is the
        # what I have observed. Perhaps this is what HostnameEndpoint produces.
        error.DNSLookupError,
        # Failed to establish a TCP connection (includes refused, etc.).
        error.ConnectError,
        # TCP connection failed halfway. This is safe to retry on as we only
        # make GET requests.
        error.ConnectionLost,
        # Making the connection timed out (probably something is dropping traffic):
        error.ConnectingCancelledError,
    ) as e:
        # TODO # A TLS cert error looks like:
        #   Traceback (most recent call last):
        #       Failure: twisted.web._newclient.ResponseNeverReceived:
        #       [<twisted.python.failure.Failure OpenSSL.SSL.Error: [('SSL
        #       routines', 'tls_process_server_certificate', 'certificate
        #       verify failed')]>]
        defer.returnValue(NetworkError(str(e)))

    if response.code == 410:
        defer.returnValue(Gone())

    if response.code == 304:
        defer.returnValue(conditional_get)

    if response.code != 200:
        defer.returnValue(BadStatus(response.code))

    digest = hashlib.sha256(raw_bytes).digest()
    # NOTE: the feed.digest attribute is buffer (on Python 2) which means that
    # it doesn't implement __eq__(), hence the conversion.
    if feed.digest is not None and bytes(feed.digest) == digest:
        defer.returnValue(Unchanged('digest'))

    # Convert headers to the format expected by feedparser.
    # TODO: feedparser appears to use native strings for headers, so these will
    # need to be decoded under Python 3.
    h = {'content-location': response.request.absoluteURI}
    h.update({k.lower(): b', '.join(v) for (k, v) in response.headers.getAllRawHeaders()})

    # NOTE: feedparser.parse() will try to interpret a plain string as a URL,
    # so we wrap it in a StringIO() to force it to parse the response.
    # Otherwise the HTTP response body could be just a URL and trigger
    # blocking I/O!
    parsed = feedparser.parse(StringIO(raw_bytes), response_headers=h)

    articles = []
    for entry in parsed['entries']:
        articles.append(ArticleUpsert(
            author=entry.get('author', u''),
            title=extract_title(entry['title_detail']),
            url=entry.get('link', u''),
            date=extract_date(entry),
            guid=entry.get('id', u''),
            raw_content=extract_content(entry),
        ))

    # feedparser can manage to extract feed metadata from HTML documents like
    # the redirect pages used by domain parkers, so we must use a heuristic to
    # determine if we got anything of use.
    #
    # feedparser probably got something worthwhile if it managed to extract
    # a feed title or entries (which we call articles). If there are articles
    # then the bozo bit is probably set for something the end user doesn't need
    # to know about, like XML served as text/html.
    parsed_feed = parsed.get('feed')
    if not parsed_feed.get('title') or (parsed['bozo'] and not articles):
        defer.returnValue(BozoError(
            code=response.code,
            content_type=u', '.join(response.headers.getRawHeaders(u'content-type')),
            error=str(parsed['bozo_exception'])
        ))
    else:
        defer.returnValue(MaybeUpdated(
            feed_title=extract_title(parsed_feed['title_detail']),
            site_url=parsed_feed.get('link', u''),
            etag=extract_etag(response.headers),
            last_modified=extract_last_modified(response.headers),
            digest=digest,
            articles=articles,
        ))


def persist_outcomes(outcomes):
    """
    This function is called in a thread to update the database after a poll.

    :param outcomes:
        :class:`list` of (:class:`~yarrharr.models.Feed`, outcome) tuples,
        where each `outcome` is an object with a ``persist(feed)`` method.

        The :class:`~yarrharr.models.Feed` objects are not reused, as they may
        be stale.
    """
    for feed, outcome in outcomes:
        with transaction.atomic():
            try:
                feed = Feed.objects.get(id=feed.id)
            except Feed.DoesNotExist:
                # The feed was deleted while we were polling it. Discard
                # any update as it doesn't matter any more.
                continue
            outcome.persist(feed)


def schedule(feed):
    """
    Update the `next_check` timestamp on a feed.
    """
    if feed.next_check is None:
        # The feed was disabled while we were checking it. Do not schedule
        # another check.
        return
    # TODO: Schedule the next check according to how frequently new articles
    # are posted.
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


def extract_title(title_detail):
    """
    Given a feedparser `title_detail object`_, return a plain text version of
    the title.

    .. _title_detail object: https://pythonhosted.org/feedparser/reference-feed-title_detail.html
    """
    if title_detail['type'] == u'text/plain':
        return title_detail['value']
    else:
        return html_to_text(title_detail['value'])


def extract_date(entry):
    """
    Attempt to extract the publication date from a feedparser entry.

    :returns:
        A timezone-aware :class:`datetime.datetime` instance, or `None` if the
        entry lacks a date.
    """
    update = entry.get('updated_parsed')
    if update:
        return as_datetime(update)
    pubdate = entry.get('published_parsed')
    if pubdate:
        return as_datetime(pubdate)
    return None


def extract_content(entry):
    """
    Get the raw HTML for a feedparser entry object.

    :param entry: `A feedparser entry
        <https://pythonhosted.org/feedparser/reference-entry-content.html>`_.

    :returns: HTML string
    """
    content = entry.get('content', [])
    if not content:
        return entry.get('summary', u'')
    # TODO: extract the most appropriate entry if there are multiples (does
    # anyone actually ever provide more than one in the real world?)
    return content[0].value
