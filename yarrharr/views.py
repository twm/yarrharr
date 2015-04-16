import yarr
import django
import feedparser
from django.contrib import messages
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

import yarrharr
from yarrharr.decorators import debug_only


@login_required
def index(request):
    """
    The user interface.
    """
    return render(request, 'index.html', {
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
