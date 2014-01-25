import functools

from django.conf import settings
from django.http import Http404


def debug_only(view):
    """
    Decorator which 404s unless the DEBUG is enabled.
    """
    @functools.wraps(view)
    def decorator(request, *args, **kw):
        if not settings.DEBUG:
            raise Http404
        return view(request, *args, **kw)
    return decorator
