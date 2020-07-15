# -*- coding: utf-8 -*-
# Copyright © 2013, 2015, 2016, 2017, 2018, 2019, 2020 Tom Most <twm@freecog.net>
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
from datetime import timedelta

from django.db import models
from django.db.backends.signals import connection_created
from django.dispatch import receiver
from django.utils import timezone

from . import sanitize


# Enable sqlite WAL mode so that readers don't block writers. See:
# https://www.sqlite.org/wal.html
# https://code.djangoproject.com/ticket/24018
@receiver(connection_created, dispatch_uid='set_sqlite_wal_mode')
def _set_sqlite_wal_mode(sender, connection, **kwargs):
    assert connection.vendor == 'sqlite'
    cursor = connection.cursor()
    cursor.execute('PRAGMA journal_mode=wal;')
    cursor.close()


class Feed(models.Model):
    """
    An Atom or RSS feed to check for new articles periodically.

    :ivar user: User who owns the feed.
    :ivar url: URL where the feed may be found.
    :ivar added: When was this feed added to the database?
    :ivar deleted:
        When was this feed deleted? None otherwise. Once set this is permanent.
        The feed will eventually be removed from the database once any
        associated data is cleaned up.

    Many fields track information on when to check the feed and it status:

    :ivar next_check:
        Next time we should try checking the feed. To stop checking the feed,
        set this to None.
    :ivar last_checked:
        When did we last try to check the feed? ``None`` if never checked.
    :ivar last_changed:
        When did a check find a feed change? The feed is considered changed if
        its bytes changed.  ``None`` if the feed has never been successfully
        checked.
    :ivar error: String error message from the last check.
    :ivar bytes etag:
        HTTP ETag from the last check. Empty when the feed does set the header.

        This is the exact bytes sent by the server, though values larger than
        a kibibyte are disallowed.
    :ivar bytes last_modified:
        HTTP Last-Modified header from the last check. Empty when the feed does
        not set the header.

        This is the exact bytes sent by the server. It is a `HTTP date
        <https://tools.ietf.org/html/rfc7231#section-7.1.1.1>`_ like ``b'Tue,
        15 Nov 1994 12:45:26 GMT'``, but the length limit is set slightly
        higher to allow for obsolete or non-compliant servers.

    The feed title is taken from the feed itself by default, but may be
    overridden by the user:

    :ivar feed_title: The title as specified in the feed itself.
    :ivar user_title: An optional user override of the feed title.

    These two are combined in the `title` property.
    """
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE)
    url = models.URLField()
    added = models.DateTimeField()
    deleted = models.DateTimeField(null=True, default=None)

    next_check = models.DateTimeField(null=True)
    last_checked = models.DateTimeField(null=True, default=None)
    last_changed = models.DateTimeField(null=True, default=None)
    error = models.TextField(blank=True, default=u'')
    etag = models.BinaryField(default=b'', max_length=1024)
    last_modified = models.BinaryField(default=b'', max_length=45)
    digest = models.BinaryField(default=b'', max_length=32)

    feed_title = models.TextField()
    user_title = models.TextField(default='', blank=True)
    site_url = models.URLField(default='', blank=True)

    title = property(lambda self: self.user_title or self.feed_title or self.url)

    all_count = models.IntegerField(default=0)
    unread_count = models.IntegerField(default=0)
    fave_count = models.IntegerField(default=0)

    _now = staticmethod(timezone.now)

    def __str__(self):
        return u'{} <{}>'.format(self.title, self.url)

    def schedule(self):
        """
        Update the `next_check` timestamp.

        This has no effect when checking of the feed is disabled. Otherwise, it
        attempts to guess how frequently the feed updates based on the dates of
        articles from the last two weeks. This guess is the minimum time between
        articles, clamped to between 15 minutes and 1 day.

        Only inspecting recent articles allows a feed which goes dead to "age
        out" to the default of 1 day. When no articles are known the default
        interval is 1 day.
        """
        if self.next_check is None:
            # The feed was disabled while we were checking it. Do not schedule
            # another check.
            #
            # XXX: We could still clobber the field due to read-modify-write.
            return

        now = self._now()
        article_dates = list(
            self.articles
            .filter(date__gt=now - timedelta(weeks=2), date__lt=now)
            .order_by('-date')
            .values_list('date', flat=True)[:100],
        )

        if len(article_dates) >= 2:
            delta = min(first - second
                        for first, second
                        in zip(article_dates[:-1], article_dates[1:]))
        else:
            delta = timedelta(days=2)

        min_delta = timedelta(minutes=15)
        if delta < min_delta:
            delta = min_delta
        max_delta = timedelta(days=1)
        if delta > max_delta:
            delta = max_delta
        self.next_check = now + delta

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(all_count__gte=0),
                                   name='feed_all_count_nonneg'),
            models.CheckConstraint(check=models.Q(unread_count__gte=0),
                                   name='feed_unread_count_nonneg'),
            models.CheckConstraint(check=models.Q(fave_count__gte=0),
                                   name='feed_fave_count_nonneg'),
        ]


