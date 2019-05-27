# -*- coding: utf-8 -*-
# Copyright © 2016, 2017, 2018, 2019 Tom Most <twm@freecog.net>
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

import hashlib
import html
from datetime import datetime
from io import BytesIO

import attr
import feedparser
import pytz
import treq
from django.db import OperationalError, transaction
from django.utils import timezone
from feedparser.http import ACCEPT_HEADER
from twisted.internet import defer, error
from twisted.internet.threads import deferToThread
from twisted.logger import Logger
from twisted.python.failure import Failure
from twisted.web import client

from . import __version__
from .models import Feed
from .sanitize import html_to_text

try:
    # Seriously STFU this is not helpful.
    client._HTTP11ClientFactory.noisy = False
except BaseException:
    # Oh hey whatever. No promises.
    pass

log = Logger()


# SquareSpace seems to reject requests with Twisted's default
# User-Agent header, so we don't mention Twisted here.
USER_AGENT_HEADER = 'Mozilla/5.0 (Linux x86_64) Yarrharr/{} +https://github.com/twm/yarrharr'.format(
    __version__).encode()


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
        feed.schedule()
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
        feed.schedule()
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
class EmptyBody:
    """
    The feed content was empty. We didn't pass it to feedparser because
    feedparser doesn't deal well with an empty feed.

    :ivar int code: HTTP status code
    :ivar str content_type:
        Value of the Content-Type HTTP header. This is frequently a useful
        hint.
    """
    code = attr.ib()
    content_type = attr.ib()

    def persist(self, feed):
        feed.last_checked = timezone.now()
        feed.error = 'Feed HTTP response was empty'
        feed.schedule()
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
            self._upsert_article(feed, upsert)

        feed.schedule()
        # As a workaround for #323, only save the fields which have been
        # touched. We *must not* save the all_count or unread_count fields lest
        # we clobber the values set by the triggers.
        feed.save(update_fields=['last_checked', 'error', 'feed_title',
                                 'site_url', 'etag', 'last_modified', 'digest',
                                 'next_check'])

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

            if upsert.guid.startswith('https://'):
                try:
                    match = feed.articles.filter(guid='http' + upsert.guid[5:])[0]
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

            # When the new URL is HTTPS, check if we have the same thing in
            # HTTP.  This heuristic helps cope with sites that are migrated
            # from HTTP to HTTPS but don't use a more stable identifier like
            # tag URIs.
            if upsert.url.startswith('https://'):
                try:
                    match = feed.articles.filter(url='http' + upsert.url[5:])[0]
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
                url=upsert.url,
                # Sometimes feeds lack dates on entries (e.g.
                # <http://antirez.com/rss>); in this case default to the
                # current date so that they get the date the feed was fetched.
                date=upsert.date or timezone.now(),
                guid=upsert.guid,
            )
            created.set_content(upsert.raw_title, upsert.raw_content)
            created.save()
            log.debug("  created {created!a} (No match for GUID {guid!r} or URL {url!r})",
                      created=created, guid=upsert.guid, url=upsert.url)
            return

        # Check if we need to update.
        if (match.author != upsert.author or
                match.raw_title != upsert.raw_title or
                match.url != match.url or
                match.guid != match.guid or
                (upsert.date and match.date != upsert.date) or
                match.raw_content != upsert.raw_content):
            match.author = upsert.author
            match.url = upsert.url
            match.guid = upsert.guid
            if upsert.date:
                # The feed may not give a date. In that case leave the date
                # that was assigned when the entry was first discovered.
                match.date = upsert.date
            match.set_content(upsert.raw_title, upsert.raw_content)
            match.save()
            log.debug("  updated {updated!a} based on {match_type}",
                      updated=match, match_type=match_type)


