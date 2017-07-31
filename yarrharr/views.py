# -*- coding: utf-8 -*-
# Copyright © 2013, 2014, 2015, 2016, 2017 Tom Most <twm@freecog.net>
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

import simplejson
import django
import feedparser
from django.contrib import messages
from django.db.models import Count, Q
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseNotAllowed, HttpResponseBadRequest, HttpResponse
from django.utils import timezone
from twisted.logger import Logger

import yarrharr
from yarrharr.models import Article
from yarrharr.decorators import debug_only


log = Logger()
json_encoder = simplejson.JSONEncoderForHTML()


def log_query(qs):
    log.debug('qs.query = {query}', query=qs.query)
    return qs


def json_for_entry(entry):
    """
    Translate a Yarr feed entry into the JSON data for an article.
    """
    if entry.fave:
        state = "saved"
    elif entry.read:
        state = "archived"
    else:
        state = "new"
    return {
        'feedId': entry.feed.id,
        'id': entry.id,
        'state': state,
        'title': entry.title,
        'content': entry.content,
        'author': entry.author,
        'date': str(entry.date),
        'url': entry.url,
    }


def json_for_feed(feed):
    return {
        'id': feed.id,
        'title': feed.feed_title,
        'text': feed.user_title,
        'active': feed.next_check is not None,
        'newCount': feed.articles.filter(read=False).count(),
        'savedCount': feed.articles.filter(fave=True).count(),
        'totalCount': feed.articles.all().count(),
        'labels': sorted(feed.label_set.all().values_list('id', flat=True)),
        'url': feed.url,
        'added': str(feed.added),
        'updated': str(feed.last_updated or ''),
        # 'checked': str(feed.last_checked or ''),
        # 'nextCheck': str(feed.next_check or ''),
        'error': feed.error,
    }


def feeds_for_user(user):
    return {feed.id: json_for_feed(feed) for feed in user.feed_set.all()}


def labels_for_user(user):
    labels = user.label_set.all()
    return {label.id: json_for_label(label) for label in labels}


def json_for_label(label):
    return {
        'id': label.id,
        'text': label.text,
        'feeds': list(label.feeds.all().order_by('id').values_list('id', flat=True)),
        'newCount': Article.objects.filter(read=False).filter(feed__in=label.feeds.all()).count(),
        'savedCount': Article.objects.filter(fave=True).filter(feed__in=label.feeds.all()).count(),
        'totalCount': Article.objects.filter(feed__in=label.feeds.all()).count(),
    }


