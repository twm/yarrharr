# -*- coding: utf-8 -*-
# Copyright © 2013–2019 Tom Most <twm@freecog.net>
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

import django
import feedparser
import simplejson
import yarrharr
from django.contrib.auth.decorators import login_required
from django.db import connection, transaction
from django.db.models import Q, Sum
from django.db.utils import IntegrityError
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseNotAllowed
from django.shortcuts import render
from django.utils import timezone
from twisted.logger import Logger

from .models import Article
from .signals import schedule_changed
from .sql import log_on_error

log = Logger()
json_encoder = simplejson.JSONEncoderForHTML()


def human_sort_key(s):
    """
    Generate a sort key given a string. The sort key is guaranteed to have
    a few properties:

    * It is case insensitive.
    * It discards non-alphanumeric characters.

    :param str s: A human-readable string
    :returns:
        A case-normalized version of `s` less non-alphanumeric characters.
    """
    return ''.join(c for c in s.casefold() if c.isalnum() or c.isspace())


def ms_timestamp(dt):
    """
    Convert a :class:`datetime.datetime` to a JavaScript-style timestamp:
    milliseconds since the UNIX epoch.

    :param dt: :class:`datetime.datetime`, which may be ``None`` (which
        propagates).
    :returns: :class:`float` or ``None``
    """
    if dt is None:
        return None
    return dt.timestamp() * 1000


def json_for_article(article):
    """
    Translate a `yarrharr.Article` into the JSON data for an article.
    """
    return {
        'feedId': article.feed.id,
        'id': article.id,
        'read': article.read,
        'fave': article.fave,
        'title': article.title,
        'snippet': article.content_snippet,
        'content': article.content,
        'author': article.author,
        'date': ms_timestamp(article.date),
        'url': article.url,
    }


def json_for_feed(feed):
    return {
        'id': feed.id,
        'title': feed.feed_title,
        'text': feed.user_title,
        'active': feed.next_check is not None,
        'unreadCount': feed.unread_count,
        'faveCount': feed.fave_count,
        'labels': sorted(feed.label_set.all().values_list('id', flat=True)),
        'url': feed.url,
        'siteUrl': feed.site_url,
        'added': ms_timestamp(feed.added),
        'updated': ms_timestamp(feed.last_updated),
        'checked': ms_timestamp(feed.last_checked),
        # 'nextCheck': str(feed.next_check or ''),
        'error': feed.error,
    }


def feeds_for_user(user):
    feeds_by_id = {}
    feed_order_decorated = []
    for feed in user.feed_set.all():
        feeds_by_id[feed.id] = json_for_feed(feed)
        feed_order_decorated.append((human_sort_key(feed.title), feed.id))
    # XXX It would be nice to do this sorting in the database, but sqlite3 does
    # not ship with appropriate collations. Custom collations can be installed,
    # but there isn't much advantage to doing so right now given we always
    # query all feeds anyway.
    feed_order_decorated.sort()
    return {
        'feedsById': feeds_by_id,
        'feedOrder': list(pk for _, pk in feed_order_decorated),
    }


def labels_for_user(user):
    labels_by_id = {}
    label_order_decorated = []
    for label in user.label_set.all():
        labels_by_id[label.id] = json_for_label(label)
        label_order_decorated.append((human_sort_key(label.text), label.id))
    return {
        'labelsById': labels_by_id,
        'labelOrder': list(pk for _, pk in label_order_decorated),
    }


def json_for_label(label):
    counts = label.feeds.all().aggregate(
        unread=Sum('unread_count'),
        fave=Sum('fave_count'),
    )
    return {
        'id': label.id,
        'text': label.text,
        'feeds': list(label.feeds.all().order_by('id').values_list('id', flat=True)),
        # Aggregations return NULL if there are no feeds; translate that into 0.
        'unreadCount': counts['unread'] or 0,
        'faveCount': counts['fave'] or 0,
    }


def entries_for_snapshot(user, params):
    """
    Return a queryset containing entries which match the given params.
    """
    qs = Article.objects.filter(feed__id__in=params['feeds']).filter(feed__in=user.feed_set.all())

    if params['filter'] == 'unread':
        filt = Q(read=False)
    elif params['filter'] == 'fave':
        filt = Q(fave=True)
    else:
        filt = None

    # The include param allows inclusion of a single article which would
    # otherwise be filtered out.  This is so that the page can be reloaded
    # after the state is changed without getting a 404.
    if filt is not None and params['include'] is not None:
        filt |= Q(id=params['include'])

    if filt is not None:
        qs = qs.filter(filt)

    if params['order'] == 'date':
        qs = qs.order_by('date')
    else:
        qs = qs.order_by('-date')

    return qs