class Article(models.Model):
    """
    Checking a :class:`Feed` produces articles for the entries within it.

    :ivar feed: :class:`Feed` from which this article was taken.
    :ivar bool read: Has this article been marked read by the user?
    :ivar bool fave: Has this article been favorited by the user?

    The following attributes are taken directly from the feed content:

    :ivar author: Author of the article.
    :ivar url: Link back to the canonical version of the article.
    :ivar date: Date of the article.
    :ivar guid:
        The GUID of the article from the feed which may be used to de-duplicate
        articles.
    :ivar raw_title: The raw HTML version of the title from the feed.
    :ivar raw_content: The raw, unsanitized HTML from the feed.

    These attributes are derived from the others (see :meth:`.set_content()`):

    :ivar title: Title of the article as safe plain text.
    :ivar content: The sanitized HTML to present to the user.
    :ivar content_snippet:
        The first 500 characters of text in *content*. Displayed as a preview
        of the article in the list view.
    :ivar content_rev:
        Revision number of the sanitizer which generated *content* and
        *content_snippet*. This is used to migrate old HTML by comparison with
        `yarrharr.sanitize.REVISION`.
    """
    feed = models.ForeignKey(Feed, related_name='articles', on_delete=models.CASCADE)
    read = models.BooleanField()
    fave = models.BooleanField()

    author = models.TextField(blank=True)
    url = models.TextField(blank=True)
    date = models.DateTimeField()
    guid = models.TextField(blank=True, default='')
    raw_title = models.TextField(blank=True, default='')
    raw_content = models.TextField()

    title = models.TextField(blank=True)
    content = models.TextField()
    content_snippet = models.TextField(blank=True, default='')
    content_rev = models.IntegerField(default=0)

    def __str__(self):
        return u'{} <{}>'.format(self.title, self.url)

    def set_content(self, raw_title, raw_content):
        """
        Set article title and content.

        This directly set the `raw_title` and `raw_content` fields and also
        sets the derived fields:

          * `title` — plain text title
          * `content` — sanitized HTML
          * `content_snippet` — a short plain text prefix of the HTML
          * `content_rev` — revision number of the sanitization scheme
        """
        self.raw_title = raw_title
        self.raw_content = raw_content
        self.title = title = sanitize.html_to_text(raw_title)
        self.content = content = sanitize.sanitize_html(raw_content)
        text = sanitize.html_to_text(content)
        if text.startswith(title):
            text = text[len(title):].lstrip()
        self.content_snippet = text[:500]
        self.content_rev = sanitize.REVISION


class Label(models.Model):
    """
    Labels may be applied to feeds to group them logically.  Each has a unique
    name.

    :ivar user: User who owns the label.
    :ivar text: The text of the label set by the user.
    :ivar feeds: Feeds to which the label has been applied.
    """
    text = models.CharField(max_length=64)
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE)
    feeds = models.ManyToManyField(Feed)

    def __str__(self):
        return self.text

    class Meta:
        unique_together = ('user', 'text')