@attr.s(slots=True, frozen=True)
class ArticleUpsert(object):
    author = attr.ib()
    raw_title = attr.ib()
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
        feed.schedule()
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
        feed.schedule()
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
        feed.schedule()
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

    if feeds_to_check:
        outcomes = []
        for feed in feeds_to_check:
            try:
                outcome = (yield poll_feed(feed, reactor))
                outcomes.append((feed, outcome))
                log.debug("Polled {feed} -> {outcome}", feed=feed, outcome=outcome)
            except Exception:
                log.failure("Failed to poll {feed}", feed=feed)
                outcomes.append((feed, PollError()))

        try:
            attempt = 0
            while True:
                try:
                    yield deferToThread(persist_outcomes, outcomes)
                except OperationalError as e:
                    # We want to retry on SQLITE_BUSY [1], which indicates that
                    # the connection could not be established because another
                    # thread had the database locked. Unfortunately pysqlite
                    # doesn't expose the error code in a structured form, only
                    # as a string [2]. The sqlite3_errmsg function used to
                    # retrieve this string doesn't make any promises about the
                    # stability of the string over releases [3] but it seems
                    # unlikely to change in practice. So this is a bit gross
                    # but not really a problem.
                    #
                    # Note there is no need for a sleep when we retry because
                    # sqlite brings its own(default 5 seconds, but this can be
                    # configured in the Django DATABASES setting [4]).  We
                    # retry here rather than increasing that setting because
                    # that setting is global. It's fine for the poller to wait
                    # a while, but interactive requests should fail fast.
                    #
                    # [1]: https://www.sqlite.org/rescode.html#busy
                    # [2]: https://github.com/ghaering/pysqlite/blob/e728ffbcaeb7bfae1d6b7165369bd0ae/src/util.c#L74-L84
                    # [3]: https://www.sqlite.org/c3ref/errcode.html
                    # [4]: https://docs.djangoproject.com/en/2.1/ref/databases/#database-is-locked-errors
                    if str(e) != 'database is locked' or attempt >= 10:
                        raise
                    attempt += 1
                    log.debug(("Database lock contention while persisting {count} outcomes:"
                               " will retry (attempt {attempt})"),
                              count=len(outcomes), attempt=attempt)
                else:
                    break
        except Exception:
            log.failure("Failed to persist {count} outcomes", count=len(outcomes))

    next_pending = yield deferToThread(
        lambda: Feed.objects.filter(next_check__isnull=False).order_by(
            'next_check').values_list('next_check', flat=True)[:1])
    if next_pending:
        delay = (next_pending[0] - timezone.now()).total_seconds()
    else:
        delay = 15 * 60.0  # Default to every 15 minutes
    if delay < 0.0:
        delay = 0.0
    log.info('Checking {count} feeds took {duration:.2f} sec. Next check in {delay:.2f} sec.',
             count=len(feeds_to_check), duration=reactor.seconds() - start, delay=delay)
    return delay


def extract_etag(headers):
    try:
        etag = headers.getRawHeaders(b'etag', [])[-1]
    except IndexError:
        etag = b''
    if len(etag) > 1024:
        log.debug('Ignoring oversized ETag header ({count} bytes)', count=len(etag))
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


@attr.s(cmp=False)
class RequestTimeout(defer.CancelledError):
    timeout = attr.ib()

    def __str__(self):
        return "Request timed out after {} seconds".format(self.timeout)

    @classmethod
    def onTimeoutCancel(cls, result, timeout):
        """
        Convert any failure into a `RequestTimeout` failure.

        This is intended for use as the *onTimeoutCancel* argument to
        `Defer.addTimeout`.
        """
        if isinstance(result, Failure):
            return Failure(cls(timeout))
        return result


@attr.s(cmp=False)
class ResponseTimeout(defer.CancelledError):
    timeout = attr.ib()

    def __str__(self):
        return "Reading the response body timed out after {} seconds".format(self.timeout)

    @classmethod
    def onTimeoutCancel(cls, result, timeout):
        """
        Convert any failure into a `ResponseTimeout` failure.

        This is intended for use as the *onTimeoutCancel* argument to
        `Defer.addTimeout`.
        """
        if isinstance(result, Failure):
            return Failure(cls(timeout))
        return result