def snapshot_params_from_query(query_dict, user_feeds):
    """
    Extract snapshot parameters from the querystring, being somewhat paranoid
    about ensuring valid values.

    :param query_dict: A :class:`django.http.QueryDict` from ``request.GET``
    :param user_feeds: List of the feed IDs for the authenticated user
    """
    try:
        feeds = set()
        for value in query_dict.getlist('feeds'):
            if value == 'all':
                feeds.update(user_feeds)
            else:
                id = int(value)
                if id in user_feeds:
                    feeds.add(id)
    except (KeyError, ValueError):
        feeds = user_feeds

    def oneof(key, values):
        value = query_dict.get(key)
        if value in values:
            return value
        return values[0]

    try:
        include = int(query_dict['include'])
    except (KeyError, ValueError):
        include = None

    return {
        'feeds': sorted(feeds),
        'filter': oneof('filter', ['unread', 'fave', 'all']),
        'order': oneof('order', ['date', 'tail']),
        'view': oneof('view', ['text', 'list']),
        'include': include,
    }


@login_required
def index(request):
    """
    The user interface.  For the moment this is pre-loaded with basic
    information about all the feeds and articles.
    """
    data = feeds_for_user(request.user)
    data.update(labels_for_user(request.user))
    snapshot_params = snapshot_params_from_query(request.GET, list(data['feedOrder']))
    articles = entries_for_snapshot(request.user, snapshot_params)
    data['snapshot'] = {
        'order': snapshot_params['order'],
        'filter': snapshot_params['filter'],
        'feedIds': snapshot_params['feeds'],
        'include': snapshot_params['include'],
        'response': {
            'params': {
                'order': snapshot_params['order'],
                'filter': snapshot_params['filter'],
                'feedIds': snapshot_params['feeds'],
                'include': snapshot_params['include'],
            },
            'loaded': True,
            'error': False,
            'articleIds': [article.id for article in articles],
        },
    }

    return render(request, 'index.html', {
        'props': json_encoder.encode(data),
    })


@login_required
def snapshots(request):
    """
    Get a list of article IDs matching the snapshot parameters.

    :query article: One or more article IDs.
    """
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])

    user_feeds = request.user.feed_set.all().values_list('id', flat=True)
    snapshot_params = snapshot_params_from_query(request.POST, user_feeds)
    articles = entries_for_snapshot(request.user, snapshot_params)

    data = {
        'snapshot': [article.id for article in articles],
        # Include the first 10 articles for instant display.
        # TODO: It would be better to include metadata for a larger number of
        # articles.
        'articlesById': {article.id: json_for_article(article) for article in articles[:10]},
    }
    return HttpResponse(json_encoder.encode(data),
                        content_type='application/json')


def articles_for_request(request):
    """
    Get a QuerySet for the Entry objects listed by the request's "article"
    parameter (which are also owned by the authenticated user).

    :returns: A QuerySet for Entry model instances
    """
    article_ids = map(int, request.POST.getlist('article'))
    qs = Article.objects.filter(feed__in=request.user.feed_set.all())
    return qs.filter(id__in=article_ids)


@login_required
def articles(request):
    """
    Get article contents as JSON.

    :query article: One or more article IDs.
    """
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])
    qs = articles_for_request(request)
    data = {article.id: json_for_article(article) for article in qs}
    return HttpResponse(json_encoder.encode(data),
                        content_type='application/json')


@login_required
def flags(request):
    """
    Change the flags of articles.

    :query read: One of "true" or "false".
    :query fave: One of "true" or "false".
    :query article: One or more article IDs.
    """
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])
    updates = {}
    if 'read' in request.POST:
        if request.POST['read'] == 'true':
            updates['read'] = True
        elif request.POST['read'] == 'false':
            updates['read'] = False
    if 'fave' in request.POST:
        if request.POST['fave'] == 'true':
            updates['fave'] = True
        elif request.POST['fave'] == 'false':
            updates['fave'] = False
    qs = articles_for_request(request)
    if updates:
        with connection.execute_wrapper(log_on_error):
            qs.update(**updates)
    data = {
        'articlesById': {article.id: json_for_article(article) for article in qs.all()},
    }
    return HttpResponse(json_encoder.encode(data),
                        content_type='application/json')


@login_required
def labels(request):
    """
    Create and remove labels.

    On POST, the :param:`action` parameter determines what is done:

    ``"create"`` creates a new label :param:`text` parameter contains the text
    of the label to create.  If the text is already in use, 409 Conflict
    results.

    ``"attach"`` associates a label specified by :param:`label` from a feed
    :param:`feed`

    ``"detach"`` disassociates a label specified by :param:`label` from a feed
    :param:`feed`

    On DELETE, the :param:`label` holds the ID of the label.  If the label does
    not exist, 404 results.
    """
    # FIXME: This should use real forms for validation.
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])

    action = request.POST['action']
    if action == 'create':
        try:
            text = request.POST['text']
            if not text:
                raise ValueError(text)
            request.user.label_set.create(text=text)
        except (KeyError, ValueError, IntegrityError):
            return HttpResponseBadRequest()
    elif action == 'attach':
        label = request.user.label_set.get(id=request.POST['label'])
        feed = request.user.feed_set.get(id=request.POST['feed'])
        label.feeds.add(feed)
        label.save()
    elif action == 'detach':
        label = request.user.label_set.get(id=request.POST['label'])
        feed = request.user.feed_set.get(id=request.POST['feed'])
        label.feeds.remove(feed)
        label.save()
    elif action == 'remove':
        label = request.user.label_set.get(pk=request.POST['label'])
        label.delete()

    data = labels_for_user(request.user)
    data.update(feeds_for_user(request.user))
    return HttpResponse(json_encoder.encode(data),
                        content_type='application/json')


