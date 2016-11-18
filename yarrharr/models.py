# -*- coding: utf-8 -*-
# Copyright © 2013, 2015, 2016 Tom Most <twm@freecog.net>
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

from django.db import models


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
    :ivar last_checked: When did we last try to check the feed?
    :ivar last_updated: When did a check find an updated feed?
    :ivar error: String error message from the last check.
    :ivar etag:
        HTTP ETag from the last check. None when the feed does set the header.
    :ivar last_modified:
        HTTP Last-Modified header from the last check. None when the feed does
        not set the header.

    The feed title is taken from the feed itself by default, but may be
    overridden by the user:

    :ivar feed_title: The title as specified in the feed itself.
    :ivar user_title: An optional user override of the feed title.

    These two are combined in the `title` property.
    """
    user = models.ForeignKey('auth.User')
    url = models.URLField()
    added = models.DateTimeField()
    deleted = models.DateTimeField(null=True, default=None)

    next_check = models.DateTimeField(null=True)
    last_checked = models.DateTimeField(null=True)
    last_updated = models.DateTimeField(null=True)
    error = models.TextField(blank=True)
    etag = models.TextField(null=True)
    last_modified = models.DateTimeField(null=True)

    feed_title = models.TextField()
    user_title = models.TextField(default='', blank=True)
    site_url = models.URLField(default='', blank=True)

    title = property(lambda self: self.user_title or self.feed_title)


class Article(models.Model):
    """
    Checking a :class:`Feed` produces articles for the entries within it.

    :ivar feed: :class:`Feed` from which this article was taken.
    :ivar bool read: Has this article been marked read by the user?
    :ivar bool fave: Has this article been favorited by the user?

    The following attributes are taken directly from the feed content:

    :ivar author: Author of the article.
    :ivar title: Title of the article.
    :ivar url: Link back to the canonical version of the article.
    :ivar date: Date of the article.
    :ivar guid:
        The GUID of the article from the feed which may be used to de-duplicate
        articles.
    :ivar raw_content: The raw, unsanitized HTML from the feed.
    :ivar content: The sanitized HTML to present to the user.
    """
    feed = models.ForeignKey(Feed, related_name='articles', on_delete=models.CASCADE)
    read = models.BooleanField()
    fave = models.BooleanField()

    author = models.TextField(blank=True)
    title = models.TextField(blank=True)
    url = models.TextField(blank=True)
    date = models.DateTimeField()
    guid = models.TextField(null=True)
    raw_content = models.TextField()
    content = models.TextField()


class Label(models.Model):
    """
    Labels may be applied to feeds to group them logically.  Each has a unique
    name.

    :ivar user: User who owns the label.
    :ivar text: The text of the label set by the user.
    :ivar feeds: Feeds to which the label has been applied.
    """
    text = models.CharField(unique=True, max_length=64)
    user = models.ForeignKey('auth.User')
    feeds = models.ManyToManyField(Feed)

    class Meta:
        unique_together = ('user', 'text')
