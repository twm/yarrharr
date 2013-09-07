"""
Yarrharr production server via Twisted Web
"""

import os
import signal

from yarr.models import Feed
from django.conf import settings
from twisted.python import log
from twisted.internet import task
from twisted.web.wsgi import WSGIResource
from twisted.web.server import Site
from twisted.web.static import File
from twisted.web.resource import Resource
from twisted.python.logfile import LogFile
from twisted.internet.threads import deferToThread
from twisted.internet.endpoints import serverFromString

from . import __version__
from .wsgi import application


class FallbackResource(Resource):
    """
    Resource which falls back to an alternative resource tree if it doesn't
    have a matching child resource.
    """
    def __init__(self, fallback):
        Resource.__init__(self)
        self.fallback = fallback

    def render(self, request):
        """
        Render this path with the fallback resource.
        """
        return self.fallback.render(request)

    def getChild(self, path, request):
        """
        Dispatch unhandled requests to the fallback resource.
        """
        # Mutate the request path such that it's like FallbackResource didn't handle
        # the request at all.  This is a bit of a nasty hack, since we're
        # relying on the t.w.server implementation's behavior to not break when
        # we do this.  A better way would be to create a wrapper for the request object
        request.postpath.insert(0, request.prepath.pop())
        return self.fallback


class Root(FallbackResource):
    """
    Root of the Yarrharr URL hierarchy.
    """
    def __init__(self, reactor):
        wsgi = WSGIResource(reactor, reactor.getThreadPool(), application)

        FallbackResource.__init__(self, wsgi)

        # Install our static file handlers.
        self.putChild('static', File(settings.STATIC_ROOT))


class EndlingWrapper(object):
    def __init__(self, logfile):
        """
        Wrap a Twisted LogFile to apply the weird behavior of Django's
        management command ``stdout`` attribute: it automatically appends
        newlines if not present.
        """
        self.logfile = logfile

    def write(self, s, ending='\n'):
        if not s.endswith('\n'):
            s = s + ending
        self.logfile.write(s)


def updateFeeds(reactor):
    """
    Run django-yarr's update command in a thread.
    """
    log.msg('Checking feeds for updates')
    logfile = None
    if settings.LOG_UPDATE is not None:
        try:
            logfile = LogFile.fromFullPath(settings.LOG_UPDATE,
                                           maxRotatedFiles=10)
        except IOError:
            log.err()

    start = reactor.seconds()

    def logTiming(result):
        if logfile is not None:
            logfile.close()
        duration = reactor.seconds() - start
        log.msg('Checking feeds took {:.2f} sec'.format(duration))
        return result

    d = deferToThread(Feed.objects.check, logfile=EndlingWrapper(logfile))
    d.addErrback(log.err)
    d.addBoth(logTiming)
    return d


def run(sigstop=False, logPath=None):
    from twisted.internet import reactor
    if settings.LOG_SERVER is not None:
        # TODO: Reopen on SIGHUP so logrotate can handle compression.
        logfile = LogFile.fromFullPath(settings.LOG_SERVER)
        log.startLogging(logfile)

    log.msg("Yarrharr {} starting".format(__version__))

    factory = Site(Root(reactor), logPath=settings.LOG_ACCESS)
    endpoint = serverFromString(reactor, settings.SERVER_ENDPOINT)
    reactor.addSystemEventTrigger('before', 'startup', endpoint.listen, factory)

    updateLoop = task.LoopingCall(updateFeeds, reactor)
    loopEndD = updateLoop.start(15 * 60)
    def stopUpdateLoop():
        updateLoop.stop()
        return loopEndD
    reactor.addSystemEventTrigger('before', 'shutdown', stopUpdateLoop)

    if sigstop:
        def sendSigstop():
            """
            Tell Upstart we've successfully started.
            """
            os.kill(os.getpid(), signal.SIGSTOP)

        reactor.addSystemEventTrigger('after', 'startup', sendSigstop)

    reactor.run()