@login_required
def inventory(request):
    """
    Manipulate feeds and labels.

    On GET, retrieve full feed and label metadata.  On POST, the
    :param:`action` field determines what is done:

    ``"create-feed"`` creates a new feed where :param:`url` is the URL of the
    feed (and also the initial title).  The ID of the feed is returned in the
    ``"feedId"`` member of the response.

    ``"update-feed"`` sets the :attr:`~Feed.user_title` and :attr:`~Feed.url`
    according to the :param:`title` and :param:`url` parameters. Iff
    :param:`active` is ``on`` then the feed is scheduled to be checked.
    The set of labels associated with the feed is adjusted to match the IDs
    presented in the :param:`label` parameter.

    ``"update-label"`` sets the :attr:`~Feed.text` according to the
    :param:`text` parameter and adjusts the set of associated feeds to match
    the IDs presented in the :param:`feed` parameter.

    ``"remove"`` deletes objects:

     *  Feeds specified by :param:`feed`. The operation cascades to all of the
        articles from the feed.
     *  Labels specified by :param:`label`. This does not affect any associated
        feeds.

    POST returns the full feed and label metadata just like GET, in the
    ``"labelsById"`` and ``"feedsById"`` members of the JSON response body.
    """
    if request.method == 'POST':
        action = request.POST['action']
        data = {}
        if action == 'create-feed':
            feed_url = request.POST['url']
            with transaction.atomic():
                feed = request.user.feed_set.create(
                    feed_title=feed_url,
                    url=feed_url,
                    added=timezone.now(),
                    next_check=timezone.now(),  # check ASAP
                )
                feed.save()
            data['feedId'] = feed.id
            schedule_changed.send(None)
        elif action == 'update-feed':
            with transaction.atomic():
                feed = request.user.feed_set.get(id=request.POST['feed'])
                feed.url = request.POST['url']
                feed.user_title = request.POST['title']
                new_labels = request.user.label_set.filter(pk__in=request.POST.getlist('label'))
                feed.label_set.set(new_labels)
                if request.POST['active'] == 'on':
                    feed.next_check = timezone.now()
                else:
                    feed.next_check = None
                feed.save()
            schedule_changed.send(None)
        elif action == 'update-label':
            with transaction.atomic():
                label = request.user.label_set.get(id=request.POST['label'])
                label.text = request.POST['text']
                new_feeds = request.user.feed_set.filter(pk__in=request.POST.getlist('feed'))
                label.feeds.set(new_feeds)
                label.save()
        elif action == 'remove':
            with transaction.atomic():
                for feed in request.user.feed_set.filter(pk__in=request.POST.getlist('feed')):
                    feed.delete()
                for label in request.user.label_set.filter(pk__in=request.POST.getlist('label')):
                    label.delete()
            schedule_changed.send(None)
        else:
            raise ValueError(action)

        data.update(labels_for_user(request.user))
        data.update(feeds_for_user(request.user))
        return HttpResponse(json_encoder.encode(data),
                            content_type='application/json')
    elif request.method == 'GET':
        data = labels_for_user(request.user)
        data.update(feeds_for_user(request.user))
        return HttpResponse(json_encoder.encode(data),
                            content_type='application/json')
    else:
        return HttpResponseNotAllowed(['GET', 'POST'])


def manifest(request):
    """
    Generate a Web App Manifest for the application.
    """
    # A template is used to generate the JSON manifest so that the template
    # infrastructure for generating icon URLs can be reused.
    return render(request, 'manifest.json', {},
                  content_type='application/manifest+json')


def about(request):
    """
    About page, which lists the version of everything involved to assist
    with debugging.
    """
    return render(request, 'about.html', {
        'yarrharr_version': yarrharr.__version__,
        'django_version': django.get_version(),
        'feedparser_version': feedparser.__version__,
    })


def robots_txt(request):
    """
    Serve up an empty robots.txt file so that it doesn't show as a 404 in the
    access logs.
    """
    if request.method != 'GET':
        return HttpResponseNotAllowed(['HEAD', 'GET'])
    return HttpResponse(b'', content_type='text/plain')
