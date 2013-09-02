import yarr
import django
import feedparser
from django.shortcuts import render

import yarrharr


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
