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

"""
Yarrharr production server via Twisted Web
"""

import os
import signal
import sys
import logging

from django.conf import settings
from twisted.logger import globalLogBeginner
from twisted.logger import Logger, STDLibLogObserver
from twisted.internet import task
from twisted.web.wsgi import WSGIResource
from twisted.web.server import Site
from twisted.web.static import File
from twisted.web.resource import Resource
from twisted.internet.endpoints import serverFromString

from . import __version__
from .wsgi import application


log = Logger()


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
    Poll any feeds due for a check.
    """
    from .fetch import poll

    start = reactor.seconds()

    def logTiming(result):
        log.info('Checking feeds took {duration:.2f} sec',
                 duration=reactor.seconds() - start)
        return result

    d = poll(reactor)
    d.addErrback(log.failure, "Unexpected failure")
    d.addBoth(logTiming)
    return d


def run(sigstop=False, logPath=None):
    from twisted.internet import reactor

    root = logging.getLogger()
    root.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    root.addHandler(logging.StreamHandler(sys.stdout))
    globalLogBeginner.beginLoggingTo([STDLibLogObserver()])

    log.info("Yarrharr {} starting".format(__version__))

    factory = Site(Root(reactor), logPath=None)
    endpoint = serverFromString(reactor, settings.SERVER_ENDPOINT)
    reactor.addSystemEventTrigger('before', 'startup', endpoint.listen, factory)

    updateLoop = task.LoopingCall(updateFeeds, reactor)
    # TODO: Adjust the loop period dynamically according to the time the next check is due.
    loopEndD = updateLoop.start(15)

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
