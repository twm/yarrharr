# -*- coding: utf-8 -*-
import urlparse

import simplejson
import yarr
from yarr.models import Entry
import django
import feedparser
from django.contrib import messages
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseNotAllowed, HttpResponse

import yarrharr
from yarrharr.decorators import debug_only


json_encoder = simplejson.JSONEncoderForHTML()


def json_for_entry(entry):
    """
    Translate a Yarr feed entry into the JSON data for an article.
    """
    return {
        'feedId': entry.feed.id,
        'id': entry.id,
        'state': {
            0: "new",
            1: "done",
            2: "saved",
        }[entry.state],
        'title': entry.title,
        'content': entry.content,
        'author': entry.author,
        'date': str(entry.date),
        'url': entry.url,
        'iconUrl': urlparse.urljoin(entry.url, '/favicon.ico'),
    }


def entries_for_snapshot(user, params):
    """
    Return a queryset containing entries which match the given params.
    """
    qs = Entry.objects.filter(feed__id__in=params['feeds']).filter(feed__in=user.feed_set.all())
    if params['filter'] == 'new':
        qs = qs.filter(state=0)
    elif params['filter'] == 'done':
        qs = qs.filter(state=1)
    elif params['filter'] == 'saved':
        qs = qs.filter(state=2)
    # else 'all'

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

    return {
        'feeds': sorted(feeds),
        'filter': oneof('filter', ['new', 'done', 'saved', 'all']),
        'order': oneof('order', ['date', 'tail']),
        'view': oneof('view', ['text', 'list']),
    }


@login_required
def index(request):
    """
    The user interface.  For the moment this is pre-loaded with basic
    information about all the feeds and articles.
    """
    labels_by_id = {}
    for label in request.user.label_set.all():
        labels_by_id[label.id] = {
            'id': label.id,
            'text': label.text,
        }

    feeds_by_id = {}
    for feed in request.user.feed_set.all():
        feeds_by_id[feed.id] = {
            'id': feed.id,
            'title': feed.title,
            'text': feed.text,
            'newCount': feed.count_unread,
            'savedCount': feed.count_saved,
            'totalCount': feed.count_total,
            'iconUrl': urlparse.urljoin(feed.site_url, '/favicon.ico'),
            'labels': sorted(label.id for label in feed.label_set.all()),
        }

    snapshot_params = snapshot_params_from_query(request.GET, list(feeds_by_id.keys()))
    entries = entries_for_snapshot(request.user, snapshot_params)

    return render(request, 'index.html', {
        'props': json_encoder.encode({
            'feedsById': feeds_by_id,
            'labelsById': labels_by_id,
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
    qs = Entry.objects.filter(feed__in=request.user.feed_set.all())
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

    :query status: One of "new", "saved", or "done".
    :query article: One or more article IDs.
    """
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])
    state = {'new': 0, 'done': 1, 'saved': 2}[request.POST['state']]
    qs = articles_for_request(request)
    qs.update(state=state)
    data = {entry.id: json_for_entry(entry) for entry in qs.all()}
    return HttpResponse(json_encoder.encode(data),
                        content_type='application/json')


def about(request):
    """
    About page, which lists the version of everything involved to assist
    with debugging.
    """
    return render(request, 'about.html', {
        'yarrharr_version': yarrharr.__version__,
        'yarr_version': yarr.__version__,
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