@defer.inlineCallbacks
def poll_feed(feed, clock, treq=treq):
    """
    Do the parts of updating the feed which don't involve the database: fetch
    the feed content and parse it.

    :param feed: The :class:`~yarrharr.models.Feed` to poll
    :param clock: :class:`twisted.internet.interfaces.IReactorTime`
    :param str url: URL to retrieve
    """
    headers = {
        b'user-agent': [USER_AGENT_HEADER],
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
        response = yield treq.get(feed.url, headers=headers).addTimeout(30, clock, RequestTimeout.onTimeoutCancel)
        raw_bytes = yield response.content().addTimeout(30, clock, ResponseTimeout.onTimeoutCancel)
    except (
        # One of the timeouts above expired.
        RequestTimeout,
        ResponseTimeout,
        # DNS resolution failed. I'm not sure how exactly this is distinct from
        # UnknownHostError which is a subclass of ConnectError, but this is
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
        defer.returnValue(NetworkError(str(e)))
    except (
        # The response was not fully received. Usually this is the subclass
        # ResponseNeverReceived wrapping a TLS error like:
        #
        #   Traceback (most recent call last):
        #       Failure: twisted.web._newclient.ResponseNeverReceived:
        #       [<twisted.python.failure.Failure OpenSSL.SSL.Error: [
        #        ('SSL routines', 'tls_process_server_certificate', 'certificate verify failed')]>]
        client.ResponseFailed,
        client.RequestTransmissionFailed,
    ) as e:
        defer.returnValue(NetworkError('\n'.join(str(f.value) for f in e.reasons)))

    if response.code == 410:
        defer.returnValue(Gone())

    if response.code == 304:
        defer.returnValue(conditional_get)

    if response.code != 200:
        defer.returnValue(BadStatus(response.code))

    if not raw_bytes:
        defer.returnValue(EmptyBody(
            code=response.code,
            content_type=', '.join(response.headers.getRawHeaders('content-type')),
        ))

    digest = hashlib.sha256(raw_bytes).digest()
    # NOTE: the feed.digest attribute is buffer (on Python 2) which means that
    # it doesn't implement __eq__(), hence the conversion.
    if feed.digest is not None and bytes(feed.digest) == digest:
        defer.returnValue(Unchanged('digest'))

    # Convert headers to the format expected by feedparser.
    h = {'content-location': response.request.absoluteURI.decode('ascii')}
    h.update({k.lower().decode('latin1'): b', '.join(v).decode('latin1')
              for (k, v) in response.headers.getAllRawHeaders()})

    # NOTE: feedparser.parse() will try to interpret a plain string as a URL,
    # so we wrap it in a BytesIO() to force it to parse the response.
    # Otherwise the HTTP response body could be just a URL and trigger
    # blocking I/O!
    parsed = feedparser.parse(
        BytesIO(raw_bytes),
        response_headers=h,
        sanitize_html=False,
    )

    articles = []
    for entry in parsed['entries']:
        articles.append(ArticleUpsert(
            author=entry.get('author', u''),
            raw_title=extract_title(entry.get('title_detail')),
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
    if not articles and parsed['bozo']:
        defer.returnValue(BozoError(
            code=response.code,
            content_type=u', '.join(response.headers.getRawHeaders(u'content-type')),
            error=str(parsed.get('bozo_exception', 'Unknown error')),
        ))
    else:
        defer.returnValue(MaybeUpdated(
            feed_title=extract_feed_title(parsed_feed, feed.url),
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


def extract_feed_title(parsed_feed, feed_url):
    """
    Extract a title from a parsed feed, falling back to the URL if none is found.

    :param parsed_feed:

    """
    if not parsed_feed.get('title'):
        return feed_url
    return html_to_text(extract_title(parsed_feed['title_detail']))


def extract_title(title_detail):
    """
    Given a feedparser `title_detail object`_, return a HTML version of
    the title.

    :param title_detail:
        A feed or `entry title_detail`_ dict. If `None`, the result is an empty
        string.

    .. _title_detail object: https://pythonhosted.org/feedparser/reference-feed-title_detail.html

    .. _entry title_detail: https://pythonhosted.org/feedparser/reference-entry-title_detail.html
    """
    if title_detail is None:
        return ''
    if title_detail['type'] == u'text/plain':
        return html.escape(title_detail['value'])
    else:
        return title_detail['value']


def extract_date(entry):
    """
    Attempt to extract an article date from a feedparser entry. The `date of
    update_` is preferred if set, else the date of publication is used.

    :returns:
        A timezone-aware :class:`datetime.datetime` instance, or `None` if the
        entry lacks a date.

    .. date of update: https://pythonhosted.org/feedparser/reference-entry-updated_parsed.html
    """
    # Avoid triggering a deprecation warning by checking for updated_parsed
    # before getting it.
    if 'updated_parsed' in entry:
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