def entries_for_snapshot(user, params):
    """
    Return a queryset containing entries which match the given params.
    """
    qs = Article.objects.filter(feed__id__in=params['feeds']).filter(feed__in=user.feed_set.all())

    if params['filter'] == 'new':
        filt = Q(read=False)
    elif params['filter'] == 'archived':
        filt = Q(read=True)
    elif params['filter'] == 'saved':
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
        'filter': oneof('filter', ['new', 'archived', 'saved', 'all']),
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
    feeds_by_id = feeds_for_user(request.user)
    snapshot_params = snapshot_params_from_query(request.GET, list(feeds_by_id.keys()))
    entries = entries_for_snapshot(request.user, snapshot_params)

    return render(request, 'index.html', {
        'props': json_encoder.encode({
            'labelsById': labels_for_user(request.user),
            'feedsById': feeds_by_id,
            'snapshotParams': snapshot_params,
            'snapshot': [entry.id for entry in entries],
            # Pre-load the cache with the first articles in the shapshot.
            'articlesById': {entry.id: json_for_entry(entry) for entry in entries[:10]}
        }),
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
        'articlesById': {article.id: json_for_entry(article) for article in articles[:10]}
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
    data = {entry.id: json_for_entry(entry) for entry in qs}
    return HttpResponse(json_encoder.encode(data),
                        content_type='application/json')


@login_required
def state(request):
    """
    Change the state of articles.

    :query status: One of "new", "saved", or "archived".
    :query article: One or more article IDs.
    """
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])
    updates = {}
    if request.POST['read'] == 'true':
        updates['read'] = True
    elif request.POST['read'] == 'false':
        updates['read'] = False
    if request.POST['fave'] == 'true':
        updates['fave'] = True
    elif request.POST['fave'] == 'false':
        updates['fave'] = False
    qs = articles_for_request(request)
    if updates:
        qs.update(**updates)
    data = {
        'articlesById': {entry.id: json_for_entry(entry) for entry in qs.all()},
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
    if request.method == 'POST':
        action = request.POST['action']
        if action == 'create':
            label = request.user.label_set.create(text=request.POST['text'])
            label.save()
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
        data = {
            'labelsById': labels_for_user(request.user),
            'feedsById': feeds_for_user(request.user),
        }
        return HttpResponse(json_encoder.encode(data),
                            content_type='application/json')
    elif request.method == 'DELETE':
        try:
            label_id = request.POST['label']
        except KeyError:
            return HttpResponseBadRequest()
        request.user.label_set.get(id=label_id)
        data = {
            'labelsById': labels_for_user(request.user),
            'feedsById': feeds_for_user(request.user),
        }
        return HttpResponse(json_encoder.encode(data),
                            content_type='application/json')
    else:
        return HttpResponseNotAllowed(['POST', 'DELETE'])


@login_required
def inventory(request):
    """
    Manage feeds.

    On GET, retrieve full feed and label metadata.  On POST, the
    :param:`action` field determines what is done:

    ``"create"`` creates a new feed where :param:`url` is the URL of the feed
    (and also the initial title).  The ID of the feed is returned in the
    ``"feedId"`` member of the response.

    ``"remove"`` deletes the feed specified by :param:`feed`.  The operation
    cascades to all of the articles from the feed.

    ``"activate"`` resumes checking the :param:`feed` if it wasn't active.

    ``"deactivate"`` stops the :param:`feed` from being checked in the future.

    POST returns the full feed and label metadata just like GET, in the
    ``"labelsById"`` and ``"feedsById"`` members of the JSON response body.
    """
    if request.method == 'POST':
        action = request.POST['action']
        data = {}
        if action == 'create':
            feed_url = request.POST['url']
            feed = request.user.feed_set.create(
                title=feed_url,
                feed_url=feed_url,
            )
            feed.save()
            data['feedId'] = feed.id
        elif action == 'remove':
            feed = request.user.feed_set.get(id=request.POST['feed'])
            feed.delete()
        elif action == 'activate':
            feed = request.user.feed_set.get(id=request.POST['feed'])
            feed.next_check = timezone.now()
            feed.save()
        elif action == 'deactivate':
            feed = request.user.feed_set.get(id=request.POST['feed'])
            feed.next_check = None
            feed.save()

        data['labelsById'] = labels_for_user(request.user)
        data['feedsById'] = feeds_for_user(request.user)
        return HttpResponse(json_encoder.encode(data),
                            content_type='application/json')
    elif request.method == 'GET':
        data = {
            'labelsById': labels_for_user(request.user),
            'feedsById': feeds_for_user(request.user),
        }
        return HttpResponse(json_encoder.encode(data),
                            content_type='application/json')
    else:
        return HttpResponseNotAllowed(['GET', 'POST'])


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


@debug_only
@login_required
def debug_messages(request):
    """
    Page which spits out a bunch of messages for debugging the styles.
    """
    messages.set_level(request, messages.DEBUG)
    messages.debug(request, 'Hello, I am a debug message.')
    messages.info(request, 'FYI, I am an info message.')
    messages.success(request, 'Score, I am a success message.')
    messages.warning(request, 'Uh-oh, I am a warning message.')
    messages.error(request, 'Oh no, I am an error message.')

    return render(request, 'debug/generic.html', {
        'title': 'Messages Debug',
        'text': 'This page helps debug styles for the Django messages app',
    })
