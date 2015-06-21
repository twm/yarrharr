# -*- coding: utf-8 -*-
import simplejson

import yarr
import django
import feedparser
from django.contrib import messages
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

import yarrharr
from yarrharr.decorators import debug_only


def json_for_entry(entry):
    """
    Translate a Yarr feed entry into the JSON data for an article.
    """
    return {
        'feed_id': entry.feed.id,
        'id': entry.id,
        'state': {
            0: "new",
            1: "read",
            2: "saved",
        }[entry.state],
        'title': entry.title,
        # 'content': entry.content,
        'author': entry.author,
        'date': str(entry.date),
        'url': entry.url,
    }


@login_required
def index(request):
    """
    The user interface.  For the moment this is pre-loaded with basic
    information about all the feeds and articles.
    """
    feed_list = []
    articles_by_feed = {}

    for feed in request.user.feed_set.all():
        feed_list.append({
            'id': feed.id,
            'title': feed.title,
            'text': feed.text,
            'unread': feed.count_unread,
            'total': feed.count_total,
        })
        articles_by_feed[feed.id] = map(json_for_entry, feed.entries.all())
    return render(request, 'index.html', {
        'props': simplejson.JSONEncoderForHTML().encode({
            'feedList': feed_list,
            'articlesByFeed': articles_by_feed,
        }),
    })


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
